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

/**
 * The support account's avatar: the headset glyph on a brand-coloured tile
 * (Figma 58186-204873), used everywhere the account is shown — the inbox row
 * and the chat header.
 *
 * Support is not a person, and rendering it through UserProfile gave it
 * auto-coloured initials that read as one: an ordinary contact among the
 * user's ordinary contacts. A fixed mark says "this is the product" at a
 * glance, and stays identical for every user in every install.
 *
 * @param {String} className  BEM class for the tile, prefixed by the caller
 * @returns Skeleton
 */
function supportAvatar(className) {
  return Skeletons.Box.X({
    className,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({
        ico: "ph-headset",
        className: `${className}-ico`,
      }),
    ],
  });
}

module.exports = { openSupportMail, supportAvatar };
