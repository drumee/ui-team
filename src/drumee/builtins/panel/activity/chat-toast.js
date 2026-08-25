// Real-time chat toast — Round 3 Phase 2, the CHAT half.
//
// Figma is the source of truth here, not the Round 3 prototype: the
// prototype's "same 320px shell as the meeting popup, only icon and copy
// swapped" idea is dead. This is the "folder chat notification - toast" frame
// (58205:10785) → wrapper `toast` 58208:83649 → card `call-pop-up`
// 58208:83650 in file MVL1Q9puypsTAJXvx9whCa, pulled node-by-node rather than
// eyeballed:
//
//   wrapper   x 1360, y 52 in a 1920x1080 frame, padding 24
//             ⇒ the card sits 24px from the right edge and 76px from the top
//   card      512 wide, padding 24, gap 24, radius 12, white,
//             shadow 0 40 80 rgba(0,0,0,.15) + 0 7 10 rgba(0,0,0,.05),
//             backdrop-filter blur(50px)
//   head row  gap 24 — avatar 40x40 (radius 12) with a 14x14 ChatsCircle
//             badge at 30,30; then a column, gap 4, of
//             sender (SemiBold 16/1.2, Primary/100)
//             + folder chip (SemiBold 16/1.2, Primary/40 on Overlay/brand,
//               radius 4, padding 0 8)
//             / message (Regular 14/1.2, Primary/100)
//             / time (Regular 12/1.4, Grey/80); ✕ 20x20 at the row's top right
//   actions   row gap 12, both buttons filling — Mute (Grey/20 on
//             Primary/100 text) and Open (Primary/50 on white), radius 4,
//             padding 12 24, SemiBold 14/20
//
// Duy's rules, 2026-08-22:
//   · a second message REPLACES the card and resets the 10 s timer — the two
//     never stack;
//   · nothing while the Notification Center is open;
//   · chat only — never files, task or other;
//   · no queued replay for an unfocused tab (satisfied by construction: the
//     card is built when the push lands and simply expires, nothing is held).
//
// 🚨 The click handling deliberately MIRRORS the meeting toast's capture-phase
// delegate instead of sharing a helper with it. Extracting the common part
// would mean re-plumbing that delegate, which is explicitly off limits — it
// took two bugs to get right. The duplication here is a considered choice, not
// an oversight. The reason a capture listener is needed at all: ui-core gives
// every widget its own `el.onclick` at render time and that handler ends in
// `e.stopImmediatePropagation()`, so a listener bound to the same element
// afterwards is dropped and the button appears to need a double click.
//
// 🚨 Mute is rendered because Figma has it, but it is wired in PHASE 3 (the
// scope picker swaps in place inside this same shell). Nothing dead reaches a
// user: this branch does not merge until the whole feature is done, and Phase
// 3 lands before it. Until then the button reports itself as unwired rather
// than silently doing nothing.

const CHAT_TOAST_MS = 10000;

const esc = (v = "") => _.escape(String(v));

/**
 * The workspace/folder chip.
 *
 * The live push carries no name: channel.post sends message, message_id,
 * hub_id, nid and the author's identity, and nothing resolves the folder — the
 * server's normalized `folder_name` exists only on FEED rows (and `hub_name` /
 * `workspace_name` exist on none of them, which is what made the row chip
 * render blank the first time). Rather than pay a per-message lookup on the
 * hottest push in the app, read the name off an open folder window when there
 * is one and drop the chip when there is not — the chip is hug-width, so its
 * absence leaves a valid layout.
 */
function folderLabel(model = {}) {
  try {
    const nid = model.nid;
    if (!nid || typeof Wm === "undefined" || !Wm.getItemsByKind) return "";
    const win = (Wm.getItemsByKind("window_folder") || []).find(
      (w) => w && !w.isDestroyed() && w.mget(_a.nid) == nid,
    );
    if (!win) return "";
    return win.mget(_a.filename) || win.mget(_a.name) || "";
  } catch (e) {
    return "";
  }
}

function senderLabel(model = {}) {
  return (
    model.firstname ||
    model.username ||
    model.lastname ||
    LOCALE.NEW_MESSAGE
  );
}

/**
 * Clear the live card and its timer. Safe to call when there is none.
 */
function killChatToast(host) {
  if (!host) return;
  try {
    if (host._chatToastTimer) {
      clearTimeout(host._chatToastTimer);
      host._chatToastTimer = null;
    }
    const t = host._chatToast;
    host._chatToast = null;
    if (t && (!t.isDestroyed || !t.isDestroyed())) {
      if (t.goodbye) t.goodbye();
      else if (t.remove) t.remove();
    }
  } catch (e) {}
}

function buildCard(model, url, replacing) {
  const pfx = "panel-activity-toast";
  const chip = folderLabel(model);
  const message = String(model.message || "").trim();

  const titleRow = Skeletons.Box.X({
    className: `${pfx}__title-row`,
    kids: [
      Skeletons.Note({ className: `${pfx}__sender`, content: esc(senderLabel(model)) }),
      chip
        ? Skeletons.Note({ className: `${pfx}__chip`, content: esc(chip) })
        : null,
    ].filter(Boolean),
  });

  const body = Skeletons.Box.Y({
    className: `${pfx}__body`,
    kids: [
      titleRow,
      // The message is user input and Note renders its content as markup —
      // the same reason the feed row escapes every value it prints.
      message
        ? Skeletons.Note({ className: `${pfx}__message`, content: esc(message) })
        : null,
      // Always "Just now": the card is built the moment the push lands and is
      // gone ten seconds later, so a relative timestamp could never say
      // anything else.
      Skeletons.Note({ className: `${pfx}__time`, content: LOCALE.JUST_NOW }),
    ].filter(Boolean),
  });

  const avatar = Skeletons.Box.Y({
    className: `${pfx}__avatar-wrap`,
    kids: [
      Skeletons.Avatar(
        (Visitor.avatar && Visitor.avatar(model.author_id)) || "default",
        `${pfx}__avatar`,
        senderLabel(model),
      ),
      Skeletons.Box.X({
        className: `${pfx}__badge`,
        kids: [Skeletons.Image.Svg({ ico: "noti-chats-circle" })],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: pfx,
    // data-replace suppresses the entry animation when this card is standing
    // in for one that was already on screen, so a burst of messages does not
    // strobe. data-url is what the capture delegate opens.
    attrOpt: {
      "data-replace": replacing ? "1" : "0",
      "data-url": String(url || ""),
    },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          avatar,
          body,
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: _a.cross,
            tooltips: LOCALE.CLOSE,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          // Notes, not Buttons, for the two actions — exactly as the meeting
          // toast does it. An active widget in the click path binds its own
          // onclick, and ui-core's __handleClick calls stopPropagation BEFORE
          // triggerHandlers, so an active descendant eats the click. (Setting
          // `kidsOpt: { active: 0 }` would not help: mergeKidsOptions discards
          // the result of its own map, and `active` does not cascade anyway.)
          Skeletons.Note({ className: `${pfx}__mute`, content: LOCALE.MUTE }),
          Skeletons.Note({ className: `${pfx}__open`, content: LOCALE.OPEN }),
        ],
      }),
    ],
  });
}

/**
 * Show (or replace) the chat toast.
 *
 * @param {object} host  the activity panel — holds the card + timer, and
 *                       `activityState` tells us whether the Center is open.
 * @param {object} model the push payload (author_id, firstname, message, nid…)
 * @param {string} url   the deep link _notify already resolved for this event
 */
function showChatToast(host, model = {}, url = "") {
  try {
    if (!host || !model) return;
    // The Center is open — the row is already arriving in the list behind it,
    // so a card on top would say the same thing twice.
    if (host.activityState) return;
    // Never toast my own message. shouldNofity already drops these, but
    // _notify is also reachable from the activity:notify radio channel.
    if (model.author_id && model.author_id == Visitor.id) return;

    const layer = typeof Wm !== "undefined" && Wm && Wm.windowsLayer;
    if (!layer || !layer.append) return;

    // Replace, never stack: the previous card goes before the new one lands,
    // and the 10 s timer starts again from this message.
    const replacing = !!(
      host._chatToast &&
      (!host._chatToast.isDestroyed || !host._chatToast.isDestroyed())
    );
    killChatToast(host);

    const toast = layer.append(buildCard(model, url, replacing));
    host._chatToast = toast;
    host._chatToastTimer = setTimeout(() => killChatToast(host), CHAT_TOAST_MS);

    if (toast && toast.el) {
      toast.el.addEventListener(
        "click",
        (e) => {
          const t = e.target;
          if (!t || !t.closest) return;
          if (t.closest(`.panel-activity-toast__open`)) {
            e.stopPropagation();
            const href = toast.el.getAttribute("data-url");
            killChatToast(host);
            if (href) location.hash = href;
            return;
          }
          if (t.closest(`.panel-activity-toast__mute`)) {
            e.stopPropagation();
            // Phase 3 replaces this with the in-place scope picker.
            if (host.warn) host.warn("chat toast: mute is wired in Phase 3");
            return;
          }
          if (t.closest(`.panel-activity-toast__close`)) {
            e.stopPropagation();
            killChatToast(host);
          }
        },
        true,
      );
    }
  } catch (e) {
    if (host && host.warn) host.warn("chat toast failed", e);
  }
}

module.exports = { showChatToast, killChatToast, folderLabel, senderLabel, CHAT_TOAST_MS };
