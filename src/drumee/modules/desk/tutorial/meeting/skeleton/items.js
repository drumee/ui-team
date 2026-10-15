/**
 * The two meeting previews — shared by the desk empty state (./index.js) and
 * the phone deck (./phone.js).
 */
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

module.exports = { ITEMS };
