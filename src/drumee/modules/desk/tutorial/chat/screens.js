/**
 * The chat step's screens — moved out of index.js so a test can read the table
 * without mounting the widget. `phone` describes the phone mock
 * (skeleton/phone.js, Figma 386:55913 → 386:57195): its view, the part lifted
 * out of the scrim, and — where a phone does it differently — its own copy.
 */
const SCREENS = [
  {
    phone: { view: 'hero', target: 'ph-cta' },
    // Figma 142:38674 — the Chat empty state the flow opens on.
    //
    // NO callout: the frame carries none, and the hero already says what this
    // screen is for in its own headline and paragraph. The card that used to
    // float beside the CTA was ours, and it repeated the hero in miniature.
    //
    // Which leaves the screen with nothing to press Next on, so the CTA becomes
    // the control — "Start discovering now" raises `next-step` itself (see
    // `cta_service` in skeleton/index.js). Exactly the arrangement the
    // workspace tour's opening screen uses for `home-cta`.
    //
    // `LOCALE.CHAT_HERO_TITLE_SHORT` and `LOCALE.TUTORIAL_CHAT_START` were this
    // callout's copy and now have no reader; the keys are left in the locale
    // files rather than pruned across all seven.
    pane: { empty: true },
    target: 'es-cta',
    anchor: 'es-cta',
    direction: 'north',
    bare: true,
  },
  {
    phone: {
      view: 'stream',
      target: 'ph-composer-plus',
      halo: true,
      // Beside the +, bottoms level (386:56395): host-kit's corner placement.
      // A phone attaches with the +, it does not drag (386:56395).
      title: () => LOCALE.TUTORIAL_CHAT_PHONE_ATTACH_TITLE,
      desc: () => LOCALE.TUTORIAL_CHAT_PHONE_ATTACH_DESC,
    },
    // Figma 142:39178 — "Drag and drop a file".
    //
    // The COMPOSER is what this screen is about, so the composer is what is
    // lit. That is the frame's own treatment: every other surface on it is
    // drawn at 40% — the chat panel, the stream's header, all six bubbles —
    // and the Chat Input alone is at full strength. Lighting `stream` (what
    // this did) held the whole message area out of the scrim instead, so the
    // one thing the screen is teaching was the only part of the pane that
    // looked no different from the rest.
    //
    // The beak lands on the PAPERCLIP, not on the composer's mid-point. The
    // frame puts the card over the left end of the input, which is where the
    // attach control is — and it is the control the sentence is about, since
    // dragging a file in is the same act as attaching one. target and anchor
    // exist precisely so the lit area and the beak can be measured off
    // different elements.
    target: 'composer',
    anchor: 'composer-attach',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_DROP_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_DROP_DESC,
  },
  {
    phone: {
      view: 'actions',
      target: 'ph-act-thread',
      // Over the tile, beak down, 16 in and 23 clear (386:56600).
      prefer: 'above',
      margin: 16,
      gap: 23,
      // A phone has no hover toolbar: a long press raises the action sheet
      // (386:56600). The desk description still says what a thread is for.
      title: () => LOCALE.TUTORIAL_CHAT_PHONE_HOLD_TITLE,
    },
    // Figma 169:39799. The design lands the beak on the reply-in-thread control
    // specifically, not on the bar: the card's beak is centred at x 1280.5 and
    // that control's centre is ~1278.
    //
    // 46, not the shared default of 32 (spotlight/index.js GAP). The frame puts
    // the card's bottom at y 806 and the toolbar's top at 852 — the extra 14
    // is the "Reply in thread" tip, which stands between the two and which the
    // average default was never measured against.
    pane: { hint: true },
    target: 'msg-file-message',
    anchor: 'hint-thread',
    direction: 'south',
    gap: 46,
    title: () => LOCALE.TUTORIAL_CHAT_HASH_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_HASH_DESC,
  },
  {
    // Under the header card, 17 in, beak up (386:56858).
    phone: { view: 'thread', target: 'ph-thread-head', margin: 17, gap: 28 },
    // Thread panel open, callout below its file card.
    pane: { thread: true },
    target: 'thread',
    anchor: 'thread-file',
    direction: 'north',
    title: () => LOCALE.TUTORIAL_CHAT_OPEN_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_OPEN_DESC,
  },
  {
    // The whole composer row lit, the card over it (386:57195).
    phone: { view: 'thread', target: 'ph-composer-row', replies: true, prefer: 'above', margin: 17, gap: 22 },
    // The thread, answered.
    pane: { thread: true, replies: true },
    target: 'thread',
    anchor: 'thread-composer',
    direction: 'south',
    title: () => LOCALE.TUTORIAL_CHAT_DISCUSS_TITLE,
    desc: () => LOCALE.TUTORIAL_CHAT_DISCUSS_DESC,
  },
];

module.exports = SCREENS;
