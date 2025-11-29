// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/modules/desk/skeleton/common/intro-popup.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_desk_common_intro_popup(_ui_, data) {
  const introPopupFig = `${_ui_.fig.family}-intro-popup`;

  const logoIcon = Skeletons.Box.X({
    className: `${introPopupFig}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico: "raw-logo-drumee-icon",
        className: `${introPopupFig}__icon logo`,
        service: "close-popup",
        uiHandler: _ui_,
      }),
    ],
  });

  const closeIcon = Skeletons.Box.X({
    className: `${introPopupFig}__close`,
    kids: [
      Skeletons.Button.Svg({
        ico: "account_cross",
        className: `${introPopupFig}__icon close account_cross`,
        service: "close-popup",
        uiHandler: _ui_,
      }),
    ],
  });

  let desc = Platform.get(_a.description) || {};
  const header = Skeletons.Box.X({
    className: `${introPopupFig}__wrapper header`,
    kids: [
      logoIcon,
      Skeletons.Note({
        className: `${introPopupFig}__note title`,
        content: desc[Visitor.language()] || LOCALE.INTRO_POPUP_TITLE, //'Welcome to DrumeeOS'
      }),

      closeIcon,
    ],
  });

  const subTitle = Skeletons.Box.X({
    className: `${introPopupFig}__wrapper sub-title`,
    kids: [
      Skeletons.Note({
        className: `${introPopupFig}__note sub-title`,
        content: LOCALE.INTRO_POPUP_SUB_TITLE, //'To have a quick start, you can watch this short video to understand how Drumee OS works!'
      }),
    ],
  });

  let { introImage } = Organization.get(_a.metadata);
  const imageWrapper = Skeletons.Box.X({
    className: `${introPopupFig}__item-wrapper image`,
    kids: [
      Skeletons.Element({
        className: `${introPopupFig}__image desk-image`,
        tagName: _K.tag.img,
        attrOpt: {
          src: introImage || "/-/images/subscription/plan-features-pic.gif",
          alt: "Drumee",
        },
      }),
    ],
  });

  const buttonWrapper = Skeletons.Box.X({
    className: `${introPopupFig}__buttons-wrapper`,
    service: "play-intro-video",
    uiHandler: _ui_,
    haptic: 2000,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico: "desktop_musicplay",
        className: `${introPopupFig}__icon video`,
      }),
    ],
  });

  const content = Skeletons.Box.X({
    className: `${introPopupFig}__wrapper content`,
    kids: [imageWrapper, buttonWrapper],
  });

  const checkboxWrapper = Skeletons.Box.X({
    className: `${introPopupFig}__wrapper checkbox`,
    kidsOpt: { active: 0 },
    // service: "skip-intro-popup",
    uiHandler: _ui_,
    state: 0,
    kids: [
      Skeletons.Button.Svg({
        className: `${introPopupFig}__icon checkbox`,
        ico: "checkbox",
        state: 0,
        sys_pn: "checkbox",
      }),
      Skeletons.Note({
        className: `${introPopupFig}__note footer`,
        content: LOCALE.INTRO_POPUP_SKIP_VIDEO,
      }),
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${introPopupFig}__wrapper footer`,
    kids: [checkboxWrapper],
  });

  const a = Skeletons.Box.Y({
    className: `${introPopupFig}__main`,
    debug: __filename,
    kids: [header, subTitle, content, footer],
  });

  return a;
}

export default __skl_desk_common_intro_popup;
