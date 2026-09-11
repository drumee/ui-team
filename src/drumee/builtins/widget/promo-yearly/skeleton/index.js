/**
 * The campaign modal (Figma 696-141463): badge pill, headline, live countdown,
 * hero illustration, CTA, legal footer, close X.
 */

/**
 * The countdown's text node.
 *
 * Exported because the widget re-feeds it once a second: one definition means
 * the class and the formatting cannot drift between the first render and every
 * render after it.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function countdownNote(ui) {
  return Skeletons.Note({
    className: `${ui.fig.family}__countdown-value`,
    content: ui.countdownText(),
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const hero = require("assets/promo-yearly-hero.png");

  return Skeletons.Box.X({
    className: `${pfx}__backdrop`,
    // Click-outside closes, like every other dismissible surface on the desk.
    service: "promo-yearly-close",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__card`,
        // The card swallows the click so picking up text inside it does not
        // dismiss the modal the backdrop behind it would.
        bubble: false,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: "cross",
            service: "promo-yearly-close",
            uiHandler: [ui],
            bubble: false,
          }),

          Skeletons.Box.X({
            className: `${pfx}__badge`,
            kids: [
              Skeletons.Image.Svg({ ico: "promo-bolt", className: `${pfx}__badge-icon` }),
              Skeletons.Note({
                className: `${pfx}__badge-text`,
                content: (LOCALE.PROMO_YEARLY_BADGE || "LIMITED-TIME {0}% OFF")
                  .format(ui.pct()),
              }),
            ],
          }),

          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.PROMO_YEARLY_TITLE
              || "Premium users get more with our yearly plan",
          }),

          Skeletons.Box.X({
            className: `${pfx}__countdown`,
            kids: [
              Skeletons.Image.Svg({ ico: "alarm", className: `${pfx}__countdown-icon` }),
              Skeletons.Note({
                className: `${pfx}__countdown-label`,
                content: LOCALE.PROMO_YEARLY_TIME_REMAINING || "Time remaining:",
              }),
              // A CONTAINER, not the text itself: the widget re-feeds this box
              // once a second (see _startCountdown), so it has to be the
              // stable part while the note inside it is replaced.
              Skeletons.Box.X({
                className: `${pfx}__countdown-slot`,
                sys_pn: `${pfx}__countdown`,
                partHandler: ui,
                kids: [countdownNote(ui)],
              }),
            ],
          }),

          // Decorative: the badge and the headline above already carry the
          // offer, so an alt would only repeat it to a screen reader.
          Skeletons.Element({
            tagName: "img",
            className: `${pfx}__hero`,
            // `.default` because this comes through webpack's asset loader.
            attribute: { src: hero?.default ?? hero, alt: "" },
          }),

          Skeletons.Note({
            className: `${pfx}__cta`,
            content: (LOCALE.PROMO_YEARLY_CTA || "Get {0}% OFF").format(ui.pct()),
            service: "promo-yearly-cta",
            uiHandler: [ui],
            bubble: false,
          }),

          // The product's legal pages are in-app routes, not external URLs —
          // #/welcome/privacy and #/welcome/terms, the same two the sign-in
          // footer opens. Routed through a service so the widget can open
          // them in a NEW TAB: following the hash in place would swap the
          // desk out for the welcome module and take the billing page with
          // it, from a modal the reader only meant to glance at.
          //
          // Wording is the product's own (LOCALE.PRIVACY_POLICY /
          // TERMS_OF_SERVICE), not the design's "Terms of Use" — these name
          // specific documents, and the app already calls them that
          // everywhere else. NOT LOCALE.TERM_OF_SERVICE: that one is stored
          // pre-uppercased ("TERM OF SERVICE") for the sign-in footer, which
          // upper-cases its links anyway, and it shouts next to "Privacy
          // policy" here.
          Skeletons.Box.X({
            className: `${pfx}__legal`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__legal-link`,
                content: LOCALE.PRIVACY_POLICY || "Privacy policy",
                service: "promo-yearly-privacy",
                uiHandler: [ui],
                bubble: false,
              }),
              Skeletons.Note({ className: `${pfx}__legal-sep`, content: "&" }),
              Skeletons.Note({
                className: `${pfx}__legal-link`,
                content: LOCALE.TERMS_OF_SERVICE || "Terms of service",
                service: "promo-yearly-terms",
                uiHandler: [ui],
                bubble: false,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

module.exports.countdownNote = countdownNote;
