// Picking Task or Meeting in "+ New" closes the dropdown on screen, not only
// in state: the form openers cleared _openMenu but repainted the modal alone,
// so the menu stayed drawn — with its outside-click dismisser already gone.
// Runs the REAL methods against a stub `this`.
//
//   node --test tests/calendar-menu-item-closes.test.js
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = readFileSync(
  resolve(__dirname, "../src/drumee/builtins/panel/calendar/index.js"),
  "utf8",
);
const load = (sig, ...deps) =>
  new Function(...deps.map(([n]) => n), `return ${sliceFunction(SRC, sig)}`)(
    ...deps.map(([, v]) => v),
  );

const Dayjs = require("dayjs");
const ymd = (d) => d.format("YYYY-MM-DD");
const day = (s) => (s ? Dayjs(s) : null);

function makeHost() {
  const painted = { toolbar: 0, modal: 0 };
  const host = {
    _openMenu: "new",
    _cursor: "2026-11-01",
    _pendingDay: null,
    _menuDismiss: () => {},
    _unbindMenuDismiss() {
      this._menuDismiss = null;
    },
    _renderToolbar() {
      painted.toolbar++;
    },
    _renderModal() {
      painted.modal++;
    },
    _loadDoneColumns() {},
    _closeMenus: load("_closeMenus()"),
    _openTaskForm: load("_openTaskForm(row, { parentRow = null } = {})"),
    _openMeetingForm: load(
      "_openMeetingForm(row)",
      ["Dayjs", Dayjs],
      ["day", day],
      ["ymd", ymd],
    ),
  };
  return { host, painted };
}

for (const opener of ["_openTaskForm", "_openMeetingForm"]) {
  test(`${opener} from an open "+ New" repaints the toolbar closed`, () => {
    const { host, painted } = makeHost();
    host[opener](null);
    assert.strictEqual(host._openMenu, null);
    assert.strictEqual(painted.toolbar, 1);
    assert.strictEqual(painted.modal, 1);
  });

  test(`${opener} with no menu open leaves the toolbar alone`, () => {
    const { host, painted } = makeHost();
    host._openMenu = null;
    host[opener](null);
    assert.strictEqual(painted.toolbar, 0);
  });
}
