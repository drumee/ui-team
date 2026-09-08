// Day view — the hour canvas with a single column, so concurrent items lay out
// side by side across the full width. Figma 58222:172317.
const hourGrid = require("./hours");
const { day } = require("./helpers");

module.exports = function (ui) {
  const anchor = day(ui.getCursor()) || Dayjs();
  return hourGrid(ui, [anchor.startOf("day")], "day");
};
