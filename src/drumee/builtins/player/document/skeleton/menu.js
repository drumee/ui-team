const EDITABLE = require("../editable");

const cnWindowButton = "window-button";

function tooltip(ui, content) {
  return {
    className: `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips ${cnWindowButton}__tooltips`,
    content,
  };
}

// Download / save-as-PDF / preview / print get the filled (primary) look; every
// other action is a plain icon button.
const PRIMARY_SERVICES = ["download-pdf", "preview", "print", _a.edit];

function action(ui, { service, ico, tip, state, icons, sys_pn }) {
  const a = {
    ico,
    className: `${cnWindowButton}__icon-button`,
    service,
    uiHandler: ui,
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
  if (state != null) a.state = state;
  if (icons) a.icons = icons;
  if (sys_pn) {
    a.sys_pn = sys_pn;
    a.partHandler = ui;
  }
  return Skeletons.Button.Svg(a);
}

// Flat header toolbar — the document actions are rendered inline in the tab
// header (no hover/dropdown trigger) so they're directly discoverable.
module.exports = function (ui) {
  const actions = [];

  // Header download icon intentionally hidden for docs (product request).
  // download-as-PDF / print remain; DMZ download gating still lives on those
  // handlers via _dmzGateDownload() when re-enabled.

  // While editing an office doc, hide the three actions that surface the stale
  // server info.pdf (the server never re-runs the conversion on demand):
  // download-as-PDF, preview and print. They stay in view/preview mode, where the
  // server PDF equals the displayed doc. Exit edit mode via the window close control.
  const isEditing = ui.mget(_a.mode) == _a.edit;

  if (ui.mget(_a.ext) != _a.pdf && !isEditing) {
    actions.push(
      action(ui, {
        service: "download-pdf",
        ico: "app-pdf-file",
        tip: LOCALE.DOWNLOAD_AS_PDF,
      }),
    );
  }

  if (ui.canUpload() && !Visitor.inDmz && EDITABLE.includes(ui.mget(_a.ext).toLowerCase())) {
    // No preview toggle while editing — it reloads the stale server render. Only
    // offer Edit when not already editing.
    if (!isEditing && Platform.get("doc_editor")) {
      actions.push(
        action(ui, { service: _a.edit, ico: "app-edit", tip: LOCALE.EDIT }),
      );
    }
  } else if (
    Visitor.inDmz &&
    !ui.canUpload() &&
    Platform.get("doc_editor") &&
    EDITABLE.includes((ui.mget(_a.ext) || "").toLowerCase())
  ) {
    // Secure-share recipient WITHOUT an edit grant: the editor is read-only. Offer a
    // "Request edit" action that opens the share's request-access popup (reusing the
    // already-wired dmz-request-download gate → sharebox → Request Access / sign-up).
    actions.push(
      action(ui, {
        service: "dmz-request-edit",
        ico: "app-edit",
        tip: LOCALE.SECURE_SHARE_REQUEST_ACCESS || LOCALE.EDIT,
      }),
    );
  }

  // Print stays hidden while editing (same stale-info.pdf reason as above); the
  // cross-origin office editor has its own Print (#btn-print).
  if (!isEditing) {
    actions.push(
      action(ui, { service: "print", ico: "print", tip: LOCALE.PRINT }),
    );
  }

  // Maximize → fills the workspace (never the header/sidebar), mirroring the
  // window-tab zoom. Icon flips per toggle.
  actions.push(
    action(ui, {
      service: "doc-zoom",
      ico: ui._zoomed ? "desktop_reduce" : "desktop_fullview",
      tip: LOCALE.MAXIMIZE,
      state: ui._zoomed ? 1 : 0,
      icons: ["desktop_fullview", "desktop_reduce"],
    }),
  );

  // True full screen → browser Fullscreen API on the whole viewer (fills the
  // monitor). Distinct from the maximize button above.
  actions.push(
    action(ui, {
      service: "doc-fullscreen",
      ico: ui._fullscreen ? "desktop_reduce" : "player-fullscreen",
      tip: ui._fullscreen ? LOCALE.EXIT_FULLSCREEN : LOCALE.FULLSCREEN,
      sys_pn: "doc-fullscreen-btn",
    }),
  );

  return Skeletons.Box.X({
    debug: __filename,
    className: `${cnWindowButton}__buttons-wrapper`,
    sys_pn: "doc-actions",
    partHandler: ui,
    kids: [...actions, require("../../skeleton/control")(ui)],
  });
};
