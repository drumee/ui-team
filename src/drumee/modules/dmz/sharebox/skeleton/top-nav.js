// Public marketing site — the share page links out to drumee.com, not the
// Drumee instance domain the share link is served from.
const DRUMEE_SITE = "https://drumee.com/";

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

  // Figma top-nav has three items (Product / Features / Pricing); all point to
  // the public marketing site root (drumee.com).
  const links = Skeletons.Box.X({
    className: `${navFig}__links`,
    kids: [
      navLink(LOCALE.PRODUCT || "Product", DRUMEE_SITE),
      navLink(LOCALE.FEATURES || "Features", DRUMEE_SITE),
      navLink(LOCALE.PRICING || "Pricing", DRUMEE_SITE),
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

  // Authenticated recipients already have an account — show their own identity
  // (avatar + name) instead of the guest Login / Join CTA. The recipient's profile
  // is resolved server-side and carried on the dmz login response (`profile`).
  let actions;
  if (_ui_.mget("is_authenticated")) {
    let prof = _ui_.mget("profile");
    if (typeof prof === "string") {
      try { prof = JSON.parse(prof); } catch (e) { prof = {}; }
    }
    prof = prof || {};
    const label =
      [prof.firstname, prof.lastname].filter(Boolean).join(" ").trim() ||
      prof.email ||
      _ui_.mget("recipient_email") ||
      "";
    actions = Skeletons.Box.X({
      className: `${navFig}__account`,
      kids: [
        Skeletons.Avatar("default", `${navFig}__account-avatar`, label),
        Skeletons.Note({ className: `${navFig}__account-label`, content: label }),
      ],
    });
  } else {
    actions = Skeletons.Box.X({
      className: `${navFig}__actions`,
      kids: [loginBtn, joinBtn],
    });
  }

  return Skeletons.Box.X({
    className: `${navFig}__container`,
    debug: __filename,
    kids: [logo, links, actions],
  });
}

export default __skl_dmz_sharebox_top_nav;
