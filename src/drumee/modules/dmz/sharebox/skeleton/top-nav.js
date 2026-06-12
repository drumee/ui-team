// Public marketing site — the share page links out to drumee.com, not the
// Drumee instance domain the share link is served from.
const DRUMEE_SITE = "https://drumee.com";

function __skl_dmz_sharebox_top_nav(_ui_) {
  const navFig = `${_ui_.fig.family}-top-nav`;

  const logo = Skeletons.Box.X({
    className: `${navFig}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico: "raw-logo-drumee-full",
        className: `${navFig}__logo-icon`,
      }),
    ],
  });

  const navLink = (label, href) =>
    Skeletons.Box.X({
      className: `${navFig}__link`,
      href,
      attrOpt: { target: "_blank" },
      kids: [
        Skeletons.Note({
          className: `${navFig}__link-label`,
          content: label,
        }),
      ],
    });

  // Figma nav: Product / Features / Pricing — all linking out to drumee.com.
  const links = Skeletons.Box.X({
    className: `${navFig}__links`,
    kids: [
      navLink(LOCALE.PRODUCT || "Product", DRUMEE_SITE),
      navLink(LOCALE.FEATURES || "Features", `${DRUMEE_SITE}/features`),
      navLink(LOCALE.PRICING || "Pricing", `${DRUMEE_SITE}/pricing`),
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
        content: LOCALE.SECURE_SHARE_NAV_LOGIN,
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
