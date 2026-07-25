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
 * Create billing footer with additional seat pricing information
 * @param {Object} ui - UI instance
 * @returns {Object} Skeletons component
 */
function billing_footer(ui) {
  const fig = `${ui.fig.family}__footer`;

  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      Skeletons.Note({
        className: `${fig}-header`,
        content: LOCALE.ADDITIONAL_SEAT_PRICING,
      }),
      item(
        ui,
        `${LOCALE.ENTERPRISE}:`,
        LOCALE.FOOTER_ENTERPRISE_DESC,
        LOCALE.SALES_CONTACT_EMAIL || "contact@drumee.org"
      ),
    ],
  });
}

export default billing_footer;
