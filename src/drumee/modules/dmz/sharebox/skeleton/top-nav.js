function __skl_dmz_sharebox_top_nav(_ui_) {
  const navFig = `${_ui_.fig.family}-top-nav`;
  const { protocol } = bootstrap();
  const mainDomain = Host.get("main_domain");

  const logo = Skeletons.Box.X({
    className: `${navFig}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico: "raw-logo-drumee-full",
        className: `${navFig}__logo-icon`,
      }),
    ],
  });

  const navLink = (label) =>
    Skeletons.Box.X({
      className: `${navFig}__link`,
      kids: [
        Skeletons.Note({
          className: `${navFig}__link-label`,
          content: label,
        }),
      ],
    });

  const links = Skeletons.Box.X({
    className: `${navFig}__links`,
    kids: [
      Skeletons.Box.X({
        className: `${navFig}__link`,
        href: `${protocol}://${mainDomain}`,
        attrOpt: { target: "_blank" },
        kids: [
          Skeletons.Note({
            className: `${navFig}__link-label`,
            content: LOCALE.PRODUCT || "Product",
          }),
        ],
      }),
      navLink(LOCALE.FEATURES || "Features"),
      navLink(LOCALE.PRICING || "Pricing"),
    ],
  });

  const loginBtn = Skeletons.Box.X({
    className: `${navFig}__login-btn`,
    service: "go-login",
    uiHandler: _ui_,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${navFig}__login-label`,
        content: LOCALE.SIGN_IN,
      }),
    ],
  });

  const joinBtn = Skeletons.Box.X({
    className: `${navFig}__join-btn`,
    service: "open-signup",
    uiHandler: _ui_,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${navFig}__join-label`,
        content: LOCALE.JOIN_WORKSPACE || "Join Workspace",
      }),
    ],
  });

  const actions = Skeletons.Box.X({
    className: `${navFig}__actions`,
    kids: [loginBtn, joinBtn],
  });

  return Skeletons.Box.X({
    className: `${navFig}__container`,
    debug: __filename,
    kids: [logo, links, actions],
  });
}

export default __skl_dmz_sharebox_top_nav;
