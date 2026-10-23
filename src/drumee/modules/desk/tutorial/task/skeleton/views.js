/**
 * The five tracker views the task carousel walks — shared by the desk empty
 * state (./index.js) and the phone deck (./phone.js).
 */
const VIEWS = [
  { key: 'board', title: () => LOCALE.TASK_CARD_BOARD },
  { key: 'calendar', title: () => LOCALE.TASK_CARD_CALENDAR },
  { key: 'gantt', title: () => LOCALE.TASK_CARD_GANTT },
  { key: 'list', title: () => LOCALE.TASK_CARD_LIST },
  { key: 'health', title: () => LOCALE.TASK_CARD_HEALTH },
];

module.exports = { VIEWS };
