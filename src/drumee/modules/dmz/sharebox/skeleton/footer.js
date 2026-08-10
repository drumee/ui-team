function __skl_dmz_sharebox_footer(_ui_) {
  const footerFig = `${_ui_.fig.family}-footer`;

  // Gate variant (Figma): while the recipient is still on the email/password
  // gate, the bottom banner reads "Create your sovereign workspace with Drumee"
  // with a "Sign up free" button — DISTINCT from the post-unlock landing banner
  // ("Shared via Drumee — Get your own workspace →" + "Join 2,000+ creators").
  // It reuses the same footer element classes so the purple-bar styling applies.
  if (_ui_.mget("_gate_footer")) {
    // Gate banner — pixel-matched to Figma "Sticky Bottom Conversion Banner"
    // (node 1648:96669): a purple vertical-gradient pill bar (#847eff→#433cc5,
    // radius 24) with the full-color Drumee cloud raised above its left edge, a
    // large white headline, and a white pill "Sign up free" button with dark
    // text. The cloud comes from the RAW sprite — the normalized pipeline strips
    // per-path fills + the drop-shadow filter, collapsing the two-color cloud to
    // a dark blob. Uses dedicated __gate-* classes so the post-unlock landing
    // footer (the other branch below) keeps its own styling.
    const gateLogo = Skeletons.Button.Svg({
      ico: "raw-app-logo-footer",
      className: `${footerFig}__gate-logo`,
    });

    const gateHeadline = Skeletons.Note({
      className: `${footerFig}__gate-headline`,
      content: LOCALE.SECURE_SHARE_GATE_FOOTER_HEADLINE,
    });

    const gateSignupButton = Skeletons.Box.X({
      className: `${footerFig}__gate-signup-btn`,
      sys_pn: "button-wrapper",
      service: "open-signup",
      uiHandler: _ui_,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Note({
          className: `${footerFig}__gate-signup-label`,
          content: LOCALE.SECURE_SHARE_GATE_FOOTER_CTA,
        }),
      ],
    });

    const gateBanner = Skeletons.Box.X({
      className: `${footerFig}__gate-banner`,
      debug: __filename,
      kids: [gateLogo, gateHeadline, gateSignupButton],
    });

    return Skeletons.Box.X({
      className: `${footerFig}__main ${footerFig}__gate-main`,
      kids: [gateBanner],
    });
  }

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

  // The banner CTA is the SAME white pill in both auth states — only its
  // destination and its label differ, so it is built once and branched on those
  // two values (identical classNames ⇒ no skin change, pixel-identical button).
  //   anonymous  → "open-signup" : pitch the account (unchanged behaviour).
  //   logged-in  → "go-to-desk"  : they already have an account, so send them to
  //                                their OWN Drumee desk instead of a signup page.
  // `is_authenticated` is the server's flag (dmz.js), set ONLY when the viewer's
  // own regsid resolves to a real account and captured BEFORE the creator
  // cookie_touch rebind. Never derive identity here from `uid === creator_id` —
  // that is also true for an anonymous viewer on a public link.
  // The two labels are deliberately SEPARATE keys: SIGNUP_FOR_FREE_CTA is the
  // temporary campaign string (English-only "See more", reverting to "Sign Up
  // Free" when the campaign ends), so reusing it here would mislabel the desk
  // button in every other language and break outright at the revert.
  const isAuthenticated = !!_ui_.mget("is_authenticated");

  const ctaButton = Skeletons.Box.X({
    className: `${footerFig}__signup-btn`,
    sys_pn: "button-wrapper",
    service: isAuthenticated ? "go-to-desk" : "open-signup",
    uiHandler: _ui_,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${footerFig}__signup-label`,
        content: isAuthenticated
          ? LOCALE.SECURE_SHARE_GO_TO_MY_DESK
          : LOCALE.SIGNUP_FOR_FREE_CTA || "Sign Up Free",
      }),
    ],
  });

  const right = Skeletons.Box.X({
    className: `${footerFig}__right`,
    kids: [subline, ctaButton].filter(Boolean),
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
