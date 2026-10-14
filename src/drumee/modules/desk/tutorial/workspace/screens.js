/**
 * The workspace step's screens — moved out of index.js so a test can read the
 * table without mounting the widget.
 *
 * Each entry describes the DESK mock (lit/anchor/target/direction…) and, under
 * `phone`, the phone mock (skeleton/phone.js, Figma "org home -> create wp"):
 *
 *   view    home | sheet | invite
 *   lit     the sheet block the screen is about (drives the Figma opacities)
 *   target  what the callout points at
 *   live    on a run that may create, this screen is the REAL thing — the name
 *           field takes the name (380:54800) and the create screen picks a
 *           type and creates (385:1226). The frames have no separate form.
 *   skip    the desk's separate live form; on a phone the create screen above
 *           already is that form, so the phone never shows this one.
 */
const { BLOCKS } = require('../skeleton/toolkit/workspace-dialog');

const SCREENS = [
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'home', target: 'ph-cta' },
    // Figma 140:22684 — the home EMPTY STATE the flow starts on: the
    // "Your workspace starts here." hero and the CTA that opens the dialog.
    // The tour used to open straight onto an already-open dialog, which
    // skipped how the user got there.
    home: true,
    target: 'home-cta',
    anchor: 'home-cta',
    direction: 'north',
    beak: 'end',
    // NO callout. 140:22684 is the entry state the flow arrow leaves from and
    // it carries none — the CTA is the whole instruction, and a card floating
    // beside it was ours.
    //
    // Which leaves the screen with nothing to press Next on, so the CTA
    // becomes the control: it is already the lit surface, it is already what
    // the frame's arrow leaves from, and in the product it is what opens the
    // dialog that screen 2 draws. See `home-cta` in skeleton/toolkit/home.js.
    bare: true,
  },
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'sheet', lit: 'name', target: BLOCKS.NAME, live: true },
    lit: BLOCKS.NAME,
    anchor: BLOCKS.NAME,
    text: () => LOCALE.TUTORIAL_WS_NAME,
  },
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'sheet', lit: 'internal', target: BLOCKS.type('internal') },
    lit: BLOCKS.type('internal'),
    anchor: BLOCKS.type('internal'),
    title: () => LOCALE.TUTORIAL_WS_INTERNAL_TITLE,
    desc: () => LOCALE.INTERNAL_WORKSPACE_HINT,
  },
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'sheet', lit: 'external', target: BLOCKS.type('external') },
    lit: BLOCKS.type('external'),
    anchor: BLOCKS.type('external'),
    title: () => LOCALE.TUTORIAL_WS_EXTERNAL_TITLE,
    desc: () => LOCALE.EXTERNAL_WORKSPACE_HINT,
  },
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'sheet', lit: 'create', target: BLOCKS.TYPE, live: true },
    // The closing screen lights the type list AND the now-enabled Create
    // button, because it is about the pair.
    lit: BLOCKS.CREATE,
    anchor: BLOCKS.CREATE,
    ready: true,
    text: () => LOCALE.TUTORIAL_WS_CREATE,
  },

  // ── from here it is not a tour any more ────────────────────────────────────
  //
  // These two run ONLY on the post-signup pass — the host slices the table to
  // `screen_count`, and _screensFor drops them for a preview or for the full
  // tour (see ../index.js). Five screens of being shown the dialog, and then
  // the dialog.
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'sheet', lit: 'create', target: BLOCKS.TYPE, skip: true },
    // Every section at full strength, because there is no longer one being
    // taught: the user is filling it in.
    //
    // AND NO CALLOUT. Five screens have just explained this dialog field by
    // field; a sixth card beside the filled-in version of it is the tour
    // talking over the thing it spent those five screens introducing. The
    // dialog carries Create, which is the only way forward this screen has.
    live: true,
    bare: true,
    target: 'wsd-dialog',
    anchor: 'wsd-dialog',
    direction: 'west',
  },
  {
    // Phone layout (Figma 380:54433 → 385:1364): what the phone mock draws
    // and lifts out of the scrim. The callout copy is the desk entry's.
    phone: { view: 'invite', target: 'inv-card' },
    // NO CALLOUT HERE EITHER, and `bare` is what says so rather than the
    // absence of `text`. Leaving the text off is not the same thing: feed(null)
    // is a no-op in ui-core, so a screen that raises nothing INHERITS the
    // previous screen's card — which is how this one once ended up telling the
    // user to create a workspace they had just created. `bare` makes focus()
    // feed the callout null, which clears it.
    //
    // The card itself carries Send and Skip, so nothing is lost by going
    // quiet: it is already a complete screen with its own two ways out.
    invite: true,
    bare: true,
    target: 'inv-card',
    anchor: 'inv-card',
    direction: 'west',
  },
];

module.exports = SCREENS;
