// Meeting tab content (Figma 2616-238317): the schedule/calendar view. The
// call itself is no longer embedded here — starting or joining a meeting opens
// the standalone floating window (_launchMeetingStandalone), which overlays
// this schedule exactly like the Figma frames show.
module.exports = function meetingPanel(ui) {
  return require("./meeting-schedule")(ui);
};
