/**
 * Create footer item with title, content and email link (if available)
 * @param {Object} ui - UI instance
 * @param {string} title - Item title
 * @param {string} content - Item content
 * @param {string} email - Email address (optional)
 * @returns {Object} Skeletons component
 */
function item(ui, title, content, email) {
  const fig = `${ui.fig.family}__footer`;

  let emailItem = "";
  if (email) {
    emailItem = Skeletons.Box.X({
      className: `${fig} item`,
      kids: [
        Skeletons.Note({
          className: `${fig}-email-title`,
          content: ` ${LOCALE.CONTACT}: `,
        }),
        Skeletons.Note({
          className: `${fig}-email`,
          content: email,
          tagName: _K.tag.a,
          attrOpt: {
            href: `mailto:${email}`,
          },
        }),
      ],
    });
  }

  return Skeletons.Box.X({
    className: `${fig} item`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: title,
      }),
      Skeletons.Box.X({
        className: `${fig} content`,
        kids: [
          Skeletons.Note({
            content: content,
          }),
          emailItem,
        ],
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
      item(
        ui,
        `${LOCALE.ENTERPRISE}:`,
        LOCALE.FOOTER_ENTERPRISE_DESC,
        LOCALE.SALES_CONTACT_EMAIL || "contact@drumee.org"
      ),
    ].filter(Boolean),
  });
}

export default billing_footer;
