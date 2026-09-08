/**
 * Step bodies for the `task` tour — Figma 146:40534 and 162:20161.
 *
 * Screen 1 is the Task empty state, whose carousel walks the five views on a
 * timer; screen 2 is the Board with the New task dialog open. `screen.index`
 * says which card the track starts on — it is a CARD number, not a step (see
 * `_card` in ../index.js).
 *
 * The five 1.x tracker view builders (./board, ./calendar, ./gantt, ./list,
 * ./health) are left on disk — they are the only drawings of those views the
 * repo has, and the populated Task frames may want them back.
 */

const { emptyState } = require('../../skeleton/toolkit/empty-state');
const newTask = require('./new-task');
const { taskPreview } = require('./preview');

/**
 * The five cards, in the frame's order (146:40547, 146:40652, 146:40677,
 * 146:40646, 146:40683).
 *
 * COMPOSED, not exported. Each was a PNG of a tracker view this repo already
 * draws — ./board, ./calendar, ./gantt, ./list and ./health were on disk the
 * whole time, left there when the tour moved onto the 2.0 shell and the
 * bitmaps took over. Five screenshots cannot follow the theme, cannot agree
 * with one another once the panel moves, and cost 386KB to say what those
 * builders say from one dataset. See ./preview.js.
 */
const VIEWS = [
  { key: 'board', title: () => LOCALE.TASK_CARD_BOARD },
  { key: 'calendar', title: () => LOCALE.TASK_CARD_CALENDAR },
  { key: 'gantt', title: () => LOCALE.TASK_CARD_GANTT },
  { key: 'list', title: () => LOCALE.TASK_CARD_LIST },
  { key: 'health', title: () => LOCALE.TASK_CARD_HEALTH },
];

module.exports = function (ui, screen = {}) {
  if (screen.dialog) return newTask(ui);
  return emptyState(ui, {
    title: LOCALE.TASK_HERO_TITLE,
    desc: LOCALE.TASK_HERO_DESC,
    cta: LOCALE.CREATE_FIRST_TASK,
    // Narrow, so the headline's three hard lines have room to be three lines.
    hero: 'narrow',
    items: VIEWS.map((v) => ({ title: v.title(), node: taskPreview(ui, v.key) })),
    index: screen.index || 0,
    dots: true,
    // The carousel screen carries no callout (see ../index.js), so this button
    // is its only way forward — and it goes where its label says, straight to
    // the New task dialog. The dot row above is inert scenery, as it is in the
    // frames: the track moves on a timer and under a drag, not by being poked.
    cta_service: 'next-step',
  });
};

module.exports.VIEWS = VIEWS;
