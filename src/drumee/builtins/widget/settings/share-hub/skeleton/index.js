const { topbar, validity } = require("../../hub/skeleton/toolkit")
const { read, write, modify } = _K.permission
let items = [
  { permission: write, label: LOCALE.UPLOAD_AND_DOWNLOAD || "Upload and Download", name: _a.write },
  { permission: read, label: LOCALE.DOWNLOAD_ONLY || "Download only", name: _a.read, lock: 1 },
]
function content(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__content`,
    kids: [
      require('./who-can-access').default(ui),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      require('./password').default(ui, ui.data(), _a.edit),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.PERMISSION || "Permission:",
      }),
      {
        kind: "settings_permission",
        className: `${fig}__form`,
        items,
        itemsFlow: _a.x,
        ...ui.data(),
        sys_pn: "permission-form",
        uiHandler: [ui]
      },
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      // validity(ui, ui.formData),
    ],
  });
}

function footer(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__footer`,
    kids: [
      Skeletons.Button.Label({
        className: `${fig}__cancel-btn`,
        label: LOCALE.CANCEL || "Cancel",
        icon: null,
        service: _e.close,
        uiHandler: [ui],
      }),
      Skeletons.Button.Label({
        className: `${fig}__save-btn`,
        label: LOCALE.APPLY_ALL_SAVE || "Apply all & Save",
        icon: null,
        service: "apply-all-save",
        uiHandler: [ui],
      }),
    ],
  });
}

export default function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__wrapper`,
    kids: [
      topbar(ui),
      content(ui),
      footer(ui)],
  });
}

