// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/file-switcher
//   TYPE : Widget
// ==================================================================== *

/**
 * Open-File Switcher — the "Files" panel on the left of a player
 * (Figma "Drumee 2.0" section 828:94152).
 *
 * Lists the files of the folder the viewer was opened from: the ones the
 * user recently viewed, then the others by type; clicking one opens it in its
 * own player and closes this one, so the user switches file without going
 * back to the folder. "Create new file" offers Document / Spreadsheet /
 * Presentation, makes the chosen file in that folder and switches to it.
 *
 * ONE folder for both lists, and the folder the viewer was opened from, not
 * the open file's (product call, 2026-10-19). Recently viewed used to span
 * every folder and workspace, and opening one of those replaced "Other
 * files" with that file's neighbours on every switch; now every row is a
 * neighbour, the folder is handed from panel to panel (`handoff`) and nothing
 * moves until the viewer is closed.
 *
 * The host player passes itself as `player`; the panel only reads it
 * (node, permissions) and closes it once the next file is up.
 */
require("./skin");

const { openMedia, CONTAINER_FILETYPES } = require("libs/open-media");
const recent = require("./recent");
const skeleton = require("./skeleton");
const { groupFiles } = require("./groups");
const { fileListSkip, isScheduleNode } = require("builtins/window/skeleton/toolkit/list-skip");

const COLLAPSED_KEY = "player-file-switcher:collapsed";
const MAX_RECENT = 5;
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 10000;

// What the closing panel hands to the next one: the folder it lists (scope),
// its files and the scroll position, so the new panel is drawn complete at
// once instead of empty-then-filled. Stamped, and only taken while fresh: a
// switch into a player without a panel (audio) would otherwise leave it for
// the next viewer opened from a folder.
let handoff = null;
const HANDOFF_TTL_MS = 30000;

function takeHandoff() {
  const h = handoff;
  handoff = null;
  if (!h || !h.at || Date.now() - h.at > HANDOFF_TTL_MS) return null;
  return h;
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function writeCollapsed(v) {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  } catch (e) {
    // The toggle still works for this window.
  }
}

class __file_switcher extends LetcBox {
  /**
   *
   * @param {*} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._query = "";
    this._folder = [];
    this._recent = [];
    this._loadingOthers = false;
  }

  /** The player this panel sits in. */
  get player() {
    return this.mget("player");
  }

  /** The open file — the MFS view when the player has one, else the player. */
  node() {
    const p = this.player;
    if (!p) return {};
    let n = {};
    try {
      n = (p.media && !p.media.isDestroyed() ? p.media : p).model.toJSON();
    } catch (e) {
      n = {};
    }
    const own = p.model.toJSON();
    // The image viewer's prev/next moves the player's model to another file;
    // its media still describes the one it was opened on.
    if (n.nid != null && own.nid != null && `${n.nid}` !== `${own.nid}`) return own;
    return { ...own, ...n };
  }

  /** The doc-editor create service, when this endpoint has one. */
  createService() {
    const editor = Platform && Platform.get && Platform.get("doc_editor");
    const ns = editor && SERVICE && SERVICE[editor];
    return ns && (ns.new_doc || ns.create || ns.create_doc);
  }

  canCreate() {
    const p = this.player;
    if (!this.createService() || !p) return false;
    return _.isFunction(p.canUpload) ? !!p.canUpload() : false;
  }

  /**
   *
   */
  onDomRefresh() {
    this.el.dataset.collapsed = readCollapsed() ? 1 : 0;
    this.feed(skeleton(this));
    const node = this.node();
    recent.remember(node);
    // The open file stays in the list (on top, just remembered), highlighted
    // as current by the skeleton.
    this._recent = recent.read();
    const h = takeHandoff();
    // The folder "Other files" lists: the one this viewer was opened from,
    // carried across switches; the open file's own folder only at the start.
    this._scope = (h && h.scope) || { pid: node.pid, hub_id: node.hub_id };
    if (h) this._folder = h.folder || [];
    // Before the first draw: its synchronous head raises _loadingOthers, so
    // "Other files" opens on the skeleton instead of "No files yet".
    this.loadOthers();
    this.renderLists();
    if (h && h.scrollTop) {
      this.ensurePart("scroll").then((p) => {
        p.el.scrollTop = h.scrollTop;
      });
    }
    // Follow the open file: a rename goes through the player's model, and
    // the editors say when the folder changed under them (Make a copy).
    const p = this.player;
    if (p && p.model && !this._following) {
      this._following = 1;
      // One set() can both move to another file (image prev/next sets the
      // whole node) and change the name: a new nid is a switch, not a rename.
      this.listenTo(p.model, "change", (m) => {
        if (m.hasChanged(_a.nid)) return this.onPlayerSwitched();
        if (m.hasChanged(_a.filename)) this.onPlayerRenamed(m.get(_a.filename));
      });
      this.listenTo(p, "folder-changed", () => this.loadOthers());
    }
  }

  /** The player now shows another file: it heads Recently viewed, lit. */
  onPlayerSwitched() {
    if (this.isDestroyed()) return;
    recent.remember(this.node());
    this._recent = recent.read();
    this.renderLists();
  }

  /** The open file was renamed: its rows (and the remembered entry) follow. */
  onPlayerRenamed(filename) {
    if (!filename || this.isDestroyed()) return;
    const node = this.node();
    const { nid } = node;
    if (!nid) return;
    for (const list of [this._recent, this._folder]) {
      for (const n of list) {
        if (n.nid === nid) n.filename = filename;
      }
    }
    recent.remember({ ...node, filename });
    this.renderLists();
  }

  /** Files of the listed folder (_scope), newest first; folders left out. */
  async loadOthers() {
    const { pid, hub_id } = this._scope || {};
    if (!pid || !hub_id) return;
    this._loadingOthers = true;
    let data;
    try {
      data = await this.fetchService({
        service: SERVICE.media.show_node_by,
        nid: pid,
        hub_id,
        page: 1,
        sort: _a.mtime,
        order: _K.order.descending,
      });
    } catch (e) {
      data = null;
    }
    this._loadingOthers = false;
    if (this.isDestroyed()) return;
    const items = Array.isArray(data) ? data : (data && data.items) || [];
    // Folders have their own windows. The rest follows the folder's own
    // listing (toolkit list-skip): a .schedule node is a meeting on the Meet
    // tab, not a file, and dotfiles stay out until "show hidden files".
    const hidden = fileListSkip().filename;
    this._folder = items.filter(
      (f) => f && f.nid && !CONTAINER_FILETYPES.includes(f.filetype)
        && !isScheduleNode(f) && !(hidden && hidden.test(String(f.filename || "")))
    ).map((f) => ({ hub_id, ...f }));
    this.renderLists();
  }

  match(node) {
    // A scheduled meeting is an MFS node with no bytes to open — never listed,
    // same as the Files grid (list-skip).
    if (isScheduleNode(node)) return false;
    if (!this._query) return true;
    const name = `${node.filename || ""}.${node.ext || ""}`.toLowerCase();
    return name.includes(this._query);
  }

  /**
   * Is a remembered file in the listed folder? By its folder when the row
   * carries it; a row from before pid was kept is matched against the
   * listing (so it shows once the listing is in).
   */
  inScope(n) {
    const scope = this._scope || {};
    if (!n || String(n.hub_id) !== String(scope.hub_id)) return false;
    if (n.pid) return String(n.pid) === String(scope.pid);
    return this._folder.some((f) => f.nid === n.nid);
  }

  renderLists() {
    const { nid } = this.node();
    // A remembered row is a thin copy (recent.js); the folder listing has the
    // fresh name and the metadata (the Casual marker of the early `.json`
    // sheets), so a recent that is also listed takes the listing's fields.
    const fresh = (n) => {
      const f = this._folder.find((x) => x.nid === n.nid);
      return f ? { ...n, ...f } : n;
    };
    const recents = this._recent
      .map(fresh)
      .filter((n) => (n.nid === nid || this.inScope(n)) && this.match(n))
      .slice(0, MAX_RECENT);
    // The whole folder, as the folder's own Group view lists it, the open
    // file included: nothing moves when a file is opened (user's call,
    // 2026-10-19). A recently viewed file shows in both; the open file is lit
    // once, under Recently viewed, so no currentNid here.
    const others = this._folder.filter((n) => this.match(n));
    const empty = this._query ? LOCALE.NO_FILE_RESULTS : LOCALE.NO_FILES_YET;
    this.ensurePart("recent-list").then((p) => {
      p.feed(skeleton.rows(this, recents, "recent", empty, nid));
    });
    // Only while nothing is known yet: a folder handed over by the previous
    // panel is drawn at once and refreshed in place.
    const loading = this._loadingOthers && !this._folder.length;
    this.ensurePart("other-list").then((p) => {
      p.feed(
        loading
          ? skeleton.loadingRows(this)
          : skeleton.groupedRows(this, groupFiles(others), "other", empty)
      );
    });
  }

  setCollapsed(v) {
    writeCollapsed(v);
    const el = this.el;
    const token = (this._slide = (this._slide || 0) + 1);
    const slideIn = () => {
      el.dataset.collapsed = v ? 1 : 0;
      this.slide("in").then(() => {
        if (this._slide === token) delete el.dataset.slide;
      });
    };
    // Collapsing, the full panel slides out first and the icon column slides
    // in once the width starts to shrink; expanding, it slides straight in.
    if (v && el.dataset.collapsed != 1) {
      this.slide("out").then(() => {
        if (this._slide === token) slideIn();
      });
    } else {
      slideIn();
    }
  }

  /**
   * Play the `file-switcher__main` slide `dir` (in | out); resolves when it
   * ends, at once with reduced motion, or after a cap if no animationend
   * comes (panel hidden, animation dropped).
   */
  slide(dir) {
    const el = this.el;
    const main = el.querySelector(`.${this.fig.family}__main`);
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!main || still) return Promise.resolve();
    // Re-set even when unchanged so a repeat click replays the keyframes.
    delete el.dataset.slide;
    void main.offsetWidth;
    el.dataset.slide = dir;
    return new Promise((resolve) => {
      const done = (e) => {
        if (e && e.target !== main) return;
        main.removeEventListener("animationend", done);
        clearTimeout(cap);
        resolve();
      };
      const cap = setTimeout(done, 400);
      main.addEventListener("animationend", done);
    });
  }

  /**
   * The player `nid` was just launched in, once it is drawn (data-ready —
   * every player sets it when sized and shown); null after the timeout.
   */
  waitForPlayer(nid) {
    const old = this.player;
    const started = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        let w = null;
        try {
          w = Wm.getWindowsPool().children.find((v) =>
            v.isPlayer && v !== old && !v.isDestroyed()
            && v.mget(_a.nid) === nid && v.el && v.el.dataset.ready == 1
          );
        } catch (e) {
          w = null;
        }
        if (w) return resolve(w);
        if (Date.now() - started > READY_TIMEOUT_MS) return resolve(null);
        setTimeout(check, READY_POLL_MS);
      };
      check();
    });
  }

  /**
   * Save the edits of the viewer this panel sits in, through its own
   * `saveBeforeClose()` (the editors have one, a viewer has nothing to
   * save). Resolves false when the editor could not save, so the caller
   * leaves it open; the editor itself tells the user why.
   */
  async saveBeforeSwitch() {
    const p = this.player;
    if (!p || p.isDestroyed() || typeof p.saveBeforeClose !== "function") return true;
    try {
      return (await p.saveBeforeClose()) !== false;
    } catch (e) {
      this.warn("file-switcher: save before switch failed", e);
      return false;
    }
  }

  /**
   * Open `nid` in its own player, then close this one — only once the new
   * player is drawn on top of it, so the desk never shows in between. The
   * node is fetched again (openMedia), so a recent row whose file is gone
   * alerts and is dropped instead of opening an empty player.
   */
  async switchTo(nid, hub_id, filetype) {
    const node = this.node();
    if (!nid || !hub_id || nid === node.nid || this._switching) return;
    // A web page has no viewer: a new tab, as the folder opens it.
    if (filetype === _a.web) return this.openInTab(nid, hub_id);
    this._switching = 1;
    this.el.dataset.busy = 1;
    // The file being left may hold edits (markdown, text, docs, sheet,
    // diagram): they are saved first, and a save that fails keeps the user
    // on that file, so nothing typed is lost to the switch.
    if (!(await this.saveBeforeSwitch())) {
      this._switching = 0;
      if (!this.isDestroyed()) this.el.dataset.busy = 0;
      return;
    }
    const scroll = this.getPart && this.getPart("scroll");
    handoff = {
      at: Date.now(),
      scope: this._scope,
      folder: this._folder,
      scrollTop: scroll && scroll.el ? scroll.el.scrollTop : 0,
    };
    // The editors save new files into, and refresh the tile of, their
    // `target` window (the folder the first file was opened from); the next
    // player inherits it, as this one closes before that next save.
    const p0 = this.player;
    const target = p0 && p0.target && !p0.target.isDestroyed() ? p0.target : undefined;
    let r;
    try {
      r = await openMedia(
        { nid, hub_id, target },
        { fetchService: this.fetchService.bind(this), warn: this.warn.bind(this) }
      );
    } catch (e) {
      this.warn("file-switcher: open failed", e);
    }
    if (r) await this.waitForPlayer(nid);
    this._switching = 0;
    if (this.isDestroyed()) return;
    this.el.dataset.busy = 0;
    if (!r) handoff = null;
    if (r === undefined) {
      recent.forget(nid);
      this._recent = this._recent.filter((n) => n.nid !== nid);
      this.renderLists();
      return;
    }
    if (!r) return;
    const p = this.player;
    if (p && !p.isDestroyed()) p.goodbye();
  }

  /**
   * An .html file (filetype web) has no player; the folder opens it in a new
   * tab (window/manager openContent) and so does the panel. The tab is opened
   * inside the click, before the node is fetched: opened after an await the
   * browser blocks it as a popup. This viewer stays up.
   */
  async openInTab(nid, hub_id) {
    const tab = window.open("", "_blank");
    let url = null;
    try {
      const node = await this.fetchService(
        { service: SERVICE.media.attributes, nid, hub_id },
        { async: 1 },
      );
      if (node && node.nid) {
        const k = await Kind.waitFor(_a.media);
        const media = new k({ model: new Backbone.Model(node) });
        url = media.srcUrl && media.srcUrl();
      }
    } catch (e) {
      this.warn("file-switcher: web page open failed", e);
    }
    if (this.isDestroyed()) {
      if (tab && !url) tab.close();
      if (tab && url) tab.location.href = url;
      return;
    }
    if (!url) {
      if (tab) tab.close();
      Wm.alert(LOCALE.FILE_NOT_FOUND);
      recent.forget(nid);
      this._recent = this._recent.filter((n) => n.nid !== nid);
      this.renderLists();
      return;
    }
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
  }

  setCreateMenu(open) {
    this.el.dataset.createMenu = open ? 1 : 0;
  }

  /** `name` — the new file's name, which also gives its kind (docx/xlsx/pptx). */
  async createFile(name) {
    this.setCreateMenu(false);
    if (!name) return;
    if (require("libs/over-limit").guardWrite("write")) return;
    const service = this.createService();
    // In the listed folder, where the new file will show up.
    const { pid, hub_id } = this._scope || this.node();
    if (!service || !pid || !hub_id || this._switching) return;
    this.el.dataset.busy = 1;
    let data;
    try {
      data = await this.postService(service, { nid: pid, hub_id, name });
    } catch (e) {
      this.warn("file-switcher: create failed", e);
    }
    if (this.isDestroyed()) return;
    this.el.dataset.busy = 0;
    if (!data || !data.nid) {
      if (!require("libs/permission-denied").saidRecently()) {
        Wm.alert(LOCALE.ERROR_NETWORK);
      }
      return;
    }
    this.switchTo(data.nid, data.hub_id || hub_id);
  }

  /**
   * "Note" / "Document lite" / "Spreadsheet lite": an editor window on a NEW
   * file in the listed folder — what the desk's "+ New" rows do from a
   * folder window (window/core add-blocknote / add-doc / add-sheet). The
   * editor saves into that folder and carries this panel, so it reads like
   * any other switch: this viewer is saved, the editor launched, this viewer
   * closed.
   *
   * @param {String} kind  editor_blocknote | editor_docs | editor_sheet
   */
  async createCasual(kind) {
    this.setCreateMenu(false);
    if (!kind || this._switching) return;
    if (require("libs/over-limit").guardWrite("write")) return;
    const { pid, hub_id } = this._scope || this.node();
    if (!pid || !hub_id) return;
    this._switching = 1;
    this.el.dataset.busy = 1;
    if (!(await this.saveBeforeSwitch())) {
      this._switching = 0;
      if (!this.isDestroyed()) this.el.dataset.busy = 0;
      return;
    }
    const scroll = this.getPart && this.getPart("scroll");
    handoff = {
      at: Date.now(),
      scope: this._scope,
      folder: this._folder,
      scrollTop: scroll && scroll.el ? scroll.el.scrollTop : 0,
    };
    const p0 = this.player;
    const target = p0 && p0.target && !p0.target.isDestroyed() ? p0.target : undefined;
    let w = null;
    try {
      w = Wm.launch(
        { kind, folder: { nid: pid, hub_id }, target, uiHandler: [target || p0] },
        { explicit: 1 }
      );
    } catch (e) {
      this.warn("file-switcher: create failed", e);
    }
    this._switching = 0;
    if (this.isDestroyed()) return;
    this.el.dataset.busy = 0;
    if (!w) {
      handoff = null;
      return;
    }
    const p = this.player;
    if (p && !p.isDestroyed()) p.goodbye();
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case "toggle-panel":
        return this.setCollapsed(this.el.dataset.collapsed != 1);

      case "expand-panel":
        return this.setCollapsed(false);

      case "expand-search":
        if (this.el.dataset.collapsed == 1) {
          this.setCollapsed(false);
          this.ensurePart("search-input").then((p) => {
            const input = p.el.querySelector("input");
            if (input) input.focus();
          });
        }
        return;

      case "search": {
        const input = cmd.el && cmd.el.querySelector("input");
        this._query = String((input && input.value) || "").trim().toLowerCase();
        return this.renderLists();
      }

      case "open-file":
        return this.switchTo(cmd.mget(_a.nid), cmd.mget(_a.hub_id), cmd.mget(_a.filetype));

      case "toggle-create-menu":
        // Collapsed, the "+" opens the full panel with the menu down.
        if (this.el.dataset.collapsed == 1) {
          this.setCollapsed(false);
          return this.setCreateMenu(true);
        }
        return this.setCreateMenu(this.el.dataset.createMenu != 1);

      case "create-file":
        return this.createFile(cmd.mget(_a.name));
      case "create-casual":
        return this.createCasual(cmd.mget(_a.name));
    }
  }
}

module.exports = __file_switcher;
