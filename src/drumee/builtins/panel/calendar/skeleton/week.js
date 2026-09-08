// Week view — the hour canvas with seven columns. Figma 58222:171611.
const hourGrid = require("./hours");
const { day } = require("./helpers");

module.exports = function (ui) {
  const anchor = day(ui.getCursor()) || Dayjs();
  const start = anchor.startOf("week");
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  return hourGrid(ui, days, "week");
};
