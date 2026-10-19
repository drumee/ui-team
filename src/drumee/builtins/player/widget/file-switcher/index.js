// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/file-switcher
//   TYPE : Widget
// ==================================================================== *

/**
 * Open-File Switcher — the "Files" panel on the left of a player
 * (Figma "Drumee 2.0" section 828:94152).
 *
 * Lists the files the user recently viewed and the other files of the
 * folder the open file lives in; clicking one opens it in its own player
 * and closes this one, so the user switches file without going back to the
 * folder. "Create new file" offers Document / Spreadsheet / Presentation,
 * makes the chosen file in the same folder and switches to it.
 *
 * The host player passes itself as `player`; the panel only reads it
 * (node, permissions) and closes it once the next file is up.
 */
require("./skin");

const { openMedia, CONTAINER_FILETYPES } = require("libs/open-media");
const recent = require("./recent");
const { isScheduleNode } = require("builtins/window/skeleton/toolkit/list-skip");
const { readCollapsed, writeCollapsed } = require("./frame");
const skeleton = require("./skeleton");

const MAX_RECENT = 5;
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 10000;

// What the closing panel hands to the next one (same folder): the folder's
// files and the scroll position, so the new panel is drawn complete at once
// instead of empty-then-filled.
let handoff = null;

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
    // A file changed in place (audio next, image slideshow) is newer than
    // either model: the media view still describes the file opened first.
    return { ...p.model.toJSON(), ...n, ...this._current };
  }

  /**
   * The player moved to `node` without a new window (audio next/prev, image
   * slideshow): record it and redraw, so the highlight follows the file.
   */
  syncCurrent(node) {
    this._current = node;
    recent.remember(node);
    this._recent = recent.read();
    this.renderLists();
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
    // How the player reaches its panel for syncCurrent.
    if (this.player) this.player._fileSwitcher = this;
    this.el.dataset.collapsed = readCollapsed() ? 1 : 0;
    this.feed(skeleton(this));
    const node = this.node();
    recent.remember(node);
    // The open file stays in the list (on top, just remembered), highlighted
    // as current by the skeleton.
    this._recent = recent.read();
    const h = handoff;
    handoff = null;
    if (h && h.pid === node.pid && h.hub_id === node.hub_id) {
      this._folder = h.folder;
    }
    // Before the first draw: its synchronous head raises _loadingOthers, so
    // "Other files" opens on the skeleton instead of "No files yet".
    this.loadOthers();
    this.renderLists();
    if (h && h.scrollTop) {
      this.ensurePart("scroll").then((p) => {
        p.el.scrollTop = h.scrollTop;
      });
    }
  }

  /**
   *
   */
  onBeforeDestroy() {
    const p = this.player;
    // A re-fed player has already registered the panel that replaces this one.
    if (p && p._fileSwitcher === this) p._fileSwitcher = null;
  }

  /** Files of the open file's folder, newest first; folders left out. */
  async loadOthers() {
    const { pid, hub_id } = this.node();
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
    this._folder = items.filter(
      (f) => f && f.nid && !CONTAINER_FILETYPES.includes(f.filetype)
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

  renderLists() {
    const recents = this._recent.filter((n) => this.match(n)).slice(0, MAX_RECENT);
    const { nid } = this.node();
    const others = this._folder.filter((n) => n.nid !== nid && this.match(n));
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
          : skeleton.rows(this, others, "other", empty)
      );
    });
  }

  setCollapsed(v) {
    writeCollapsed(v);
    this.el.dataset.collapsed = v ? 1 : 0;
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
   * Open `nid` in its own player, then close this one — only once the new
   * player is drawn on top of it, so the desk never shows in between. The
   * node is fetched again (openMedia), so a recent row whose file is gone
   * alerts and is dropped instead of opening an empty player.
   */
  async switchTo(nid, hub_id) {
    const node = this.node();
    if (!nid || !hub_id || nid === node.nid || this._switching) return;
    this._switching = 1;
    this.el.dataset.busy = 1;
    // The player may hold work a switch would drop (unsaved text).
    const p = this.player;
    if (p && _.isFunction(p.confirmLeave) && !(await p.confirmLeave())) {
      this._switching = 0;
      if (!this.isDestroyed()) this.el.dataset.busy = 0;
      return;
    }
    const scroll = this.getPart && this.getPart("scroll");
    handoff = {
      pid: node.pid,
      hub_id: node.hub_id,
      folder: this._folder,
      scrollTop: scroll && scroll.el ? scroll.el.scrollTop : 0,
    };
    let r;
    try {
      r = await openMedia(
        { nid, hub_id },
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
    if (p && !p.isDestroyed()) p.goodbye();
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
    const { pid, hub_id } = this.node();
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
        return this.switchTo(cmd.mget(_a.nid), cmd.mget(_a.hub_id));

      case "toggle-create-menu":
        // Collapsed, the "+" opens the full panel with the menu down.
        if (this.el.dataset.collapsed == 1) {
          this.setCollapsed(false);
          return this.setCreateMenu(true);
        }
        return this.setCreateMenu(this.el.dataset.createMenu != 1);

      case "create-file":
        return this.createFile(cmd.mget(_a.name));
    }
  }
}

module.exports = __file_switcher;
