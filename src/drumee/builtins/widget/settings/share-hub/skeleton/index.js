const { topbar, validity } = require("../../hub/skeleton/toolkit")

// const topbar = (ui, name) => {
//   const figFamily = `${ui.fig.family}-topbar`;

//   return Skeletons.Box.X({
//     debug: __filename,
//     className: `${figFamily}__container`,
//     sys_pn: _a.topBar,
//     kids: [
//       Skeletons.Button.Svg({
//         ico: "arrow-left",
//         className: `${figFamily}__back`,
//         service: _a.back,
//         uiHandler: [ui],
//       }),
//       Skeletons.Note({
//         className: `${figFamily}__title`,
//         sys_pn: "window-name",
//         content: name || LOCALE.SETTINGS,
//         uiHandler: [ui],
//       }),
//       Skeletons.Button.Svg({
//         ico: _a.cross,
//         className: `${figFamily}__close`,
//         service: _e.close,
//         uiHandler: [ui],
//       }),
//     ],
//   });
// };

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
      require('./password').default(ui, _a.edit),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      require('./permission').default(ui, ui.permissionMode || _a.edit),
      Skeletons.Box.X({
        className: `${fig}__divider`,
      }),
      validity(ui, ui.validityMode || _a.view),
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

