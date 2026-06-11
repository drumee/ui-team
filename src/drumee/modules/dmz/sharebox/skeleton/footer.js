function __skl_dmz_sharebox_footer(_ui_) {
  const footerFig = `${_ui_.fig.family}-footer`;

  const lightningIcon = Skeletons.Box.X({
    className: `${footerFig}__icon-tile`,
    kids: [
      Skeletons.Button.Svg({
        ico: "app-lightning",
        className: `${footerFig}__icon`,
      }),
    ],
  });

  const headline = Skeletons.Note({
    className: `${footerFig}__headline`,
    content:
      LOCALE.DMZ_SHAREBOX_BANNER_HEADLINE ||
      "Shared via Drumee — Get your own workspace →",
  });

  const left = Skeletons.Box.X({
    className: `${footerFig}__left`,
    kids: [lightningIcon, headline],
  });

  const subline = Skeletons.Note({
    className: `${footerFig}__subline`,
    content:
      LOCALE.DMZ_SHAREBOX_BANNER_SUBLINE ||
      "Join 2,000+ creators curating their best work.",
  });

  const signupButton = Skeletons.Box.X({
    className: `${footerFig}__signup-btn`,
    sys_pn: "button-wrapper",
    service: "open-signup",
    uiHandler: _ui_,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${footerFig}__signup-label`,
        content: LOCALE.SIGNUP_FOR_FREE_CTA || "Sign Up Free",
      }),
    ],
  });

  const right = Skeletons.Box.X({
    className: `${footerFig}__right`,
    kids: [subline, signupButton],
  });

  const banner = Skeletons.Box.X({
    className: `${footerFig}__banner`,
    debug: __filename,
    kids: [left, right],
  });

  return Skeletons.Box.X({
    className: `${footerFig}__main`,
    kids: [banner],
  });
}

export default __skl_dmz_sharebox_footer;
