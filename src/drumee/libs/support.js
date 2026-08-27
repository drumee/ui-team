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

/** The Drumee mark, in the raw sprite (`icons/src/raw/logo-drumee-icon.svg`). */
const SUPPORT_ICO = "raw-logo-drumee-icon";

/**
 * The account that answers Contact Support, or null when none is configured.
 *
 * Desk resolves it once at startup. Guarded because the skeletons below also
 * render in windows that mount before (or without) the desk.
 */
function supportContactId() {
  return typeof Desk !== "undefined" && _.isFunction(Desk.supportContactId)
    ? Desk.supportContactId()
    : null;
}

/**
 * Whether an entity id is the support account.
 * @param {String} id
 */
function isSupportEntity(id) {
  const supportId = supportContactId();
  return !!supportId && !!id && id === supportId;
}

/**
 * The support account's avatar: the Drumee mark, used everywhere the account
 * is shown — the inbox row, the chat header, and its message bubbles.
 *
 * Support is not a person, and rendering it through UserProfile gave it
 * auto-coloured initials that read as one: an ordinary contact among the
 * user's ordinary contacts. Worse, the account has no photo, so the initials
 * fell back to its username and drew a bare "S". The product's own mark says
 * "this is Drumee" at a glance, and stays identical in every install.
 *
 * The mark carries its own colour and needs no tile behind it.
 *
 * @param {String} className  BEM class for the avatar, prefixed by the caller
 * @returns Skeleton
 */
function supportAvatar(className) {
  return Skeletons.Box.X({
    className,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({
        ico: SUPPORT_ICO,
        className: `${className}-ico`,
      }),
    ],
  });
}

/**
 * The same mark as raw markup, for the message list.
 *
 * chat-item builds its rows from HTML template modules and fills the avatar
 * imperatively, so it has no skeleton to hand `supportAvatar()` to. Mirrors
 * what Skeletons.Image.Svg emits, so both paths reference one sprite symbol.
 *
 * @param {String} className
 * @returns {String} svg markup
 */
function supportMarkup(className) {
  return (
    `<svg class="${className}">` +
    `<use xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `xlink:href="#--icon-${SUPPORT_ICO}"></use>` +
    `</svg>`
  );
}

module.exports = {
  openSupportMail,
  supportAvatar,
  supportMarkup,
  supportContactId,
  isSupportEntity,
};
