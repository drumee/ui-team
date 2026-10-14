/**
 * The migrate step's screens — moved out of index.js so a test can read the
 * table without mounting the widget. `phone` describes the phone mock
 * (skeleton/phone.js); everything else is the desk mock.
 */
const SCREENS = [
  {
    // Phone layout (Figma 385:55109 → 386:55759): what the phone mock
    // lifts out of the scrim. Dialog copy is the desk entry's.
    phone: { view: 'pane', target: 'ph-fab', halo: true },
    // 142:34981, drawn exactly as the frame has it: no callout, no scrim, and
    // the three hero buttons live. `live` is what makes them controls (see
    // ./skeleton/index.js); `bare` is what stops a card being raised over a
    // frame that has none.
    //
    // A target is still named because the spotlight needs one to measure, and
    // the CTA is the thing the screen is about. With `bare` it is only
    // promoted, never ringed — nothing in spotlight/skin styles `.is-lit`.
    key: 'pane',
    pane: true,
    live: true,
    bare: true,
    // The dropdown is drawn on this screen now, and its rows act. `+ New` and
    // `Upload` are no longer screens of their own — see the note above the
    // table.
    menu: true,
    live_menu: true,
    target: 'fp-migrate',
    anchor: 'fp-migrate',
    direction: 'north',
    beak: 'start',
  },
  {
    // Phone layout (Figma 385:55109 → 386:55759): what the phone mock
    // lifts out of the scrim. Dialog copy is the desk entry's.
    phone: { view: 'dialog', target: 'mg-address' },
    // Back goes to the PANE, not to the screen before this one.
    //
    // Screen 2 is the `+ New` branch, and the only way into this screen is the
    // Migrate CTA on screen 1 — so unwinding to index-1 would land the user on
    // a dropdown they never opened. Both branches return to the fork.
    key: 'copy',
    back: 'pane',
    dialog: true,
    target: 'mg-dialog',
    anchor: 'mg-address',
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_COPY_DESC,
  },
  {
    // Phone layout (Figma 385:55109 → 386:55759): what the phone mock
    // lifts out of the scrim. Dialog copy is the desk entry's.
    phone: { view: 'dialog', target: 'mg-link' },
    // The address has been copied; the link is still empty.
    key: 'paste',
    dialog: true,
    copied: true,
    target: 'mg-dialog',
    anchor: 'mg-link',
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    desc: () => LOCALE.TUTORIAL_MIGRATE_PASTE_DESC,
  },
  {
    // Phone layout (Figma 385:55109 → 386:55759): what the phone mock
    // lifts out of the scrim. Dialog copy is the desk entry's.
    phone: { view: 'dialog', target: 'mg-verify' },
    key: 'verify',
    dialog: true,
    copied: true,
    linked: true,
    target: 'mg-dialog',
    anchor: 'mg-verify',
    // Vertically the card tracks the row it is about; HORIZONTALLY it clears
    // the whole dialog. 176:47527 states both numbers: the dialog's right edge
    // at x1056 and the callout's left at x1090 — 34px clear of the PANEL.
    //
    // Anchoring the placement on the row measured the gap from the wrong edge.
    // Every row stops 28px short of the panel (the dialog's inset), so a 32px
    // gap from the row left the card 4px off the panel — all but touching it,
    // on all three screens.
    anchor_x: 'mg-dialog',
    direction: 'west',
    gap: 34,
    title: () => LOCALE.TUTORIAL_MIGRATE_TITLE,
    // Its own line, not the paste screen's. This screen is reached with the
    // link already in the field, so "Paste the link" described a step the user
    // had just finished; the only thing left on it is the button.
    desc: () => LOCALE.TUTORIAL_MIGRATE_VERIFY_DESC,
  },
];

module.exports = SCREENS;
