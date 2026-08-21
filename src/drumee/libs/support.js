/**
 * Contact Support helpers shared by the Get help screen (which offers the
 * entry point) and the desk (which owns the chat panel it opens).
 */

/**
 * Open the user's mail client on a support request.
 *
 * The fallback whenever a live conversation is not available: no support
 * account configured, the configured one deleted, or the lookup failed. Both
 * the address and the subject are LOCALE-configured so a self-hosted install
 * can point them at its own channel — same approach as SALES_CONTACT_EMAIL in
 * settings_billing.
 *
 * location.assign, not window.open: a popup blocker silently swallows the
 * latter (see settings_billing._openSalesMail).
 */
function openSupportMail() {
  const to = LOCALE.HELP_SUPPORT_EMAIL || "contact@drumee.org";
  const subject = LOCALE.HELP_SUPPORT_MAIL_SUBJECT || "Drumee support request";
  window.location.assign(`mailto:${to}?subject=${encodeURIComponent(subject)}`);
}

module.exports = { openSupportMail };
