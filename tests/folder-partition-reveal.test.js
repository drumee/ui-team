// tests/folder-partition-reveal.test.js — the Files grid is revealed as soon as
// _doPartition has something to show, so the pane is never blank between the
// loading skeleton going away (icons-loading: first data/eod) and the grid
// coming back.
//
//   node --test tests/folder-partition-reveal.test.js
//
// The bug: _prepareListPartition hides the list AND its .smart-container.
// A successful pass only re-showed the list; the container waited for
// _schedulePartitionCleanup (500ms, re-armed by every tile mutation). An empty
// folder never passed at all — the empty view carries no data-filetype — so
// it sat hidden through 30 x 100ms retries: 3s of blank pane before the empty
// state appeared.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/utils.js"),
  "utf8",
);

global._a = { hub: "hub", folder: "folder" };
global._ = require("underscore");

function el(className, dataset = {}) {
  return {
    className,
    dataset,
    style: {},
    children: [],
    classList: { contains: (c) => className.split(" ").includes(c) },
    appendChild(c) { this.children.push(c); },
    insertBefore(c) { this.children.push(c); },
    querySelector(sel) {
      if (sel === ".smart-container") return this._sc || null;
      const cls = sel.replace(/^:scope > /, "").replace(/^\./, "");
      return this.children.find((c) => c.classList.contains(cls)) || null;
    },
    querySelectorAll() { return []; },
  };
}

const doPartition = new Function(
  "isSectionElement",
  "sectionsFor",
  "setPartitionedStyle",
  "document",
  `return ${sliceFunction(SRC, "_doPartition(listPart)")}`,
)(
  (e) => /(^| )(workspace|folder|file)-section( |$)/.test(e.className),
  () => null,
  () => {},
  { createElement: () => el("") },
);

// The state _prepareListPartition leaves behind.
function hiddenList(kids) {
  const sc = el("smart-container", { partitioning: 1 });
  sc.style.visibility = "hidden";
  sc.children = kids;
  const listEl = el("window__icons-list");
  listEl.style.visibility = "hidden";
  listEl._sc = sc;
  const list = { el: listEl, collection: { indexOf: () => -1 }, children: { each() {} } };
  return { list, sc };
}

test("populated folder: a successful pass reveals the scroll container too", () => {
  const { list, sc } = hiddenList([
    el("tile", { filetype: "folder" }),
    el("tile", { filetype: "file" }),
  ]);
  assert.equal(doPartition.call({}, list), true);
  assert.equal(list.el.style.visibility, "visible");
  assert.equal(sc.style.visibility, "visible");
});

test("empty folder: the empty view is shown at once, not after the retries", () => {
  const { list, sc } = hiddenList([el("window__files-empty no-content")]);
  assert.equal(doPartition.call({}, list), true);
  assert.equal(list.el.style.visibility, "visible");
  assert.equal(sc.style.visibility, "visible");
  assert.equal(sc.dataset.partitioning, 0);
});

test("nothing rendered yet: still waits (retries / observer)", () => {
  const { list, sc } = hiddenList([]);
  assert.equal(doPartition.call({}, list), false);
  assert.equal(sc.style.visibility, "hidden");
});
