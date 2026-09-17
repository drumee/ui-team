import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { LocaleType, UserManagerService, IPermissionService } from "@univerjs/core";
import { CasualSheets } from "@casualoffice/sheets/sheets";
import "@casualoffice/sheets/styles";
import { contentUrl } from "builtins/editor/content-url";

// Casual Sheets does NOT bundle Univer locale strings; it only forwards a
// `locales` prop to Univer. Without it Univer's LocaleService is "not
// initialized" and the whole editor throws on mount. Merge every UI plugin's
// en-US bundle Casual uses so LocaleService is populated and every control is
// labelled. (These paths are pinned to Univer 0.25.x, installed as peers.)
import DesignEnUS from "@univerjs/design/locale/en-US";
import UiEnUS from "@univerjs/ui/locale/en-US";
import DocsUiEnUS from "@univerjs/docs-ui/locale/en-US";
import SheetsUiEnUS from "@univerjs/sheets-ui/locale/en-US";
import SheetsFormulaUiEnUS from "@univerjs/sheets-formula-ui/locale/en-US";
import SheetsNumfmtUiEnUS from "@univerjs/sheets-numfmt-ui/locale/en-US";
import SheetsCondFmtUiEnUS from "@univerjs/sheets-conditional-formatting-ui/locale/en-US";
import SheetsDataValidationUiEnUS from "@univerjs/sheets-data-validation-ui/locale/en-US";
import SheetsDrawingUiEnUS from "@univerjs/sheets-drawing-ui/locale/en-US";
import SheetsFilterUiEnUS from "@univerjs/sheets-filter-ui/locale/en-US";
import SheetsHyperLinkUiEnUS from "@univerjs/sheets-hyper-link-ui/locale/en-US";
import SheetsNoteUiEnUS from "@univerjs/sheets-note-ui/locale/en-US";
import SheetsSortUiEnUS from "@univerjs/sheets-sort-ui/locale/en-US";
import SheetsTableUiEnUS from "@univerjs/sheets-table-ui/locale/en-US";
import SheetsThreadCommentUiEnUS from "@univerjs/sheets-thread-comment-ui/locale/en-US";
import ThreadCommentUiEnUS from "@univerjs/thread-comment-ui/locale/en-US";
import DrawingUiEnUS from "@univerjs/drawing-ui/locale/en-US";
import FindReplaceEnUS from "@univerjs/find-replace/locale/en-US";
import DataValidationEnUS from "@univerjs/data-validation/locale/en-US";
// BASE (non-UI) packages — Casual's own locale builder
// (packages/sdk/src/embed-runtime/locale.ts) includes these, and they carry
// strings the -ui packages don't: `@univerjs/sheets` holds `sheets.tabs.*` (the
// default sheet-tab name — without it new tabs render the raw key
// "sheets.tabs.sheet1"); the others hold filter/hyperlink/table/DV error + label
// strings.
import SheetsBaseEnUS from "@univerjs/sheets/locale/en-US";
import SheetsFilterEnUS from "@univerjs/sheets-filter/locale/en-US";
import SheetsHyperLinkEnUS from "@univerjs/sheets-hyper-link/locale/en-US";
import SheetsTableEnUS from "@univerjs/sheets-table/locale/en-US";
import SheetsDataValidationEnUS from "@univerjs/sheets-data-validation/locale/en-US";


// The typing fix (Univer's cell contentEditable stays 0x0 → Chromium drops
// keystrokes; min-size CSS restores input) + user-select:text live in this
// widget's skin. It used to be pulled in only by the WINDOW editor
// (editor/sheet/index.js). The STANDALONE tab (modules/sheet) feeds just
// sheet_state, so require the skin HERE — wherever sheet_state mounts, typing
// works. (webpack dedupes the double require in the window path.)
require("./skin");

/** Deep-merge Univer locale bundles (plain nested objects) into one. */
function mergeLocaleBundles(...sources) {
  const out = {};
  const merge = (target, src) => {
    if (!src) return target;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        target[k] = merge(
          target[k] && typeof target[k] === "object" ? target[k] : {},
          v
        );
      } else {
        target[k] = v;
      }
    }
    return target;
  };
  for (const s of sources) merge(out, s);
  return out;
}

const EN_US_LOCALE = mergeLocaleBundles(
  DesignEnUS,
  UiEnUS,
  DocsUiEnUS,
  SheetsBaseEnUS,
  SheetsFilterEnUS,
  SheetsHyperLinkEnUS,
  SheetsTableEnUS,
  SheetsDataValidationEnUS,
  SheetsUiEnUS,
  SheetsFormulaUiEnUS,
  SheetsNumfmtUiEnUS,
  SheetsCondFmtUiEnUS,
  SheetsDataValidationUiEnUS,
  SheetsDrawingUiEnUS,
  SheetsFilterUiEnUS,
  SheetsHyperLinkUiEnUS,
  SheetsNoteUiEnUS,
  SheetsSortUiEnUS,
  SheetsTableUiEnUS,
  SheetsThreadCommentUiEnUS,
  ThreadCommentUiEnUS,
  DrawingUiEnUS,
  FindReplaceEnUS,
  DataValidationEnUS
);

// Casual Sheets (@casualoffice/sheets, Apache-2.0) is a React spreadsheet built
// on Univer OSS with its own polished Office/Docs-style shell (menus, formula
// bar, side panels) — replacing Univer's sparse default toolbar, which is why
// the earlier raw-Univer embed looked bad. The SDK stores nothing: it takes an
// IWorkbookData snapshot as `initialData` and hands the latest snapshot back via
// `onChange`/`onExit`, which maps straight onto Drumee's media.save round-trip.
// Snapshot format is Univer's IWorkbookData — the SAME JSON the previous Univer
// editor saved, so existing .json sheets still open.

class __sheet_state extends DrumeeMFS {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.media = opt.media;
    this.editor = opt.editor;
    // Let the sheet own the right-click menu. Without this the framework's
    // el.oncontextmenu on this view walks UP the view tree to the desk and pops
    // its menu (Create workspace / Add new / Invite) on top of the sheet's own.
    // escapeContextmenu makes that handler return early. See git history.
    this.escapeContextmenu = true;
    if (this.media) {
      let { nid, pid, hub_id } = this.media.actualNode();
      this.mset({ nid, pid, hub_id });
    }
  }

  /**
   *
   */
  onDomRefresh() {
    if (this._mounted) return;
    this.containerId = `${this.mget(_a.widgetId)}-sheet-state`;
    this.el.setAttribute(_a.id, this.containerId);
    if (!this.media) {
      this.mount({});
      return;
    }
    this.media.wait(0);
    const node = this.media.actualNode() || {};
    let url = node.url;
    if (!url) {
      // A media view built from node_info (the standalone #/sheet tab) has no
      // derived content url. builtins/editor/content-url builds the canonical
      // file endpoint the way ui-core does — including the share key a dmz
      // visitor needs (without it the share host answers 404 and the shared
      // sheet opened as an empty black window).
      url = contentUrl(this.media, {
        nid: node.nid || this.mget(_a.nid),
        hub_id: node.hub_id || this.mget(_a.hub_id),
      });
    }
    if (!url) {
      this.mount({});
      return;
    }
    // `cache: "no-cache"` (revalidate with the ETag): nginx serves
    // /file/orig/… with a year-long max-age, so a plain GET kept returning the
    // first snapshot the browser cached — reopened sheets showed old cells and
    // no comments whenever the collab room was not there to override them.
    fetch(url, { credentials: "include", cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`content fetch failed: ${r.status}`);
        return r.text();
      })
      .then((content) => {
        let data = {};
        try {
          data = JSON.parse(content) || {};
        } catch (e) {
          this.warn("sheet_state: unreadable workbook data, starting empty", e);
        }
        this.mount(data);
      })
      .catch((e) => {
        this.warn("sheet_state: load failed, starting empty", e);
        this.mount({});
      });
  }

  /**
   * @param {Object} data IWorkbookData snapshot ({} for a new sheet)
   */
  mount(data) {
    this._pendingData = data || {};
    this._snapshot = this._pendingData;
    this._mountWhenSized();
  }

  /**
   * The Drumee player window opens with a TweenMax scale animation, so this.el
   * measures ~0px for the first few frames. Univer (under Casual Sheets) reads
   * that 0 at mount and collapses its grid — so hold the React mount until the
   * window has settled at a real size, then it first-measures correctly.
   */
  _mountWhenSized() {
    let tries = 0;
    const go = () => {
      if (this._destroyed || !this.el) return;
      const r = this.el.getBoundingClientRect();
      if ((r.height > 120 && r.width > 200) || tries > 40) {
        this._doMount();
        return;
      }
      tries++;
      setTimeout(go, 80);
    };
    go();
  }

  /**
   * Mount the Casual Sheets React component into this widget's element.
   */
  _doMount() {
    if (this._mounted || this._destroyed || !this.el) return;
    this._mounted = 1;
    this._api = createRef();

    // Ignore the onChange bursts fired while the initial snapshot loads, so a
    // freshly opened sheet isn't marked dirty before the user touches it.
    this._loading = 1;
    setTimeout(() => {
      this._loading = 0;
    }, 1500);

    const onChange = (snap) => {
      if (snap) this._snapshot = snap;
      if (this._loading) return;
      if (this.editor) {
        this.editor._changed = 1;
        // Header label → "Unsaved changes" until the next save.
        if (this.editor.markDirty) this.editor.markDirty();
        // Autosave like Google Sheets / the docs editor: coalesce edit bursts
        // into at most one media.save every few seconds (the host's reentrancy
        // guard + nid adoption keep it to ONE file rewritten in place).
        if (!this._saveTimer && typeof this.editor.saveContent === "function") {
          this._saveTimer = setTimeout(() => {
            this._saveTimer = null;
            if (this._destroyed || !this.editor) return;
            this.editor.saveContent();
          }, 4000);
        }
      }
    };
    const onExit = (snap) => {
      if (snap) this._snapshot = snap;
    };
    // Casual's own Save (File → Save / Ctrl+S in its chrome) → persist through
    // the host editor's saveContent (the window editor_sheet, or the standalone
    // module_sheet — both expose saveContent()).
    const onSave = (snap) => {
      if (snap) this._snapshot = snap;
      if (this.editor && typeof this.editor.saveContent === "function") {
        this.editor.saveContent();
      }
    };

    this._root = createRoot(this._reactHost());
    this._root.render(
      createElement(CasualSheets, {
        ref: this._api,
        // `{}` for a new sheet → Univer fills defaults and renders a blank
        // workbook (passing undefined creates NO unit → empty workbench). A real
        // IWorkbookData snapshot reopens an existing sheet.
        initialData: this._pendingData || {},
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: EN_US_LOCALE },
        // Follow the host window's light/dark choice (editor.applyTheme).
        appearance: (this.editor && this.editor.theme) || "light",
        // 'full' = Casual Sheets' own Office/Docs-style shell (menu bar,
        // toolbar groups, formula bar, status bar, side panels). Default is
        // 'none' (bare grid) — that's why only the grid showed.
        chrome: "full",
        // Called with the raw Univer instance after plugins are registered
        // and BEFORE the workbook unit is created: the user set here becomes
        // the workbook owner (full permissions) and the author of comments.
        onBeforeCreateUnit: (univer) => this._setUniverUserEarly(univer),
        onChange,
        onExit,
        onSave,
        onReady: (api) => {
          // Casual hands its imperative API here (NOT via the React ref, which
          // stays null in this version). Keep it for Save's live getSnapshot().
          this._apiHandle = api;
          this._ready = 1;
          this._nudgeResize();
          this._setUniverUser(api);
          this._grantWorkbookPermissions(api);
          // Belt-and-suspenders for reopen: force-load the saved snapshot once
          // the editor is ready. `initialData` can race the workbook creation
          // and leave a reopened file blank ("mở lại không load nội dung").
          try {
            if (
              api &&
              typeof api.loadSnapshot === "function" &&
              this._pendingData &&
              Object.keys(this._pendingData).length > 0
            ) {
              api.loadSnapshot(this._pendingData);
            }
          } catch (e) {
            /** initialData already applied it */
          }
          // Co-editing (Casual Sheets server behind /-/<ep>/sheets/): join
          // the room named after the file nid once the server answers.
          this._maybeAttachCollab(api);
        },
        onError: (e) => {
          this.warn("CasualSheets error", e);
        },
      })
    );

    // Keep the sheet's right-click menu from also popping the Drumee desk menu.
    this.el.addEventListener(
      "contextmenu",
      (e) => {
        e.stopPropagation();
      },
      false
    );

    // Univer inside can still under-measure right after mount in the animated
    // window; a few resize pulses make it re-read the now-real container size.
    this._nudgeResize();
    /** POC debug handle for testers */
    window.__casualSheetAPI = this._api;
  }

  /**
   *
   */
  _nudgeResize() {
    let n = 0;
    const tick = () => {
      if (this._destroyed) return;
      window.dispatchEvent(new Event("resize"));
      if (++n < 5) setTimeout(tick, 250);
    };
    setTimeout(tick, 120);
  }

  /**
   * @returns {Object|null} the current workbook snapshot (IWorkbookData)
   */
  /**
   * Switch Casual/Univer's appearance at runtime (grid + its chrome).
   * @param {"light"|"dark"} theme
   */
  setTheme(theme) {
    this._theme = theme;
    try {
      const api = this._apiHandle;
      // Grid: toggles Univer's `univer-dark`. Chrome: Casual stamps
      // `data-theme` from the `appearance` prop only at render, so restamp its
      // root ourselves (the skin's token blocks key off the window's
      // data-theme anyway) and nudge a resize so the canvas repaints.
      if (api && typeof api.setTheme === "function") api.setTheme(theme);
      const root = this.el && this.el.querySelector('[data-testid="casual-sheets"]');
      if (root) root.setAttribute("data-theme", theme);
      // Casual's setTheme only ADDS `univer-dark` reliably; make the class
      // follow the requested theme both ways.
      const host = this.el && this.el.querySelector('[data-testid="univer-host"]');
      if (host) host.classList.toggle("univer-dark", theme === "dark");
      this._nudgeResize && this._nudgeResize();
      setTimeout(() => {
        try {
          window.dispatchEvent(new Event("resize"));
        } catch (e) {
          /** noop */
        }
      }, 120);
    } catch (e) {
      this.warn("sheet_state: setTheme failed", e);
    }
  }

  getSnapshot() {
    // Pull the LIVE workbook from Casual's imperative API (captured in onReady)
    // so Save always grabs the newest edits. The React `ref` stays null in this
    // version, and the onChange snapshot is debounced (~400ms) so it lagged a
    // quick Save — both made "saved but content not remembered".
    try {
      const api = this._apiHandle;
      if (api && typeof api.getSnapshot === "function") {
        const s = api.getSnapshot();
        if (s) return s;
      }
      if (api && typeof api.getData === "function") {
        const s = api.getData();
        if (s) return s;
      }
    } catch (e) {
      /** fall back to the last snapshot handed to us */
    }
    return this._snapshot || this._pendingData || null;
  }

  /**
   *
   */
  /**
   * Co-editing: Casual Sheets' `attachCollab` (Yjs + Hocuspocus) bridges the
   * live workbook to a room on the self-hosted Casual Sheets server, proxied
   * by nginx at /-/<ep>/sheets/ (WS endpoint /yjs?room=<nid>&role=write).
   * The room is the file nid, so everyone who opens the file meets there; a
   * brand-new sheet is saved first to obtain its nid. When the server is not
   * reachable the editor simply stays single-user.
   */
  /**
   * Univer signs comments with its UserManagerService's current user, which
   * defaults to "Owner". Make it the Drumee user (same identity helper the
   * docs editor and the presence avatars use).
   */
  _setUniverUser(api) {
    try {
      const { userIdentity } = require("builtins/editor/docs/collab");
      const me = userIdentity();
      const inj = api && api.univer && api.univer._injector;
      const um = inj && inj.get(UserManagerService);
      if (um && typeof um.setCurrentUser === "function") {
        // Keep the userID Univer initialised the workbook with: its
        // permission model treats that id as the workbook owner, and
        // swapping it after creation revokes comment permission
        // ("Add comment" silently does nothing). Only the display name
        // changes here; the id is set early via the Casual hook when present.
        const cur = um.getCurrentUser ? um.getCurrentUser() : null;
        const keepId = cur && cur.userID ? cur.userID : "Owner";
        um.setCurrentUser({ userID: keepId, name: me.name, avatar: "" });
      }
    } catch (e) {
      /** comments then show Univer's default author */
    }
  }

  /**
   * Univer initialises every WORKBOOK-level permission point (edit, view,
   * comment, …) to false for our (non-"Owner") user, and its
   * SheetsThreadCommentPermissionController then vetoes "Add comment" with no
   * error. Drumee's ACL already decided this user may edit the file, so grant
   * the workbook points here — now, and again for every workbook unit Univer
   * creates later (the collab bridge swaps in a new unit on room sync).
   */
  _grantWorkbookPermissions(api) {
    const grant = (unitId) => {
      try {
        const inj = api && api.univer && api.univer._injector;
        const ps = inj && inj.get(IPermissionService);
        if (!ps || typeof ps.getAllPermissionPoint !== "function") return 0;
        let n = 0;
        for (const [id, p] of ps.getAllPermissionPoint().entries()) {
          const sid = String(id);
          if (!sid.startsWith("1.") || !sid.endsWith(`_${unitId}`)) continue;
          const v = p && p.value && typeof p.value === "object" ? p.value.value : p && p.value;
          if (v !== true) {
            ps.updatePermissionPoint(id, true);
            n++;
          }
        }
        return n;
      } catch (e) {
        return -1;
      }
    };
    try {
      const wb = api.univer.getActiveWorkbook();
      if (wb) grant(wb.getId());
      // Later units (collab swap, reopen) get the same treatment.
      const uis = api.univer._univerInstanceService;
      if (uis && typeof uis.getTypeOfUnitAdded$ === "function" && !this._unitAddedSub) {
        this._unitAddedSub = uis.getTypeOfUnitAdded$(2).subscribe((unit) => {
          try {
            const id = unit && unit.getUnitId && unit.getUnitId();
            // Points are created shortly after the unit; grant on a short delay.
            setTimeout(() => grant(id), 300);
            setTimeout(() => grant(id), 1500);
          } catch (e) {
            /** ignore */
          }
        });
      }
      // Belt and braces: the permission init runs async after onReady.
      setTimeout(() => {
        try {
          const w = api.univer.getActiveWorkbook();
          if (w) grant(w.getId());
        } catch (e) {
          /** editor gone */
        }
      }, 1500);
    } catch (e) {
      this.warn("sheet_state: permission grant failed", e);
    }
  }

  /**
   * Drumee identity for Univer, applied BEFORE the workbook exists (Casual's
   * `onBeforeCreateUnit`), so the Drumee user is the unit owner: Univer's
   * permission model grants comment/edit rights to the creating user only.
   */
  _setUniverUserEarly(univer) {
    try {
      const { userIdentity } = require("builtins/editor/docs/collab");
      const me = userIdentity();
      const inj = univer && typeof univer.__getInjector === "function" ? univer.__getInjector() : null;
      const um = inj && inj.get(UserManagerService);
      if (!um || typeof um.setCurrentUser !== "function") return;
      // Casual's Comments panel prints the raw `personId` as the author, so
      // the id IS the display name. Permissions no longer depend on the id
      // (see _grantWorkbookPermissions).
      const uid = me.name || (typeof Visitor !== "undefined" && Visitor.get && Visitor.get(_a.id)) || "User";
      um.setCurrentUser({ userID: String(uid), name: me.name, avatar: "" });
      this._univerUsers = um;
      this._univerUserId = String(uid);
    } catch (e) {
      this.warn("sheet_state: early Univer user failed", e);
    }
  }

  async _maybeAttachCollab(api) {
    if (this._collabHandle || this._collabPending || this._destroyed || !api) return;
    this._collabPending = 1;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const base = location.href.split("#")[0].replace(/\/$/, "");
    try {
      let up = false;
      try {
        const res = await fetch(`${base}/sheets/health`, { credentials: "include" });
        const j = res.ok ? await res.json() : null;
        up = !!(j && j.ok);
      } catch (e) {
        /** no server */
      }
      if (!up || this._destroyed) return;
      let nid = this.editor && this.editor.mget(_a.nid);
      if (!nid && this.editor && typeof this.editor.saveContent === "function") {
        this.editor.saveContent();
        for (let i = 0; i < 25 && !nid; i++) {
          await sleep(300);
          nid = this.editor.mget(_a.nid);
        }
      }
      if (!nid || this._destroyed) return;
      const { attachCollab } = await import("@casualoffice/sheets/collab");
      if (this._destroyed) return;
      const server = `${base.replace(/^http/, "ws")}/sheets/yjs`;
      console.log("[SHEET] collab attach room=", nid, "server=", server);
      this._collabHandle = attachCollab(api, {
        room: nid,
        server,
        role: "write",
        onStatus: (status) => {
          this._collabStatus = status;
          if (this.editor && this.editor.el) this.editor.el.dataset.collab = status;
          console.log("[SHEET] collab status", status);
        },
      });
      // Presence: attachCollab carries no user identity, so publish ours on
      // the Yjs awareness and mirror the room's members into the topbar
      // (editor.setPeers) — the same "who is here" the docs editor shows.
      try {
        const aw = this._collabHandle.provider && this._collabHandle.provider.awareness;
        if (aw) {
          let me = { name: "User", color: "#4f46e5" };
          try {
            const id = require("builtins/editor/docs/collab").userIdentity;
            if (typeof id === "function") me = id();
          } catch (e) {
            /** identity helper unavailable */
          }
          aw.setLocalStateField("user", {
            name: me.name,
            color: me.color,
            userID: this._univerUserId || undefined,
          });
          const publish = () => {
            const peers = [];
            for (const [clientId, st] of aw.getStates().entries()) {
              const u = (st && st.user) || {};
              peers.push({
                clientId,
                name: u.name || "User",
                color: u.color || "#888",
                isLocal: clientId === aw.clientID,
              });
              // Teach Univer who the other authors are, so their comments
              // render with their names here (comments carry only an id).
              if (u.userID && this._univerUsers && typeof this._univerUsers.addUser === "function") {
                try {
                  this._univerUsers.addUser({ userID: String(u.userID), name: u.name || "User", avatar: "" });
                } catch (e) {
                  /** duplicate user is fine */
                }
              }
            }
            this._peers = peers;
            if (this.editor && typeof this.editor.setPeers === "function") this.editor.setPeers(peers);
          };
          this._awarenessListener = publish;
          aw.on("change", publish);
          publish();
        }
      } catch (e) {
        this.warn("sheet_state: presence wiring failed", e);
      }
    } catch (e) {
      this.warn("sheet_state: collab attach failed", e);
    } finally {
      this._collabPending = 0;
    }
  }

  onBeforeDestroy() {
    this._destroyed = 1;
    if (this._unitAddedSub) {
      try {
        this._unitAddedSub.unsubscribe();
      } catch (e) {
        /** already gone */
      }
      this._unitAddedSub = null;
    }
    if (this._collabHandle) {
      try {
        const aw = this._collabHandle.provider && this._collabHandle.provider.awareness;
        if (aw && this._awarenessListener) aw.off("change", this._awarenessListener);
      } catch (e) {
        /** already gone */
      }
      try {
        this._collabHandle.detach();
      } catch (e) {
        /** already gone */
      }
      this._collabHandle = null;
    }
    try {
      if (this._root) this._root.unmount();
      if (this._host) {
        this._host.remove();
        this._host = null;
      }
    } catch (e) {
      /** already gone */
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   * React must NOT mount on this view's own element (same fix as docs_state):
   * ui-core sets `el.onclick = View.__handleClick`, which stops propagation
   * AND immediate propagation of every click except a second one within
   * 300ms, and React 18 attaches its root click listener to that same
   * container, later — so every Casual `onClick` (the right-hand panel rail:
   * Tables/Charts/Outline/Comments/History, dialogs, …) died on the first
   * press. Menus/Bold survived only because Univer handles those on
   * pointerdown. Mount on a FIRST child host instead (first, because
   * Skeletons already put a 100%-tall `widget-blank` placeholder here).
   */
  _reactHost() {
    if (this._host && this._host.isConnected) return this._host;
    const host = document.createElement("div");
    host.className = "sheet-state__react-host";
    this.el.insertBefore(host, this.el.firstChild);
    this._host = host;
    return host;
  }
}

export default __sheet_state;
