/**
 * The meeting step's screens — moved out of index.js so a test can read the
 * table without mounting the widget. `phone` is the phone mock
 * (skeleton/phone.js).
 */
const SCREENS = [
  // The empty state. No `desc` — it carries no callout (see _showScreen), and
  // each preview names itself through the caption under the track.
  {
    target: 'es-viewport',
    anchor: 'es-cta',
    direction: 'north',
    // Phone (Figma 386:58198): the hero's CTA, uncarded — the frame has no callout.
    phone: { view: 'hero', target: 'ph-cta' },
  },
];

module.exports = SCREENS;
