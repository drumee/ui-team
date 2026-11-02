import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { LocaleType, UserManagerService, IPermissionService } from "@univerjs/core";
import { CasualSheets } from "@casualoffice/sheets/sheets";
import "@casualoffice/sheets/styles";
// Side-effect import: installs `registerComponent` on the Univer FACADE.
// Casual's Insert ▸ Chart builds the chart as a float DOM and registers its
// React renderer through `api.univer.registerComponent` — a method that only
// exists once this module has been imported. Without it `ensureChartComponent`
// returns early, the float DOM is created with a component key nothing can
// resolve, and the chart inserts INVISIBLY: the dialog closes and the sheet
// stays empty ("click vào nó không chèn được chart").
import "@univerjs/ui/facade";
// Same story for two more facade mixins Casual's chrome calls but never
// imports:
//   - `FRange.setNumberFormat` (sheets-numfmt): Format → Number format, the
//     toolbar's number-format list and Format cells → Number all go through
//     it, and silently did nothing (a currency stayed "1234.5");
//   - `FWorksheet.getFilter` (sheets-filter): Data → Toggle filter asks it
//     whether a filter is on; without it every press ADDED the filter again,
//     and it could never be taken off.
import "@univerjs/sheets-numfmt/facade";
import "@univerjs/sheets-filter/facade";
import { contentUrl } from "builtins/editor/content-url";
const pendingFocus = require("builtins/editor/pending-focus");
const { saveBlob } = require("builtins/editor/export");
const chrome = require("builtins/editor/chrome");
const { attachMenuPolicy } = require("builtins/editor/menu-policy");
const { revealWhenPainted, hideLoading } = require("builtins/editor/loading-reveal");
// Casual Sheets chrome gates (see _wireMenus / _sheetExtensions).
const SHEET_FEATURES = { branding: false };

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

/** RFC 4180 CSV → rows of strings (quotes, doubled quotes, CRLF / LF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  const s = String(text || "").replace(/^\ufeff/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

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
        // Help holds one Drumee row, "Contact us" (the support conversation),
        // instead of Casual's About / View on GitHub (`branding`); its
        // Keyboard shortcuts row has no dialog here and drops by itself.
        features: SHEET_FEATURES,
        extensions: this._sheetExtensions(),
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
          this._addMergeToContextMenu(api);
          this._nudgeResize();
          this._setUniverUser(api);
          this._grantWorkbookPermissions(api);
          this._decorateTabsBar();
          this._createIfNew();
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
          // A "<A> commented on <file>" click opens the file ON that comment.
          this._focusPendingComment(api);
        },
        onError: (e) => {
          this.warn("CasualSheets error", e);
          hideLoading(this.el && this.el.closest(".editor-sheet"));
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
    this._wireMenus();

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
   * The comment a notification asked this file to open on (pending-focus):
   * open its thread the way a click on the cell does. Gives up silently (the
   * file stays open) when the comment never shows.
   */
  _focusPendingComment(api) {
    const target = pendingFocus.take(this.mget(_a.nid) || (this.editor && this.editor.mget(_a.nid)));
    if (!target || !target.comment_id || !target.sub_unit_id || !api) return;
    const cancelled = () => !!this._destroyed;
    // The comment as the LIVE workbook has it. The unit is re-created once
    // after onReady (loadSnapshot) and again when co-editing attaches, so its
    // id is read on every try, never kept.
    const find = () => {
      const wb = api.univer && api.univer.getActiveWorkbook && api.univer.getActiveWorkbook();
      const sheet = wb && wb.getSheetBySheetId && wb.getSheetBySheetId(target.sub_unit_id);
      const comment = sheet && sheet.getCommentById && sheet.getCommentById(target.comment_id);
      return comment ? { wb, sheet } : null;
    };
    pendingFocus
      .waitFor(find, { timeout: 15000, cancelled })
      // Settle past the snapshot reload and the permission grants (async,
      // 300/1500 ms after onReady), then look again: the popup belongs to the
      // unit that stays.
      .then((hit) => (hit ? new Promise((r) => setTimeout(r, 1800)).then(find) : null))
      .then((hit) => {
        if (cancelled()) return;
        if (hit) {
          // Univer's own "open this thread": switches sheet, scrolls to the
          // cell, shows the comment popup (what a click on the cell does).
          return api.executeCommand("thread-comment-ui.operation.set-active-comment", {
            unitId: hit.wb.getId(),
            subUnitId: target.sub_unit_id,
            commentId: target.comment_id,
          });
        }
        // The thread is gone (deleted, or resolved and hidden): at least land
        // on its sheet and cell.
        const wb = api.univer && api.univer.getActiveWorkbook && api.univer.getActiveWorkbook();
        const sheet = wb && wb.getSheetBySheetId && wb.getSheetBySheetId(target.sub_unit_id);
        if (sheet && sheet.activate) sheet.activate();
        if (sheet && target.ref && sheet.getRange) {
          const range = sheet.getRange(target.ref);
          if (range && range.activate) range.activate();
        }
        return null;
      })
      .catch((e) => this.warn("sheet_state: could not open the comment", e));
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
        // Nothing to change (the early hook already set this user): setting
        // it again fires Univer's currentUser$, which rebuilds every
        // permission point and re-runs its async authorisation — leaving the
        // workbook read-only until the points are granted again.
        if (cur && cur.userID === keepId && cur.name === me.name) return;
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
    // Keep them granted. Univer re-creates and re-authorises its points
    // asynchronously (a user change, a collab unit swap), and for our
    // non-"Owner" user that lands them back at false AFTER the grants above:
    // for about a second after onReady, editing a cell raised "The range is
    // protected, and you do not have edit permission". Every workbook point
    // that is added or updated as false is set back to true at once (an
    // update to true re-emits and is ignored, so this cannot loop).
    try {
      const inj = api && api.univer && api.univer._injector;
      const ps = inj && inj.get(IPermissionService);
      if (ps && ps.permissionPointUpdate$ && !this._permissionSub) {
        this._permissionSub = ps.permissionPointUpdate$.subscribe((point) => {
          const id = point && String(point.id || "");
          if (!id || !id.startsWith("1.")) return;
          const v = point.value && typeof point.value === "object" ? point.value.value : point.value;
          if (v === true) return;
          const wb = api.univer.getActiveWorkbook();
          if (!wb || !id.endsWith(`_${wb.getId()}`)) return;
          // Not from inside the emission that reported it.
          Promise.resolve().then(() => {
            try {
              ps.updatePermissionPoint(id, true);
            } catch (e) {
              /** point gone */
            }
          });
        });
      }
    } catch (e) {
      this.warn("sheet_state: permission watch failed", e);
    }
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
    if (this._cancelReveal) this._cancelReveal();
    try {
      if (this._menuPolicy) this._menuPolicy();
    } catch (e) {
      /** already gone */
    }
    this._menuPolicy = null;
    try {
      if (this._tabsBarObs) this._tabsBarObs.disconnect();
      if (this._tabsStripObs) this._tabsStripObs.disconnect();
      clearTimeout(this._tabsBarTimer);
      this._closeSheetsMenu();
    } catch (e) {
      /** already gone */
    }
    this._tabsBarObs = null;
    this._tabsStripObs = null;
    if (this._unitAddedSub) {
      try {
        this._unitAddedSub.unsubscribe();
      } catch (e) {
        /** already gone */
      }
      this._unitAddedSub = null;
    }
    if (this._permissionSub) {
      try {
        this._permissionSub.unsubscribe();
      } catch (e) {
        /** already gone */
      }
      this._permissionSub = null;
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
   * Casual's menu bar, cut to what works in Drumee (builtins/editor/
   * menu-policy; rows matched by their data-testid).
   * Hidden:
   *   - View → Show formulas: its command (sheet.command.set-show-formula)
   *     is not registered in this build, the row did nothing;
   *   - Data → Text to Columns: run without a delimiter, it split nothing.
   * Answered by Drumee: View → Toggle gridlines. Casual's row always sends
   * "hide" (it keeps no state), so a second press never brought the
   * gridlines back; this one reads the sheet's state and flips it.
   */
  _wireMenus() {
    if (this._menuPolicy || !this.el) return;
    const HIDDEN = new Set(["cs-menuitem-show-formulas", "cs-menuitem-text-to-columns"]);
    this._menuPolicy = attachMenuPolicy(this.el, {
      key: (row) => row.getAttribute("data-testid") || "",
      hidden: (key) => HIDDEN.has(key),
      actions: {
        "cs-menuitem-toggle-gridlines": () => this._toggleGridlines(),
      },
      // File → Export ▸, as the docs editor's.
      submenus: {
        "cs-menuitem-ext-export": () => [
          { label: LOCALE.FORMAT_XLSX || "Microsoft Excel (.xlsx)", run: () => this._exportXlsx() },
          { label: LOCALE.FORMAT_CSV || "Comma-separated values (.csv)", run: () => this._exportCsv() },
        ],
      },
      // Casual's menubar buttons toggle on mousedown.
      close: (trigger) =>
        trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true })),
    });
  }

  /**
   * Merge cells / Unmerge cells in the cell right-click menu, next to Insert
   * and Delete. That menu is Univer's, not Casual's chrome, and carries no
   * merge row: Univer only puts merging in its ribbon, which Casual replaces,
   * so the right-click menu offered no way to merge. Added through Univer's
   * menu facade (@univerjs/ui/facade, imported above), running the same
   * commands as the toolbar buttons, with Univer's own merge icons.
   */
  _addMergeToContextMenu(api) {
    const univer = api && api.univer;
    if (this._mergeMenuAdded || !univer || typeof univer.createMenu !== "function") return;
    this._mergeMenuAdded = 1;
    const rows = [
      {
        id: "drumee.sheet.context-merge-cells",
        title: LOCALE.MERGE_CELLS || "Merge cells",
        icon: "MergeAllIcon",
        action: "sheet.command.add-worksheet-merge-all",
      },
      {
        id: "drumee.sheet.context-unmerge-cells",
        title: LOCALE.UNMERGE_CELLS || "Unmerge cells",
        icon: "CancelMergeIcon",
        action: "sheet.command.remove-worksheet-merge",
      },
    ];
    for (const row of rows) {
      try {
        univer.createMenu(row).appendTo("contextMenu.mainArea|contextMenu.layout");
      } catch (e) {
        this.warn("sheet: context menu " + row.id + " not added", e);
      }
    }
  }

  /** Base name for exported / printed files: the document's name. */
  _exportName() {
    const raw = (this.editor && this.editor.mget(_a.filename)) || this.mget(_a.filename) || "Spreadsheet";
    return String(raw).replace(/<.+>/, "").replace(/\.usheet$/i, "").trim() || "Spreadsheet";
  }

  /** The sheet in view: its name and its used range as displayed text. */
  _activeSheetCells() {
    const api = this._apiHandle;
    const ws = api && api.univer && api.univer.getActiveWorkbook().getActiveSheet();
    if (!ws) return null;
    const rows = ws.getDataRange().getDisplayValues();
    return { name: ws.getSheetName(), rows };
  }

  /**
   * File → Import: pick an .xlsx or .csv and add its sheet(s) to this
   * spreadsheet as new tabs — nothing that is already here is touched.
   * An .xlsx keeps values, formulas, styles, merges, column widths and row
   * heights (Casual's own reader, its styles inlined since their ids belong
   * to the other workbook); a .csv becomes one sheet of values.
   */
  _importFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.remove();
      if (file) this._importInto(file);
    });
    document.body.appendChild(input);
    input.click();
  }

  async _importInto(file) {
    const api = this._apiHandle;
    const wb = api && api.univer && api.univer.getActiveWorkbook();
    if (!wb) return;
    const base = String(file.name || "Imported").replace(/\.[^.]+$/, "") || "Imported";
    const taken = new Set(wb.getSheets().map((ws) => ws.getSheetName()));
    const uniqueName = (name) => {
      let n = String(name || base).slice(0, 80);
      if (!taken.has(n)) return taken.add(n), n;
      for (let i = 2; ; i++) {
        const c = `${n} (${i})`;
        if (!taken.has(c)) return taken.add(c), c;
      }
    };
    try {
      let first = null;
      if (/\.csv$/i.test(file.name || "") || /csv/.test(file.type || "")) {
        const rows = parseCsv(await file.text());
        const cellData = {};
        rows.forEach((r, ri) => {
          r.forEach((v, ci) => {
            if (v === "") return;
            const n = Number(v);
            (cellData[ri] = cellData[ri] || {})[ci] = {
              v: v.trim() !== "" && !Number.isNaN(n) && /^[-+.\d]/.test(v.trim()) ? n : v,
            };
          });
        });
        const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
        first = wb.insertSheet(uniqueName(base), {
          sheet: { cellData, rowCount: Math.max(1000, rows.length + 50), columnCount: Math.max(26, cols + 5) },
        });
      } else {
        const { xlsxToWorkbookData } = await import("@casualoffice/sheets/xlsx");
        const imported = await xlsxToWorkbookData(await file.arrayBuffer());
        // IWorkbookData of the picked file.
        const data = imported || {};
        const styles = data.styles || {};
        const order = data.sheetOrder || Object.keys(data.sheets || {});
        for (const id of order) {
          const sheet = data.sheets && data.sheets[id];
          if (!sheet) continue;
          const cellData = {};
          for (const [r, row] of Object.entries(sheet.cellData || {})) {
            for (const [c, cell] of Object.entries(row || {})) {
              if (!cell) continue;
              const out = { ...cell };
              if (typeof out.s === "string") out.s = styles[out.s] || undefined;
              (cellData[r] = cellData[r] || {})[c] = out;
            }
          }
          const { id: _drop, name, ...rest } = sheet;
          const ws = wb.insertSheet(uniqueName(name), { sheet: { ...rest, cellData } });
          if (!first) first = ws;
        }
      }
      if (first && typeof first.activate === "function") first.activate();
    } catch (e) {
      this.warn("sheet: import failed", e);
    }
  }

  /** File → Export as Excel: the LIVE workbook (unsaved edits included). */
  async _exportXlsx() {
    try {
      const data = this.getSnapshot();
      if (!data) return;
      const { workbookDataToXlsx } = await import("@casualoffice/sheets/xlsx");
      const blob = await workbookDataToXlsx(data);
      saveBlob(blob, `${this._exportName()}.xlsx`);
    } catch (e) {
      this.warn("sheet: export as xlsx failed", e);
    }
  }

  /** File → Export as CSV: the sheet in view, as Excel opens it (UTF-8 BOM). */
  _exportCsv() {
    try {
      const sheet = this._activeSheetCells();
      if (!sheet) return;
      const cell = (v) => {
        const t = v == null ? "" : String(v);
        return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const csv = sheet.rows.map((r) => r.map(cell).join(",")).join("\r\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      saveBlob(blob, `${this._exportName()} - ${sheet.name}.csv`);
    } catch (e) {
      this.warn("sheet: export as csv failed", e);
    }
  }

  /**
   * File → Print: the sheet in view as a plain table (its displayed values),
   * printed from a hidden frame — Casual Sheets has no print of its own.
   */
  _printSheet() {
    try {
      const sheet = this._activeSheetCells();
      if (!sheet) return;
      const esc = (v) =>
        String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
      const body = sheet.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("");
      const title = esc(`${this._exportName()} - ${sheet.name}`);
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
        body{font:11pt Arial,sans-serif;margin:12mm}h1{font-size:13pt;margin:0 0 8px}
        table{border-collapse:collapse}td{border:1px solid #c7c7c7;padding:3px 6px;white-space:pre-wrap;vertical-align:top}
      </style></head><body><h1>${title}</h1><table>${body}</table></body></html>`);
      doc.close();
      const done = () => setTimeout(() => frame.remove(), 1000);
      frame.contentWindow.onafterprint = done;
      setTimeout(() => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } finally {
          setTimeout(done, 60000);
        }
      }, 50);
    } catch (e) {
      this.warn("sheet: print failed", e);
    }
  }

  _sheetExtensions() {
    if (!this._extensions) {
      // Merge / Unmerge, also in Format (as Google Sheets has them): Casual
      // offers them only as toolbar buttons. Same commands as those buttons.
      const run = (command) => (api) => {
        try {
          if (api && api.executeCommand) api.executeCommand(command);
        } catch (e) {
          this.warn("sheet: " + command + " failed", e);
        }
      };
      // File: Casual Sheets' own two rows are both off here (About needs
      // its branding, Properties a dialog this host does not provide), so
      // Casual dropped the whole menu. It mirrors the docs editor's File
      // (New, Save, Make a copy, Rename, Print, Export ▸, with its icons)
      // with the sheet's means: a new sheet in this folder, Import (another
      // file's sheets added as tabs), the window's save, copy and inline
      // rename, a printout of the sheet in view, and the live workbook
      // exported as Excel or CSV. Share / Get info / Trash
      // stay in the gear menu, as in docs.
      const fileRow = (id, label, icon, service) => ({
        menu: "file",
        id,
        label,
        icon,
        onClick: () => {
          const editor = this.editor;
          if (!editor || (editor.isDestroyed && editor.isDestroyed())) return;
          editor.onUiEvent({ get: () => service, mget: () => service }, { service });
        },
      });
      this._extensions = {
        menu: [
          {
            menu: "file",
            id: "new",
            label: LOCALE.NEW || "New",
            icon: "note_add",
            shortcut: "Ctrl+N",
            onClick: () => chrome.createNew(this.editor, "editor_sheet"),
          },
          {
            menu: "file",
            id: "import",
            label: LOCALE.IMPORT || "Import",
            icon: "file_upload",
            onClick: () => this._importFile(),
          },
          {
            menu: "file",
            id: "save",
            label: LOCALE.SAVE || "Save",
            icon: "file_download",
            shortcut: "Ctrl+S",
            onClick: () => {
              if (this.editor && typeof this.editor.saveContent === "function") this.editor.saveContent();
            },
          },
          fileRow("make-copy", LOCALE.MAKE_A_COPY, "content_copy", _a.duplicate),
          fileRow("rename", LOCALE.RENAME, "edit", "direct-rename"),
          {
            menu: "file",
            id: "print",
            label: LOCALE.PRINT || "Print",
            icon: "print",
            onClick: () => this._printSheet(),
          },
          // Export ▸ Excel / CSV: the submenu is the menu policy's
          // (_wireMenus), Casual's extensions take no submenu.
          {
            menu: "file",
            id: "export",
            label: LOCALE.EXPORT || "Export",
            icon: "file_download",
            onClick: () => {},
          },
          {
            menu: "format",
            id: "merge-cells",
            label: LOCALE.MERGE_CELLS || "Merge cells",
            icon: "cell_merge",
            onClick: run("sheet.command.add-worksheet-merge-all"),
          },
          {
            menu: "format",
            id: "unmerge-cells",
            label: LOCALE.UNMERGE_CELLS || "Unmerge cells",
            icon: "splitscreen_vertical_add",
            onClick: run("sheet.command.remove-worksheet-merge"),
          },
          {
            menu: "help",
            id: "contact-us",
            label: LOCALE.CONTACT_US,
            onClick: () => {
              if (this.editor && this.editor.contactSupport) this.editor.contactSupport();
            },
          },
        ],
      };
    }
    return this._extensions;
  }

  _toggleGridlines() {
    const api = this._apiHandle;
    try {
      const sheet = api && api.univer && api.univer.getActiveWorkbook().getActiveSheet();
      if (!sheet || typeof sheet.setHiddenGridlines !== "function") return;
      sheet.setHiddenGridlines(!sheet.hasHiddenGridLines());
    } catch (e) {
      this.warn("sheet: gridlines toggle failed", e);
    }
  }

  /**
   * A new sheet is created on disk as soon as it is ready, as Google Sheets
   * does. Saves only ran from the edit autosave (4s after a change) or an
   * explicit Save, so a new sheet had no node: it was missing from the
   * folder's files panel and Recently viewed until something was typed and
   * saved, and a blank one never landed at all. Once: a reopen has a nid.
   */
  _createIfNew() {
    const ed = this.editor;
    if (this._createdNew || this.media || !ed || ed.mget(_a.nid)) return;
    if (typeof ed.saveContent !== "function") return;
    this._createdNew = 1;
    ed.saveContent();
  }

  /**
   * The design's tab strip — [+] [≡] [Sheet1 ▾] (Figma 1337:16842). Casual
   * draws the tabs and "+"; Drumee adds the all-sheets button, which lists
   * them, and the caret on the open tab, which opens Casual's own tab menu
   * (Rename / Delete — its right-click menu). Casual re-renders the strip on
   * every switch, so the additions are re-applied from an observer.
   */
  _decorateTabsBar() {
    const root = this.el;
    if (!root || this._destroyed) return;
    const run = () => {
      if (this._destroyed) return;
      try {
        const bar = root.querySelector('[data-testid="casual-sheets-tabs"]');
        if (!bar) return;
        if (!this._tabsStripObs) {
          this._tabsStripObs = new MutationObserver(() => {
            clearTimeout(this._tabsBarTimer);
            this._tabsBarTimer = setTimeout(run, 50);
          });
          this._tabsStripObs.observe(bar, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["aria-selected", "data-active", "class"],
          });
        }
        const add = bar.querySelector('[data-testid="cs-tab-add"]');
        if (add && !bar.querySelector(".editor-sheet__sheets-list")) {
          const list = document.createElement("button");
          list.type = "button";
          list.className = "editor-sheet__sheets-list";
          list.title = LOCALE.ALL_SHEETS || "All sheets";
          list.addEventListener("click", (e) => {
            e.stopPropagation();
            this._toggleSheetsMenu(bar, list);
          });
          add.insertAdjacentElement("afterend", list);
        }
        const tabs = [...bar.querySelectorAll('button[data-testid^="cs-tab-"]')].filter((b) => b.getAttribute("data-testid") !== "cs-tab-add");
        for (const tab of tabs) {
          const active = tab.getAttribute("aria-selected") === "true" || tab.dataset.active === "true";
          const caret = tab.querySelector(".editor-sheet__tab-caret");
          if (active && !caret) {
            const c = document.createElement("span");
            c.className = "editor-sheet__tab-caret";
            c.addEventListener("click", (e) => {
              e.stopPropagation();
              const b = tab.getBoundingClientRect();
              tab.dispatchEvent(
                new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  clientX: b.left + 12,
                  clientY: b.top + 12,
                  button: 2,
                })
              );
            });
            tab.appendChild(c);
          } else if (!active && caret) {
            caret.remove();
          }
        }
      } catch (e) {
        /** editor gone */
      }
    };
    run();
    if (!this._tabsBarObs) {
      // Until the strip exists (it mounts with the workbook), watch the tree.
      this._tabsBarObs = new MutationObserver(() => {
        if (this._tabsStripObs) return;
        clearTimeout(this._tabsBarTimer);
        this._tabsBarTimer = setTimeout(run, 50);
      });
      this._tabsBarObs.observe(root, { childList: true, subtree: true });
    }
  }

  /** The all-sheets list, under the ≡ button; a row switches to that sheet. */
  _toggleSheetsMenu(bar, anchor) {
    if (this._sheetsMenu) return this._closeSheetsMenu();
    const tabs = [...bar.querySelectorAll('button[data-testid^="cs-tab-"]')].filter((b) => b.getAttribute("data-testid") !== "cs-tab-add");
    if (!tabs.length) return;
    const menu = document.createElement("div");
    menu.className = "editor-sheet__sheets-menu";
    for (const tab of tabs) {
      const row = document.createElement("div");
      const active = tab.getAttribute("aria-selected") === "true" || tab.dataset.active === "true";
      row.className = `editor-sheet__sheets-menu-item${active ? " is-active" : ""}`;
      row.textContent = (tab.textContent || "").trim();
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        this._closeSheetsMenu();
        // Casual switches on the pointer, not on a bare click().
        const b = tab.getBoundingClientRect();
        const at = { bubbles: true, cancelable: true, clientX: b.left + 8, clientY: b.top + 8, button: 0 };
        for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
          tab.dispatchEvent(
            type.startsWith("pointer")
              ? new PointerEvent(type, { ...at, pointerId: 1, isPrimary: true })
              : new MouseEvent(type, at)
          );
        }
      });
      menu.appendChild(row);
    }
    const a = anchor.getBoundingClientRect();
    menu.style.left = `${Math.round(a.left)}px`;
    menu.style.bottom = `${Math.round(window.innerHeight - a.top + 4)}px`;
    document.body.appendChild(menu);
    this._sheetsMenu = menu;
    this._sheetsMenuClose = (e) => {
      if (e && e.type === "keydown" && e.key !== "Escape") return;
      if (e && e.type === "pointerdown" && menu.contains(e.target)) return;
      this._closeSheetsMenu();
    };
    setTimeout(() => {
      document.addEventListener("pointerdown", this._sheetsMenuClose, true);
      document.addEventListener("keydown", this._sheetsMenuClose, true);
    }, 0);
  }

  _closeSheetsMenu() {
    if (this._sheetsMenu) this._sheetsMenu.remove();
    this._sheetsMenu = null;
    if (this._sheetsMenuClose) {
      document.removeEventListener("pointerdown", this._sheetsMenuClose, true);
      document.removeEventListener("keydown", this._sheetsMenuClose, true);
      this._sheetsMenuClose = null;
    }
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
    // The loading skeleton (sheet/skeleton) stays over the editor until it
    // has painted — Casual's chrome and grid in place and its icon font in.
    // Lifted at onReady, it let Casual's half-built first render show: a
    // blank sheet and the icon NAMES ("table", "pivot_table", …) spilling
    // out at the right while Material Symbols still downloaded.
    if (this._cancelReveal) this._cancelReveal();
    this._cancelReveal = revealWhenPainted(this.el.closest(".editor-sheet"), {
      painted: () =>
        this._ready &&
        host.querySelector('[data-testid="casual-sheets-toolbar"]') &&
        host.querySelector("canvas"),
    });
    return host;
  }
}

export default __sheet_state;
