/**
 * Body of the "Contact sales" dialog — the sales-led plans' CTA (Sovereign)
 * and the footer's Enterprise card both open it via _openSalesMail.
 *
 * It exists because a bare mailto could dead-end. On Windows a mailto with no
 * default mail app raises the OS "How do you want to open this?" picker, which
 * lists Chrome and Edge next to Outlook. Picking a browser only opens an empty
 * window unless that browser has a web mail registered as its mailto handler,
 * and nothing in the page can tell — the window lost focus, so it looked like
 * the hand-off worked. Gmail and Outlook.com are reached by their own compose
 * URLs instead, so they work whatever the OS has set up, and the address is on
 * screen to copy for anything else.
 *
 * Rendered inside window_info (the "notice" variant), outside this widget's
 * DOM, so every option carries `uiHandler: [ui]` to route its click back to
 * settings_billing, which owns the handlers.
 *
 * @param {Object} ui - settings_billing instance
 * @param {Object} mail - { to, subject }
 * @returns {Array} skeletons fed as the dialog's message
 */
function salesMailBody(ui, mail) {
  const fig = `${ui.fig.family}__sales-mail`;
  const option = (label, service, extra = {}) =>
    Skeletons.Note({
      className: `${fig}-option`,
      content: label,
      service,
      uiHandler: [ui],
      bubble: false,
      ...extra,
    });

  return [
    Skeletons.Box.Y({
      className: `${fig}-main`,
      kids: [
        Skeletons.Note({
          className: `${fig}-title`,
          content: LOCALE.SALES_MAIL_TITLE || "Contact our sales team",
        }),
        Skeletons.Note({
          className: `${fig}-text`,
          content: LOCALE.SALES_MAIL_TEXT || "Write to us at this address:",
        }),
        Skeletons.Note({
          className: `${fig}-address`,
          content: mail.to,
        }),
        Skeletons.Box.Y({
          className: `${fig}-options`,
          kids: [
            option(LOCALE.SALES_MAIL_GMAIL || "Open in Gmail", "sales-mail-gmail"),
            option(LOCALE.SALES_MAIL_OUTLOOK || "Open in Outlook.com", "sales-mail-outlook"),
            option(LOCALE.SALES_MAIL_APP || "Open my email app", "sales-mail-app"),
            option(LOCALE.SALES_MAIL_COPY || "Copy email address", "sales-mail-copy", {
              sys_pn: "sales-mail-copy",
            }),
          ],
        }),
      ],
    }),
  ];
}

module.exports = { salesMailBody };
