function __skl_dmz_sharebox_footer(_ui_) {
  const footerFig = `${_ui_.fig.family}-footer`;

  // Gate variant (Figma): while the recipient is still on the email/password
  // gate, the bottom banner reads "Create your sovereign workspace with Drumee"
  // with a "Sign up free" button — DISTINCT from the post-unlock landing banner
  // ("Shared via Drumee — Get your own workspace →" + "Join 2,000+ creators").
  // It reuses the same footer element classes so the purple-bar styling applies.
  if (_ui_.mget("_gate_footer")) {
    const gateIcon = Skeletons.Box.X({
      className: `${footerFig}__icon-tile`,
      kids: [
        Skeletons.Button.Svg({
          ico: "raw-logo-drumee-icon",
          className: `${footerFig}__icon`,
        }),
      ],
    });

    const gateHeadline = Skeletons.Note({
      className: `${footerFig}__headline`,
      content: LOCALE.SECURE_SHARE_GATE_FOOTER_HEADLINE,
    });

    const gateLeft = Skeletons.Box.X({
      className: `${footerFig}__left`,
      kids: [gateIcon, gateHeadline],
    });

    const gateSignupButton = Skeletons.Box.X({
      className: `${footerFig}__signup-btn`,
      sys_pn: "button-wrapper",
      service: "open-signup",
      uiHandler: _ui_,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Note({
          className: `${footerFig}__signup-label`,
          content: LOCALE.SECURE_SHARE_GATE_FOOTER_CTA,
        }),
      ],
    });

    const gateRight = Skeletons.Box.X({
      className: `${footerFig}__right`,
      kids: [gateSignupButton],
    });

    const gateBanner = Skeletons.Box.X({
      className: `${footerFig}__banner`,
      debug: __filename,
      kids: [gateLeft, gateRight],
    });

    return Skeletons.Box.X({
      className: `${footerFig}__main`,
      kids: [gateBanner],
    });
  }

  const lightningIcon = Skeletons.Box.X({
    className: `${footerFig}__icon-tile`,
    kids: [
      Skeletons.Button.Svg({
        // Figma footer uses a white lightning bolt. Normalized icon (currentColor)
        // so the footer's `fill:#fff` recolours it — a raw icon (e.g. the old
        // raw-share) has a hardcoded fill that can't be recoloured → wrong colour.
        ico: "lightning",
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
