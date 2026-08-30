/**
 * Step bodies for the `meeting` tour — Figma 148:44759, 149:44974, 156:19597.
 *
 * Screens 1-2 are the Meet empty state with its two-card carousel; screen 3 is
 * the weekly calendar with the Schedule-a-meeting dialog open.
 *
 * The caption under the track names the current card, so it changes as the
 * track slides — which is what the two frames differ by.
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
  const item = ITEMS[at];
  return emptyState(ui, {
    title: LOCALE.MEET_HERO_TITLE,
    desc: LOCALE.MEET_HERO_DESC,
    cta: `${LOCALE.SCHEDULE_FIRST_MEETING} →`,
    items: ITEMS.map((i) => ({ src: i.src })),
    index: at,
    // Landscape screenshots, captioned below the track rather than inside the
    // card — see the `wide` variant in skeleton/toolkit/empty-state.js.
    card: 'wide',
    caption: { ico: item.ico, title: item.title(), desc: item.desc() },
  });
};

module.exports.ITEMS = ITEMS;
