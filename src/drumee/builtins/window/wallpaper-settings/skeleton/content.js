const { button } = require("../../../skeleton/toolkit/index");

function __skl_window_wallpaper_settings_content(_ui_, opt) {
  const contentFig = `${_ui_.fig.family}-content`;
  const fig = `${_ui_.fig.family}`;

  const uploader = Skeletons.Box.X({
    className: `${fig}__uploader`,
    sys_pn: "uploader",
    partHandler: [_ui_],
    kids: [
      Skeletons.Note({
        content: LOCALE.DROP_FILES_HERE || "Drop files here to upload",
        className: `${fig}__uploader-text`,
      }),
    ],
  });

  const imagesList = Skeletons.List.Smart({
    className: `${fig}__images-list`,
    debug: __filename,
    spinner: Skeletons.Note("", _a.spinner),
    minPage: 3,
    sys_pn: "roll-wallpaper",
    api: _ui_.getCurrentApi,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: KIND.media.preview,
      className: `${fig}__image`,
      service: "set-wallpaper",
      uiHandler: [_ui_],
      format: _a.card,
    },
  });

  const colorsWrapper = Skeletons.Box.X({
    className: `${fig}__colors-wrapper`,
    kidsOpt: { active: 0 },
    uiHandler: _ui_,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-gray`,
        service: "apply-bg-by-color",
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-red`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-pink`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-blue`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-green`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-yellow`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-wrapper item color-orange`,
      }),
    ],
  });

  const colors = Skeletons.Box.X({
    className: `${fig}__colors`,
    kidsOpt: { active: 0 },
    uiHandler: _ui_,
    kids: [
      Skeletons.Note({
        content: LOCALE.COLORS || "Colors",
        className: `${fig}__color colors-text`,
      }),
      colorsWrapper,
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    kidsOpt: { active: 0 },
    uiHandler: _ui_,
    kids: [
      button(_ui_, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "cancel-set-bg",
      }),
      button(_ui_, {
        label: LOCALE.APPLY,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "apply-new-bg",
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${contentFig}__footer`,
    kids: [colors, buttons],
  });

  let a = Skeletons.Box.Y({
    className: `${contentFig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__body-content`,
        kids: [uploader, imagesList],
      }),
      footer,
    ],
  });

  return a;
}

export default __skl_window_wallpaper_settings_content;
