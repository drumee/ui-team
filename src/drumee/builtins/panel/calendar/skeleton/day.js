// Day view — one day cell on the board: meetings in a row, task cards in
// columns under them. Figma 2066:180690.
const board = require("./board");
const { day } = require("./helpers");

module.exports = function (ui) {
  const anchor = day(ui.getCursor()) || Dayjs();
  return board(ui, [anchor.startOf("day")], "day");
};
