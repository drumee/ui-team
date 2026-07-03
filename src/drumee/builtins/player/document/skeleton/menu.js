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

  // Every header export (download-original, download-as-PDF, print) reads what the
  // server last persisted/built — not the live editor. While the doc is open in a
  // WRITABLE editor those sources lag the in-editor edits: download-original waits
  // on OnlyOffice's autosave, and download-as-PDF/print additionally wait on the
  // server rebuilding media.pdf. So they would export a stale version. Hide them
  // there and let the editor's own toolbar (which acts on the live model) own
  // export/print. Preview mode, read-only (DMZ) viewing, and PDFs (never edit mode)
  // keep them: the server source is exactly what's on screen, so it's correct.
  const inWritableEditor = ui.mget(_a.mode) == _a.edit && ui.canUpload();

  // Download / download-as-PDF. In a DMZ share without the download grant, the
  // click is gated (sign-up/login or Request Access) rather than hidden — the
  // action handlers call _dmzGateDownload().
  if (!inWritableEditor) {
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

  // Print reads the server-built media.pdf — same staleness as the downloads above
  // while a writable editor is open, so gate it identically.
  if (!inWritableEditor) {
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
