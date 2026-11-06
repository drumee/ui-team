// Week view — seven day cells on the board. Figma 1693:187899.
const board = require("./board");
const { day } = require("./helpers");

module.exports = function (ui) {
  const anchor = day(ui.getCursor()) || Dayjs();
  const start = anchor.startOf("week");
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  return board(ui, days, "week");
};
