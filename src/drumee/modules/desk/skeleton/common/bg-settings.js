const { button, colors } = require("../../toolkit");

export default function (ui, data) {
  const fig = `${ui.fig.family}-bg-settings`;

  const closeIcon = Skeletons.Box.X({
    className: `${fig}__close ${ui.fig.group}__close-button`,
    kids: [
      Skeletons.Button.Svg({
        ico: "account_cross",
        className: `${fig}__icon button-close`,
        service: "close-popup",
        uiHandler: ui,
      }),
    ],
  });

  let desc = Platform.get(_a.description) || {};
  const header = Skeletons.Box.X({
    className: `${fig}__wrapper header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__note title`,
        content: desc[Visitor.language()] || LOCALE.INTRO_POPUP_TITLE, //'Welcome to DrumeeOS'
      }),

      closeIcon,
    ],
  });

  const ulpoader = Skeletons.Box.X({
    className: `${fig}__uploader`,
    sys_pn: "desk-bg-uploader",
  });

  let { introImage } = Organization.get(_a.metadata);
  const imageWrapper = Skeletons.Box.X({
    className: `${fig}__item-wrapper image`,
    kids: [
      Skeletons.Element({
        className: `${fig}__image desk-image`,
        tagName: _K.tag.img,
        attrOpt: {
          src: introImage || "/-/images/subscription/plan-features-pic.gif",
          alt: "Drumee",
        },
      }),
    ],
  });

  const buttonWrapper = Skeletons.Box.X({
    className: `${fig}__buttons-wrapper`,
    service: "play-intro-video",
    uiHandler: ui,
    haptic: 2000,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico: "desktop_musicplay",
        className: `${fig}__icon video`,
      }),
    ],
  });

  const imagesList = Skeletons.List.Smart({
    className: `${fig}__images-list`,
    debug: __filename,
    spinner: Skeletons.Note("", _a.spinner),
    minPage: 3,
    sys_pn: "roll-wallpaper",
    api: ui._bgListApi,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: KIND.media.preview,
      className: `${fig}__image`,
      service: "set-wallpaper",
      uiHandler: [ui],
      format: _a.card,
    },
  });

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "cancel-set-bg",
      }),
      button(ui, {
        label: LOCALE.APPLY,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "apply-new-bg",
      }),
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${fig}__wrapper footer`,
    kids: [buttons],
  });

  const a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [header, ulpoader, imagesList, colors, footer],
  });

  return a;
}
