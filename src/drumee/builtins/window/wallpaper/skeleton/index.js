const { button } = require('../../../skeleton/toolkit/index');

export default function (ui, data) {
  const fig = `${ui.fig.family}`;

  const header = require('./top-bar')(ui, 'Customize Background');
  // Skeletons.Box.X({
  //   className: `${fig}__wrapper header`,
  //   kids: [
  //     Skeletons.Note({
  //       className: `${fig}__note title`,
  //       content: desc[Visitor.language()] || LOCALE.INTRO_POPUP_TITLE, //'Welcome to DrumeeOS'
  //     }),

  //     closeIcon,
  //   ],
  // });

  const ulpoader = Skeletons.Box.X({
    className: `${fig}__uploader`,
    sys_pn: "uploader",
  });


  const imagesList = Skeletons.List.Smart({
    className: `${fig}__images-list`,
    debug: __filename,
    spinner: Skeletons.Note('', _a.spinner),
    minPage: 3,
    sys_pn: 'roll-wallpaper',
    api: ui.getCurrentApi,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: KIND.media.preview,
      className: `${fig}__image`,
      service: 'set-wallpaper',
      uiHandler: [ui],
      format: _a.card
    }
  });

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle, className: `${fig}__button`, service: "cancel-set-bg"
      }),
      button(ui, {
        label: LOCALE.APPLY,
        type: _a.toggle, className: `${fig}__button`, service: "apply-new-bg"
      })
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${fig}__wrapper footer`,
    kids: [
      buttons,
    ],
  });

  const a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [header, ulpoader, imagesList, footer],
  });
  console.log("SKELETON WALLPAPER:", a);
  return a;
}

