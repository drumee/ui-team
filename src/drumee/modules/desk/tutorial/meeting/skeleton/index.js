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

const ITEMS = [
  {
    src: require('assets/tutorial/meet-instant.jpg').default,
    ico: 'rail-meet',
    title: () => LOCALE.INSTANT_MEETING,
    desc: () => LOCALE.INSTANT_MEETING_HINT,
  },
  {
    src: require('assets/tutorial/meet-schedule.png').default,
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
    items: ITEMS.map((i) => ({ src: i.src })),
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
