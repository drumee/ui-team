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
//   · a second message REPLACES the card and resets the 30 s timer — the two
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

// 30 s, raised 10 → 20 → 30 on Duy's call 2026-08-26. A chat card carries a
// Mute button and a scope choice behind it, so it is something to ACT on
// rather than only to read, and it has to survive long enough to notice, read
// and decide. The meeting cards use the same 30 s for the same reason.
// The picker itself still has NO timeout, so a decision already in progress is
// never taken away, however this number moves.
const CHAT_TOAST_MS = 30000;
// The confirmation is an acknowledgement, not a message to read — Figma gives
// it a single line and it goes on its own.
const CHAT_CONFIRM_MS = 2000;

const { isPopupMuted, setMute, workspaceCount } = require("./mute");

const esc = (v = "") => _.escape(String(v));

// Resolved node names, keyed by nid. A folder's name is stable enough for a
// ten-second card, and this keeps the lookup below to ONE request per folder
// per session instead of one per message. Capped so a long session in a busy
// workspace cannot grow it without bound.
const NAME_CACHE = new Map();
const NAME_CACHE_MAX = 200;

function cacheName(key, name) {
  if (!key || !name) return name;
  if (NAME_CACHE.size >= NAME_CACHE_MAX) {
    NAME_CACHE.delete(NAME_CACHE.keys().next().value);
  }
  NAME_CACHE.set(key, name);
  return name;
}

/**
 * The location chip — Figma puts the folder (or workspace) name beside the
 * sender, and it is the only thing on the card that says WHERE the message
 * came from.
 *
 * Synchronous best effort, in order: the cache, then an open folder window.
 * The live push carries no name of its own — channel.post sends message,
 * message_id, hub_id, nid and the author's identity, and nothing resolves the
 * folder (the server's normalized `folder_name` exists only on FEED rows, and
 * `hub_name` / `workspace_name` exist on none of them, which is what made the
 * feed row's chip render blank the first time it was built).
 *
 * When this comes back empty the card still renders and `resolveChipLater`
 * fills the chip in from media.get_node_attr. Doing it that way rather than
 * awaiting keeps the toast instant, and keeps the cost off the server's
 * hottest push path — only the recipient who needs the name asks for it, once.
 */
function folderLabel(model = {}) {
  try {
    // PRIMARY source: the server now names the folder on the push itself
    // (channel.js `_chat_folder_name`). Everything below it is fallback for a
    // server that predates that, and for the P2P chat push, which has no
    // folder at all.
    if (model.folder_name) return String(model.folder_name);
    // A workspace-level post has no nid; mfs_node_attr answers with the
    // WORKSPACE name for the hub root, which is the right label for it.
    const nid = model.nid || model.hub_id;
    if (!nid) return "";
    if (NAME_CACHE.has(nid)) return NAME_CACHE.get(nid);
    if (typeof Wm === "undefined" || !Wm.getItemsByKind) return "";
    const win = (Wm.getItemsByKind("window_folder") || []).find(
      (w) => w && !w.isDestroyed() && w.mget(_a.nid) == nid,
    );
    if (!win) return "";
    return cacheName(nid, win.mget(_a.filename) || win.mget(_a.name) || "");
  } catch (e) {
    return "";
  }
}

/**
 * Fill the chip in once the server names the node.
 *
 * The chip element is ALWAYS rendered (CSS hides it while empty), so this only
 * sets text — no DOM is built here, and nothing moves if the request fails.
 */
function resolveChipLater(host, model, toast) {
  try {
    const nid = model.nid || model.hub_id;
    if (!nid || !host || !host.fetchService || !toast || !toast.el) return;
    Promise.resolve(
      host.fetchService(SERVICE.media.get_node_attr, { nid, hub_id: model.hub_id }),
    )
      .then((a) => {
        const row = a && (a[0] || a);
        const name = row && (row.filename || row.user_filename || row.name);
        if (!name) return;
        cacheName(nid, name);
        // The card may have been dismissed or REPLACED by a later message
        // while this was in flight — only touch the one we were given, and
        // only while it is still the live card.
        if (toast.isDestroyed && toast.isDestroyed()) return;
        if (host._chatToast !== toast) return;
        const el = toast.el.querySelector(".panel-activity-toast__chip");
        if (el) el.textContent = name;
      })
      .catch(() => {});
  } catch (e) {}
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
      const node = t.el;
      // 🚨 goodbye() is a NO-OP for a card appended straight to the windows
      // layer. MEASURED on the endpoint 2026-08-26: it returns without
      // throwing, but the view is NOT marked destroyed and the node is STILL
      // connected afterwards — so the card never left the screen, a second
      // message stacked another on top of it, and the auto-dismiss did
      // nothing at all. (Phase 2 shipped this; it was never DOM-verified.)
      // destroy() is the Marionette API and does both — verified 0 nodes left.
      if (t.destroy) t.destroy();
      else if (t.remove) t.remove();
      // The DOM is the source of truth for whether the user can still see a
      // card, so make certain of it rather than trusting the view layer.
      if (node && node.isConnected && node.remove) node.remove();
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
      // ALWAYS rendered, even with no name yet: resolveChipLater fills it in
      // from media.get_node_attr, and `&__chip:empty` keeps it out of the
      // layout until then. Rendering it conditionally would mean building DOM
      // after the fact, which this framework does not do from raw markup.
      Skeletons.Note({ className: `${pfx}__chip`, content: chip ? esc(chip) : "" }),
    ],
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
 * The scope chooser — Figma frame `Mute notification from` (58222:33811, inner
 * card 58222:33821). It reuses THIS card's own column shell, which is why it
 * swaps in place instead of opening a second modal on top of the first.
 *
 * Two scopes, and only two: the workspace this message came from, and every
 * workspace. They are alternatives rather than layers — muting globally clears
 * the per-workspace mutes server-side — which is also what Figma shows, with
 * one exclusive confirmation state for each.
 *
 * ⚠️ A push with no workspace (a p2p DM carries none) cannot offer "this
 * workspace": there would be no id to write. It gets the global choice only,
 * which is the sole thing that can silence it.
 */
function buildScopePicker(model = {}, replacing, wsCount) {
  const pfx = "panel-activity-toast";
  const hubId = model.hub_id == null ? "" : String(model.hub_id);
  const where = folderLabel(model);

  // ONE workspace ⇒ the two scopes silence exactly the same thing, so asking
  // the question is asking for a choice that does not exist. Collapse to a
  // single Mute button. It targets THIS workspace rather than everything: with
  // one workspace the effect is identical today, and if the user creates a
  // second one later it should not arrive pre-muted by a decision taken before
  // it existed.
  //
  // `wsCount` is null whenever the count could not be PROVEN — see mute.js.
  // Unknown keeps the full picker, because collapsing wrongly would mute a
  // scope the user never picked, while an extra option is only redundant.
  if (wsCount === 1) {
    return Skeletons.Box.Y({
      className: pfx,
      attrOpt: { "data-replace": replacing ? "1" : "0", "data-state": "picker" },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__head`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__prompt`,
              content: LOCALE.MUTE_NOTIFICATION_FROM,
            }),
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
            Skeletons.Note({
              className: `${pfx}__scope ${pfx}__scope--all`,
              content: LOCALE.MUTE,
              attrOpt: { "data-scope": hubId },
            }),
          ],
        }),
      ],
    });
  }

  const scopes = [];
  if (hubId) {
    scopes.push(
      Skeletons.Note({
        className: `${pfx}__scope ${pfx}__scope--one`,
        // The name is user-controlled and Note renders content as MARKUP.
        content: where ? esc(where) : LOCALE.MUTE_THIS_WORKSPACE,
        attrOpt: { "data-scope": hubId },
      }),
    );
  }
  scopes.push(
    Skeletons.Note({
      className: `${pfx}__scope ${pfx}__scope--all`,
      content: LOCALE.MUTE_ALL_WORKSPACES,
      attrOpt: { "data-scope": "" },
    }),
  );

  return Skeletons.Box.Y({
    className: pfx,
    attrOpt: { "data-replace": replacing ? "1" : "0", "data-state": "picker" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__prompt`,
            content: LOCALE.MUTE_NOTIFICATION_FROM,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: _a.cross,
            tooltips: LOCALE.CLOSE,
          }),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}__actions`, kids: scopes }),
    ],
  });
}

/**
 * The confirmation — Figma `muted-all-workspace` (58222:34431) and
 * `muted-selected-workspace` (58222:34450). Both are the same ROW layout in
 * the same shell, differing only in which scope they name.
 *
 * Also carries the FAILURE line. The two share a builder because they are the
 * same shape and the same 2 s dismissal; only a card that says something true
 * is worth showing, and "it did not work" is the true thing to say when the
 * write did not land.
 */
function buildResult(hubId, ok, replacing) {
  const pfx = "panel-activity-toast";
  const label = ok
    ? hubId
      ? LOCALE.MUTE_DONE_WORKSPACE
      : LOCALE.MUTE_DONE_ALL
    : LOCALE.MUTE_FAILED;

  return Skeletons.Box.Y({
    className: pfx,
    attrOpt: {
      "data-replace": replacing ? "1" : "0",
      "data-state": ok ? "done" : "failed",
    },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__result`,
        kids: [
          Skeletons.Image.Svg({
            className: `${pfx}__result-ico`,
            // Both glyphs are ALREADY in the sprite (the notification rows use
            // them), so this needs no icon build — the same check that saved a
            // sprite rebuild for the meeting card's camera. There is no
            // `noti-warning-circle`; x-circle is the failure glyph that exists.
            ico: ok ? "noti-check-circle" : "noti-x-circle",
          }),
          Skeletons.Note({ className: `${pfx}__result-text`, content: label }),
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
    // Muted: the popup is the ONLY thing this suppresses. The row is still
    // being added to the Notification Center behind us and the badge still
    // counts it — see mute.js. Placed last of the guards so that a mute can
    // never mask one of the cheaper structural reasons not to show a card.
    if (isPopupMuted(model)) return;

    // Replace, never stack: the previous card goes before the new one lands,
    // and the 30 s timer starts again from this message.
    const toast = mountCard(host, (replacing) => buildCard(model, url, replacing), CHAT_TOAST_MS);
    if (!toast) return;
    // Name the location if the synchronous lookup could not. Never awaited —
    // the card is already on screen.
    if (!folderLabel(model)) resolveChipLater(host, model, toast);
    // The card needs its own model to build the scope picker if Mute is
    // pressed, and the delegate only has the DOM.
    toast._chatModel = model;
  } catch (e) {
    if (host && host.warn) host.warn("chat toast failed", e);
  }
}

/**
 * Put a card on screen and wire it.
 *
 * Every state of this toast — the message, the scope picker, the confirmation
 * — is mounted through here, so they share one shell, one delegate and one
 * timer discipline. Swapping states reuses the SAME replace path a second
 * message already uses (kill, then append with the entry animation
 * suppressed), which is why the picker appears in place rather than as a
 * second card floating over the first.
 *
 * @param {function} build  receives `replacing` and returns the skeleton
 * @param {number}   ms     auto-dismiss delay; 0 keeps the card until the user
 *                          acts, which is what the scope picker needs — a
 *                          chooser that vanishes mid-decision is worse than no
 *                          chooser at all.
 */
function mountCard(host, build, ms) {
  const layer = typeof Wm !== "undefined" && Wm && Wm.windowsLayer;
  if (!layer || !layer.append) return null;

  const replacing = !!(
    host._chatToast &&
    (!host._chatToast.isDestroyed || !host._chatToast.isDestroyed())
  );
  killChatToast(host);

  const toast = layer.append(build(replacing));
  host._chatToast = toast;
  if (ms) host._chatToastTimer = setTimeout(() => killChatToast(host), ms);

  if (toast && toast.el) bindCardClicks(host, toast);
  return toast;
}

/**
 * The capture-phase click delegate.
 *
 * 🚨 Capture phase is not optional: ui-core gives every widget its own
 * `el.onclick` at render time and that handler ends in
 * `stopImmediatePropagation()`, so a listener bound to the same element
 * afterwards never runs and the button looks like it needs a double click.
 *
 * Bound to the card ROOT and matched with `closest()`, so it keeps working
 * across a state swap without re-plumbing anything.
 */
function bindCardClicks(host, toast) {
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
        showScopePicker(host, toast._chatModel || {});
        return;
      }
      const scope = t.closest(`.panel-activity-toast__scope`);
      if (scope) {
        e.stopPropagation();
        // data-scope carries the hub id, or "" for every workspace. Read off
        // the DOM rather than closed over, so the handler stays correct for
        // whatever card is currently mounted. `toast` is passed so the reply
        // can tell whether it is still the card the user clicked.
        applyMute(host, scope.getAttribute("data-scope") || "", toast);
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

/**
 * Swap the message card for the scope chooser, in place.
 *
 * No auto-dismiss while it is open (`ms` = 0): the user is being asked a
 * question, and the ten-second clock that paces an unread message would take
 * the question away mid-answer.
 */
async function showScopePicker(host, model) {
  // Resolved BEFORE the swap so the picker is drawn once, in its final shape,
  // rather than flickering from two options down to one. Cached per session,
  // so only the first Mute click in a session pays for it, and it never
  // rejects — an unknown count simply keeps the full picker.
  let wsCount = null;
  try {
    wsCount = await workspaceCount(host);
  } catch (e) {
    wsCount = null;
  }
  const toast = mountCard(host, (replacing) => buildScopePicker(model, replacing, wsCount), 0);
  if (toast) toast._chatModel = model;
  return toast;
}

/**
 * Write the mute, then confirm it — but ONLY if it actually landed.
 *
 * `setMute` reports `ok:false` when the write did not reach the database
 * (the server's driver swallows SQL errors and returns undefined rather than
 * throwing, so the server checks and says so). Confirming regardless would
 * tell the user a workspace is muted when the next message will pop up all
 * the same, and that is the one failure they could never diagnose.
 */
async function applyMute(host, hubId, from) {
  let ok = false;
  try {
    ({ ok } = await setMute(host, hubId, true));
  } catch (e) {
    ok = false;
  }
  // TWO staleness guards, and they catch different things — the same pairing
  // the Phase 2 chip needed:
  //   · no card at all  → the user dismissed the picker while the write was in
  //     flight. Do not resurrect what they closed.
  //   · a DIFFERENT card → a new message landed and mounted its own card in the
  //     meantime. Confirming here would silently eat that message's popup, so
  //     the newer card wins; the mute itself has still taken effect, and the
  //     next message from that workspace simply will not appear.
  if (!host._chatToast) return;
  if (from && host._chatToast !== from) return;
  mountCard(host, (replacing) => buildResult(hubId, ok, replacing), CHAT_CONFIRM_MS);
}

module.exports = {
  showChatToast,
  killChatToast,
  folderLabel,
  senderLabel,
  resolveChipLater,
  buildScopePicker,
  buildResult,
  showScopePicker,
  applyMute,
  CHAT_TOAST_MS,
  CHAT_CONFIRM_MS,
};
