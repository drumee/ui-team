/**
 * "Enterprise & custom plans" contact card — the page's one sales-led exit.
 *
 * Replaces the run-on line this footer used to render ("Enterprise: Custom
 * pricing for your team size. Contact: contact@drumee.org"), which was built
 * from nested Box.X rows carrying generic leaked class names (`item`,
 * `content`), spaced with margin hacks and a leading space inside the label,
 * and ended in an underlined mailto that read as a legal footnote rather than
 * an offer. Everything above it on this page is a card with a pill CTA; this
 * is now one too — icon, title, one line of copy, the address kept visible
 * and copyable, and a real button.
 *
 * The button posts "contact-sales" rather than carrying its own mailto href:
 * settings_billing._openSalesMail already writes the subject line and, on a
 * machine with no mail client (where a mailto silently does nothing), falls
 * back to showing the address. A raw href would have neither.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function contactCard(ui) {
  const fig = `${ui.fig.family}__contact`;
  const email = LOCALE.SALES_CONTACT_EMAIL || "contact@drumee.org";

  return Skeletons.Box.X({
    className: `${fig}-card${ui._motionClass()}`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}-icon`,
        kids: [Skeletons.Image.Svg({ ico: "email", className: `${fig}-icon-svg` })],
      }),
      Skeletons.Box.Y({
        className: `${fig}-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}-title`,
            content: LOCALE.FOOTER_ENTERPRISE_TITLE,
          }),
          Skeletons.Note({
            className: `${fig}-desc`,
            content: LOCALE.FOOTER_ENTERPRISE_DESC,
          }),
          // Kept as a real mailto link, not decoration: someone who wants to
          // write from another client copies the address from here.
          Skeletons.Note({
            className: `${fig}-mail`,
            content: email,
            tagName: _K.tag.a,
            attrOpt: { href: `mailto:${email}` },
          }),
        ],
      }),
      Skeletons.Note({
        className: `${fig}-cta`,
        content: LOCALE.CONTACT_SALES,
        service: "contact-sales",
        uiHandler: [ui],
        bubble: false,
      }),
    ],
  });
}

/**
 * Billing footer. Where the "Additional seat pricing" heading used to sit
 * (removed 2026-07-29 — seats are flat caps since the pricing rebuild, so
 * there is no seat pricing to explain), a subscriber gets the "Manage
 * billing" button instead: the Stripe portal entry, boxed like the banner's
 * Resume CTA. Only with a real Stripe subscription — the portal needs a
 * customer id, and payment.portal answers NO_CUSTOMER without one.
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function billing_footer(ui) {
  const fig = `${ui.fig.family}__footer`;

  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      ui._hasPaidSub
        ? Skeletons.Note({
            className: `${fig}-manage-billing`,
            content: LOCALE.MANAGE_BILLING || "Manage billing",
            service: "manage-billing",
            uiHandler: [ui],
            bubble: false,
          })
        : null,
      contactCard(ui),
    ].filter(Boolean),
  });
}

export default billing_footer;
