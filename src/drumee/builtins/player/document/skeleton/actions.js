// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/document/skeleton/actions
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The document player's topbar actions, as data for the shared topbar
 * widget (builtins/player/widget/topbar).
 *
 * These are rendered inline in the header rather than behind a dropdown
 * trigger, so they stay directly discoverable — the widget's `before`
 * slot places them ahead of its own defaults.
 *
 * Every conditional here is the one the previous skeleton applied; only
 * the return type changed, from skeletons to TopbarAction descriptors.
 */

const EDITABLE = require("../editable");

const cnWindowButton = "window-button";

// Download / save-as-PDF / preview / print get the filled (primary) look;
// every other action is a plain icon button.
const PRIMARY_SERVICES = ["download-pdf", "preview", "print", _a.edit];

function tooltip(ui, content) {
  return {
    className: `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips ${cnWindowButton}__tooltips`,
    content,
  };
}

// Can THIS VIEWER really edit the office doc, i.e. will the editor open writable?
// ui.canUpload() alone cannot answer it: that reads the node privilege, which
// dmz/wm getWindowPreset pins to the LINK's cap — so a can_edit link looks writable
// even to an anonymous opener, whom the editor then forces read-only. They ended up
// in a read-only editor with no Request-edit action at all. The sharebox publishes
// the viewer-aware answer on loadDeskContent (is_authenticated AND can_edit, which
// mirrors the editor's own rule). If that flag is absent — boot race, or any
// non-share session — fall back to the previous canUpload() test so behaviour is
// unchanged rather than guessed.
function _dmzViewerCanEdit(ui) {
  const r = typeof window !== "undefined" && window.uiRouter;
  const flag = r && r._dmzShareViewerCanEdit;
  if (typeof flag === "boolean") return flag;
  return !!(ui && typeof ui.canUpload === "function" && ui.canUpload());
}

/**
 * One TopbarAction. `id` is only set where the old skeleton set `sys_pn`:
 * the widget maps `id` onto `sys_pn`, and every named part registers itself
 * on the player as `__camelCase`, so naming everything would quietly add
 * properties to a 1200-line class for no gain.
 */
function action(ui, { service, ico, tip, state, icons, sys_pn, label, className, dataset }) {
  const a = {
    type: "button",
    icon: ico,
    className: `${cnWindowButton}__icon-button`,
    service,
    tooltips: tooltip(ui, tip),
    style: PRIMARY_SERVICES.includes(service)
      ? {
          "background-color": "var(--normal-bg-90)",
          color: "var(--normal-fg-10)",
          padding: "4px 8px",
          "border-radius": "6px",
        }
      : { color: "var(--normal-fg-20)" },
  };
  if (label) a.label = label;
  if (className) a.className = className;
  if (dataset) a.dataset = dataset;
  if (state != null) a.state = state;
  if (icons) a.icons = icons;
  if (sys_pn) {
    a.id = sys_pn;
    a.partHandler = ui;
  }
  return a;
}

module.exports = function (ui) {
  const actions = [];

  // Download-as-PDF, Edit and Print are NOT inline any more. In preview mode
  // they were in the header AND in the gear menu, which is where they now
  // live alone (see `.menu` below). In edit mode they were already hidden —
  // they surface the stale server info.pdf, which the server never re-runs —
  // so dropping them here costs nothing there.
  //
  // Header download icon was already intentionally hidden for docs (product
  // request). DMZ download gating still lives on those handlers via
  // _dmzGateDownload().

  // Edit ⇄ Preview, as a real switch: a label, a track and a knob that
  // slides. The label stays "Edit" in both states — it names what the
  // switch governs, not what the next click does — and `data-active` is
  // what says whether the editor is on.
  //
  // Built as a `custom` action rather than through `action()`, which only
  // makes Button.Svg / Button.Label; a track-and-knob needs its own markup.
  //
  // The service flips, so one control both enters and leaves edit mode.
  // `updateMenu()` re-feeds this row on every mode change (already called
  // from preview() and from the editor's onLoad), so the knob follows the
  // mode without extra wiring.
  const isEditing = ui.mget(_a.mode) == _a.edit;
  const ext = (ui.mget(_a.ext) || "").toLowerCase();
  if (!Visitor.inDmz && Platform.get("doc_editor") && EDITABLE.includes(ext)) {
    const pfx = `${ui.fig.family}-topbar__mode`;
    actions.push({
      id: "doc-mode-switch",
      type: "custom",
      component: Skeletons.Box.X({
        className: pfx,
        sys_pn: "doc-mode-switch",
        service: isEditing ? _a.preview : _a.edit,
        uiHandler: [ui],
        partHandler: ui,
        dataset: { active: isEditing ? 1 : 0 },
        kids: [
          Skeletons.Note({
            content: ui.canUpload() ? LOCALE.EDIT : LOCALE.OPEN,
            className: `${pfx}-label`,
          }),
          Skeletons.Box.X({
            className: `${pfx}-track`,
            kids: [Skeletons.Element({ className: `${pfx}-knob` })],
          }),
        ],
      }),
    });
  }

  // The one action with no gear-menu equivalent: a secure-share recipient the
  // editor will force READ-ONLY gets a "Request edit" that opens the share's
  // request-access popup (reusing the already-wired dmz-request-download gate
  // → sharebox → Request Access / sign-up).
  if (
    Visitor.inDmz &&
    !_dmzViewerCanEdit(ui) &&
    Platform.get("doc_editor") &&
    EDITABLE.includes((ui.mget(_a.ext) || "").toLowerCase())
  ) {
    actions.push(
      action(ui, {
        service: "dmz-request-edit",
        ico: "app-edit",
        tip: LOCALE.SECURE_SHARE_REQUEST_ACCESS || LOCALE.EDIT,
      }),
    );
  }

  // Maximize used to be an inline `doc-zoom` button here. It is now the
  // "full" preset in the widget's Move & Resize panel, which also offers
  // tiling — two controls that both maximised, differently, was worse than
  // one. `toggleZoom()` and `case "doc-zoom"` are left in place; nothing in
  // the header reaches them any more.

  // The inline browser-fullscreen button was removed. `toggleFullscreen()`,
  // `case "doc-fullscreen"` and the fullscreenchange listeners are left in
  // place — they still unwind a fullscreen entered by any other means (F11,
  // the close path) — but nothing in the header reaches them any more.

  return actions;
};

/**
 * The gear menu, as MenuItem data for the widget's folder-settings default.
 *
 * Default set, in both modes: Copy, Rename, Chat threads, Share, Get info,
 * Move to trash.
 *
 * Preview mode adds the three export rows on top — Download, Download a PDF
 * version, Print. They are absent while editing because they serve the
 * server's info.pdf, which is not re-rendered on demand, so mid-edit they
 * would hand back a stale document.
 *
 * Edit ⇄ Preview is NOT here: it is the switch in the header (see above).
 *
 * Every row maps to a service this player already answers — the ones in its
 * own `onUiEvent` plus "info", which the base class handles
 * (player/interact.js). `_a.link` is deliberately absent: its case is a bare
 * `break`, so a "Copy link" row would look live and do nothing.
 */
module.exports.menu = function (ui) {
  const isEditing = ui.mget(_a.mode) == _a.edit;
  const ext = (ui.mget(_a.ext) || "").toLowerCase();
  const media = ui.media;
  // Same test the image player applies: the node is editable only when we
  // still have the MFS view to forward to and the session may write.
  const editable = !!media && !Visitor.inDmz && !!ui.canUpload();

  const sections = [];

  // Preview-only: exporting the rendered document. See the header comment
  // for why these are not offered while the editor is open.
  const exports_ = [];
  if (!isEditing) {
    if (Visitor.inDmz || ui.canDownload()) {
      exports_.push({
        id: "download",
        label: LOCALE.DOWNLOAD,
        icon: "app-download",
        service: _e.download,
      });
    }
    if (ext != _a.pdf) {
      exports_.push({
        id: "download-pdf",
        label: LOCALE.DOWNLOAD_AS_PDF,
        icon: "app-pdf-file",
        service: "download-pdf",
      });
    }
    exports_.push({ id: "print", label: LOCALE.PRINT, icon: "app-print", service: "print" });
  }
  if (exports_.length) sections.push(exports_);

  // Copy / Rename / Chat threads read as one block.
  const naming = [];
  if (media && !Visitor.inDmz) {
    naming.push({ id: "copy", label: LOCALE.COPY, icon: "apps-copy", service: _e.copy });
  }
  if (editable) {
    naming.push({
      id: "rename",
      label: LOCALE.RENAME,
      icon: "app-edit",
      service: "direct-rename",
    });
  }
  if (media && !Visitor.inDmz) {
    naming.push({
      id: "chat-threads",
      label: LOCALE.CHAT_THREADS,
      icon: "file-thread",
      service: "chat-threads",
      children: [
        { id: "view-chat-threads", label: LOCALE.VIEW_CHAT_THREADS, service: _a.chat },
        {
          id: "download-file-chat",
          label: LOCALE.DOWNLOAD_CHAT_THREADS,
          service: "download-file-chat",
        },
      ],
    });
  }
  if (naming.length) sections.push(naming);

  const details = [];

  // Share is offered wherever the file lives, as in the Figma; widget/share
  // decides whether it opens the real flow or explains that an external
  // workspace is needed first. Gating it on the area would leave that
  // explanation unreachable.
  if (editable) {
    details.push({
      id: "secure-share",
      label: LOCALE.SHARE,
      icon: "ctxmenu-share",
      service: "secure-share",
    });
  }

  // The link flavour on top of that is area-dependent. `share` has none of
  // its own — the Share row above already covers it.
  if (editable) {
    switch (ui.mget(_a.area)) {
      case _a.private:
        details.push({
          id: "designation-link",
          label: LOCALE.DESIGNATION_LINK,
          icon: "app-share",
          service: "designation-link",
        });
        break;
      case _a.public:
        details.push({
          id: "direct-url",
          label: LOCALE.URL_ADDRESS,
          icon: "apps-link-simple",
          service: "direct-url",
        });
        break;
    }
  }
  // "info" is handled by the base player, not this class.
  details.push({ id: "info", label: LOCALE.GET_INFO, icon: "ctxmenu-info", service: "info" });
  sections.push(details);

  if (media && media.canRemove && media.canRemove()) {
    sections.push([
      {
        id: "trash",
        label: LOCALE.MOVE_TO_TRASH,
        icon: "chat-action-trash",
        service: _e.remove,
        className: "trash",
      },
    ]);
  }

  const items = [];
  sections.forEach((s, i) => {
    if (i) items.push({ separator: true });
    items.push(...s);
  });
  return items;
};
