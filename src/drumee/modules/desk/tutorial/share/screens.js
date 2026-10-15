/**
 * The share step's screens — moved out of index.js so a test can read the
 * table without mounting the widget. On a phone each screen lights its own
 * block of the full-page panel (Figma 386:59700 → 386:61932), so `phone` is
 * stamped from `lit` below rather than repeated per entry.
 */
const { BLOCKS } = require('./skeleton/panel');

const SCREENS = [
  { lit: BLOCKS.RECIPIENT, desc: () => LOCALE.TUTORIAL_SHARE_RECIPIENT },
  { lit: BLOCKS.ACCESS, desc: () => LOCALE.TUTORIAL_SHARE_ACCESS },
  { lit: BLOCKS.EMAIL, desc: () => LOCALE.TUTORIAL_SHARE_EMAIL },
  { lit: BLOCKS.PASSWORD, desc: () => LOCALE.TUTORIAL_SHARE_PASSWORD },
  { lit: BLOCKS.EXPIRY, desc: () => LOCALE.TUTORIAL_SHARE_EXPIRY },
  // The last block sits at the very bottom of the panel, and 148:44198 does
  // not put its callout beside the panel like the other five: the card goes
  // ON the panel, above the notify row, with the tail pointing down at it
  // (the frame's beak is on the card's bottom edge at y226.875).
  //
  // `south` is that placement — the name is the direction the callout REACHES
  // (spotlight/index.js anchorFor), so reaching south puts the card above the
  // target. A card beside the panel would have had to sit almost off the
  // bottom of the tour to line up with a row 13px from the panel's floor.
  { lit: BLOCKS.NOTIFY, direction: 'south', desc: () => LOCALE.TUTORIAL_SHARE_NOTIFY },
];

// The frames put the card under the first block and OVER every later one
// (386:60952 → 386:61932), 17px in from the edges (a 396-wide card on 430).
SCREENS.forEach((s, i) => {
  s.phone = { view: 'panel', target: s.lit, margin: 17, ...(i > 0 ? { prefer: 'above' } : {}) };
});

module.exports = SCREENS;
