// "You are now connected" card, shown by the desk after a contact invitation
// is accepted from its email link (desk _maybeRedeemContactInvite /
// _maybeAcceptContactInvite).
//
// It wears the real-time chat toast's shell — the `panel-activity-toast`
// classes, styled from Figma in skin/index.scss — so the two read as one
// family: avatar with a badge, name, one line, "Just now", and a primary
// action. It replaced the copy-link acknowledgement (mascot + caption) that
// was borrowed for this at first and looked out of place.
//
// Deliberately NOT routed through chat-toast.js's mountCard/bindCardClicks:
// that file keeps its own single-card state on the activity panel and its
// comments rule out re-plumbing it. This card is one-shot and owns its timer.
// The capture-phase click delegate is required for the same reason given
// there: ui-core binds every widget's own onclick and stops propagation.

const CONTACT_TOAST_MS = 10000;

const esc = (v = "") => _.escape(String(v));

let current = null;
let timer = null;

function kill() {
  if (timer) clearTimeout(timer);
  timer = null;
  const t = current;
  current = null;
  // destroy() + DOM removal, exactly as killChatToast: goodbye() is a no-op
  // for a view appended straight to a layer (measured there, and again here —
  // the card stayed connected after close).
  try {
    if (t && (!t.isDestroyed || !t.isDestroyed())) {
      const node = t.el;
      if (t.destroy) t.destroy();
      else if (t.remove) t.remove();
      if (node && node.isConnected && node.remove) node.remove();
    }
  } catch (e) {
    /* already gone */
  }
}

/**
 * @param {Object} peer
 * @param {String} peer.id        the new contact's account id
 * @param {String} peer.fullname  display name
 * @param {Function} [onMessage]  opens the 1:1 chat; the button is left out
 *                                when not given
 * @returns {Boolean} whether the card was shown (false → caller falls back)
 */
function showContactConnectedToast(peer = {}, onMessage) {
  // The acknowledgement layer, not Wm.windowsLayer: an open workspace window
  // sits in a sibling layer one z-index above windowsLayer (50001 vs 50000),
  // so a card appended there was drawn UNDER the workspace's chat panel —
  // measured on drumee.in, elementFromPoint at the card's centre hit
  // window__ft-bar-card. The ack layer is what Wm.acknowledge uses and stays
  // on top.
  const layer = typeof Wm !== "undefined" && Wm
    && ((Wm._acknowledgeHost && Wm._acknowledgeHost()) || Wm.windowsLayer);
  if (!layer || !layer.append || !peer.fullname) return false;
  kill();

  const pfx = "panel-activity-toast";
  const name = String(peer.fullname);
  const card = Skeletons.Box.Y({
    className: `${pfx} ${pfx}--contact`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__avatar-wrap`,
            kids: [
              Skeletons.Avatar(
                (peer.id && Visitor.avatar && Visitor.avatar(peer.id)) || "default",
                `${pfx}__avatar`,
                name,
              ),
              Skeletons.Box.X({
                className: `${pfx}__badge`,
                kids: [Skeletons.Image.Svg({ ico: "noti-check-circle" })],
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__body`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__title-row`,
                kids: [Skeletons.Note({ className: `${pfx}__sender`, content: esc(name) })],
              }),
              Skeletons.Note({
                className: `${pfx}__message`,
                content: esc(LOCALE.CONTACT_CONNECTED_SAY_HELLO),
              }),
              Skeletons.Note({ className: `${pfx}__time`, content: LOCALE.JUST_NOW }),
            ],
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: _a.cross,
            tooltips: LOCALE.CLOSE,
          }),
        ],
      }),
      onMessage
        ? Skeletons.Box.X({
          className: `${pfx}__actions`,
          // A Note, not a Button — see chat-toast.js: an active widget in the
          // click path eats the click before the delegate sees it.
          kids: [Skeletons.Note({ className: `${pfx}__open`, content: LOCALE.MESSAGE })],
        })
        : null,
    ].filter(Boolean),
  });

  const toast = layer.append(card);
  if (!toast || !toast.el) return false;
  current = toast;
  timer = setTimeout(kill, CONTACT_TOAST_MS);
  toast.el.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest(`.${pfx}__open`)) {
        e.stopPropagation();
        kill();
        try {
          onMessage && onMessage();
        } catch (err) {
          /* the contact is connected either way */
        }
        return;
      }
      if (t.closest(`.${pfx}__close`)) {
        e.stopPropagation();
        kill();
      }
    },
    true,
  );
  return true;
}

module.exports = { showContactConnectedToast, CONTACT_TOAST_MS };
