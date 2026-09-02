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

/**
 * The five cards, in the frame's order, each with the artwork exported from
 * its own frame (146:40547, 146:40652, 146:40677, 146:40646, 146:40683).
 */
const VIEWS = [
  { src: require('assets/tutorial/task-board.png').default, title: () => LOCALE.TASK_CARD_BOARD },
  { src: require('assets/tutorial/task-calendar.png').default, title: () => LOCALE.TASK_CARD_CALENDAR },
  { src: require('assets/tutorial/task-gantt.png').default, title: () => LOCALE.TASK_CARD_GANTT },
  { src: require('assets/tutorial/task-list.png').default, title: () => LOCALE.TASK_CARD_LIST },
  { src: require('assets/tutorial/task-health.png').default, title: () => LOCALE.TASK_CARD_HEALTH },
];

module.exports = function (ui, screen = {}) {
  if (screen.dialog) return newTask(ui);
  return emptyState(ui, {
    title: LOCALE.TASK_HERO_TITLE,
    desc: LOCALE.TASK_HERO_DESC,
    cta: LOCALE.CREATE_FIRST_TASK,
    // Narrow, so the headline's three hard lines have room to be three lines.
    hero: 'narrow',
    items: VIEWS.map((v) => ({ ...v, title: v.title() })),
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
