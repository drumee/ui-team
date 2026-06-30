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
const PRIMARY_SERVICES = [_a.download, "download-pdf", "preview", "print", _a.edit];

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

  // Download / download-as-PDF are always shown. In a DMZ share without the
  // download grant, the click is gated (sign-up/login or Request Access) rather
  // than hidden — the action handlers call _dmzGateDownload().
  actions.push(
    action(ui, {
      service: _a.download,
      ico: _a.download,
      tip: LOCALE.DOWNLOAD_ORIG,
    }),
  );

  if (ui.mget(_a.ext) != _a.pdf) {
    actions.push(
      action(ui, {
        service: "download-pdf",
        ico: "app-pdf-file",
        tip: LOCALE.DOWNLOAD_AS_PDF,
      }),
    );
  }

  if (ui.canUpload() && !Visitor.inDmz && EDITABLE.includes(ui.mget(_a.ext).toLowerCase())) {
    if (ui.mget(_a.mode) == _a.edit) {
      actions.push(
        action(ui, {
          service: "preview",
          ico: "eye",
          tip: LOCALE.PREVIEW,
        }),
      );
    } else if (Platform.get("doc_editor")) {
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

  // Hide the toolbar Print while editing an office doc: it would print the stale
  // server info.pdf (the server never re-runs the conversion on demand) while the
  // live document lives in the cross-origin office-editor iframe, which has its own
  // Print (#btn-print). The icon stays in view/preview, where the server PDF equals
  // the displayed/saved document.
  if (ui.mget(_a.mode) != _a.edit) {
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
