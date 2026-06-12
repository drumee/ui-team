const EDITABLE = require("../editable");

const cnWindowButton = "window-button";

function tooltip(ui, content) {
  return {
    className: `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips ${cnWindowButton}__tooltips`,
    content,
  };
}

function action(ui, { service, ico, tip, state, icons }) {
  const a = {
    ico,
    className: `${cnWindowButton}__icon-button`,
    service,
    uiHandler: ui,
    tooltips: tooltip(ui, tip),
  };
  if (state != null) a.state = state;
  if (icons) a.icons = icons;
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
          ico: "desktop_preview",
          tip: LOCALE.PREVIEW,
        }),
      );
    } else if (Platform.get("doc_editor")) {
      actions.push(
        action(ui, { service: _a.edit, ico: "app-edit", tip: LOCALE.EDIT }),
      );
    }
  }

  actions.push(
    action(ui, { service: "print", ico: "print", tip: LOCALE.PRINT }),
  );

  // Fullscreen → maximize-within-workspace toggle, mirroring the window-tab
  // zoom (fills the workspace, never the header/sidebar). Icon flips per toggle.
  actions.push(
    action(ui, {
      service: "doc-zoom",
      ico: ui._zoomed ? "desktop_reduce" : "desktop_fullview",
      tip: LOCALE.FULLSCREEN,
      state: ui._zoomed ? 1 : 0,
      icons: ["desktop_fullview", "desktop_reduce"],
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
