// window-row-sections.test.js — the row view's Folders / Files headings.
//
//   node --test tests/window-row-sections.test.js
//
// The skin splits the row list by type (flex order) and draws the headings
// from data-label-* on the list's container; window/core _labelRowSections
// writes them. Runs the real method against stub lists.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/core.js"), "utf8")
  .replace(/\r\n/g, "\n");
const label = new Function(
  "_e", "LOCALE",
  `return ${sliceFunction(SRC, "_labelRowSections(list)")}`,
)({ ready: "ready" }, { FOLDERS: "Folders", FILES: "Files" });

function list(cls, box) {
  const handlers = {};
  return {
    el: {
      classList: { contains: (c) => c === cls },
      querySelector: (sel) => (sel === ".smart-container" ? box() : null),
    },
    once(ev, f) { handlers[ev] = f; },
    fire(ev) { handlers[ev] && handlers[ev](); },
  };
}
const win = { fig: { group: "window" }, _labelRowSections: label };

test("labels the row list's container", () => {
  const box = { dataset: {} };
  win._labelRowSections(list("window__content-row", () => box));
  assert.deepEqual(box.dataset, { labelFolders: "Folders", labelFiles: "Files" });
});

test("leaves any other list alone (the grid partitions its own way)", () => {
  const box = { dataset: {} };
  win._labelRowSections(list("window__icons-list", () => box));
  assert.deepEqual(box.dataset, {});
});

test("waits for the list to be ready when its container is not there yet", () => {
  let box = null;
  const l = list("window__content-row", () => box);
  win._labelRowSections(l);
  box = { dataset: {} };
  l.fire("ready");
  assert.equal(box.dataset.labelFiles, "Files");
});
