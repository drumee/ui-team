/**
 * Step bodies for the `meeting` tour — Figma 148:44759, 149:44974, 156:19597.
 *
 * Screen 1 is the Meet empty state with its two-card carousel; screen 2 is the
 * weekly calendar with the Schedule-a-meeting dialog open. `screen.index` says
 * which card the track starts on — a CARD number, not a step (see `_card` in
 * ../index.js).
 *
 * The caption under the track names the current card, so it changes as the
 * track slides — which is what the two frames differ by. Both captions are
 * handed to the empty state, which shows the one belonging to the card on
 * screen; the step flips it as the track moves.
 */

const { emptyState } = require('../../skeleton/toolkit/empty-state');
const schedule = require('./schedule');
const { scheduleCard } = require('./calendar');
const { callCard } = require('./call');

const ITEMS = [
  {
    // COMPOSED, with the four faces left as photographs — which is what a
    // video tile is. The whole frame used to be one JPEG; the chrome around
    // the call is drawn now and only the tiles are bitmap. See ./call.js.
    node: (ui) => callCard(ui),
    ico: 'rail-meet',
    title: () => LOCALE.INSTANT_MEETING,
    desc: () => LOCALE.INSTANT_MEETING_HINT,
  },
  {
    // COMPOSED. 149:44974 is a week calendar over the workspace chrome, and
    // every part of it is something this codebase draws — see ./calendar.js.
    node: (ui) => scheduleCard(ui),
    ico: 'sidebar_calendar',
    title: () => LOCALE.SCHEDULE_MEETING,
    desc: () => LOCALE.SCHEDULE_MEETING_HINT,
  },
];

module.exports = function (ui, screen = {}) {
  if (screen.dialog) return schedule(ui);
  const at = Math.max(0, Math.min(ITEMS.length - 1, ~~screen.index));
  return emptyState(ui, {
    title: LOCALE.MEET_HERO_TITLE,
    desc: LOCALE.MEET_HERO_DESC,
    cta: `${LOCALE.SCHEDULE_FIRST_MEETING} →`,
    // `src` for the photograph, `node` for the composed one — the carousel's
    // card takes either (see toolkit/empty-state.js).
    items: ITEMS.map((i) => (i.node ? { node: i.node(ui) } : { src: i.src })),
    index: at,
    // Landscape screenshots, captioned below the track rather than inside the
    // card — see the `wide` variant in skeleton/toolkit/empty-state.js.
    card: 'wide',
    caption: ITEMS.map((i) => ({ ico: i.ico, title: i.title(), desc: i.desc() })),
    // The carousel screen carries no callout (see ../index.js), so this button
    // is its only way forward — straight to the scheduler it is named after.
    cta_service: 'next-step',
    // …and the arrows beside the caption move the track, which is what they
    // look like they do. Until now they were a drawing.
    arrow_service: { prev: 'prev-card', next: 'next-card' },
  });
};

module.exports.ITEMS = ITEMS;
