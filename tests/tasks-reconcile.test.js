// tasks-reconcile.test.js — the keyed repaint behind the task board.
//
//   node --test tests/tasks-reconcile.test.js
//
// Real Backbone collections; a minimal stand-in for Marionette's
// CollectionView that does what the reconciler relies on: builds a child view
// per added model, destroys/detaches on remove, re-orders on sort().
const test = require("node:test");
const assert = require("node:assert/strict");
const Backbone = require("backbone");
const { stamp, reconcile } = require("../src/drumee/builtins/window/tasks/reconcile");

let built = 0;
let seq = 0;

class FakeView {
  constructor(model) {
    this.model = model;
    this.cid = `v${++seq}`;
    this.el = { parentNode: null, view: this };
    this._destroyed = false;
    built++;
    if (model.get("kind") === "box") {
      this.collection = new Backbone.Collection();
      this._views = new Map();
      this.children = { findByModel: (m) => this._views.get(m.cid) };
      this.collection.on("update", (c, opt) => this._onUpdate(opt.changes));
      const kids = model.get("kids") || [];
      this.collection.set(kids.filter((k) => k && k.kind));
    }
  }
  _onUpdate({ added, removed }) {
    for (const m of removed) {
      const v = this._views.get(m.cid);
      if (v) v.destroy();
      this._views.delete(m.cid);
    }
    for (const m of added) {
      const v = new FakeView(m);
      v.el.parentNode = this.el;
      this._views.set(m.cid, v);
    }
    this.sort();
  }
  sort() {
    this.order = this.collection.models.map((m) => this._views.get(m.cid));
  }
  isDestroyed() {
    return this._destroyed;
  }
  destroy() {
    this._destroyed = true;
    this.el.parentNode = null;
  }
  // test helpers
  kid(i) {
    return this.order[i];
  }
}

const box = (className, kids, extra = {}) => ({ kind: "box", className, kids, ...extra });
const note = (className, content) => ({ kind: "note", className, content });
const card = (t) =>
  box("card", [note("title", t.title), box("foot", [note("status", t.status)])], {
    dataset: { tid: t.id },
  });
const board = (cols) =>
  box("main", cols.map((c) => box("column", c.tasks.map(card), { dataset: { col: c.key } })));

function mount(tree) {
  stamp(tree);
  const root = new FakeView(new Backbone.Model({ kind: "box", kids: [] }));
  root.el.parentNode = {};
  reconcile(root, [tree]);
  return root;
}

function paint(root, tree) {
  stamp(tree);
  built = 0;
  const stats = { kept: 0, built: 0, removed: 0 };
  assert.equal(reconcile(root, [tree], stats), true);
  return { built, stats };
}

const TASKS = () => [
  { key: "todo", tasks: [{ id: 1, title: "a", status: "todo" }, { id: 2, title: "b", status: "todo" }] },
  { key: "done", tasks: [{ id: 3, title: "c", status: "done" }] },
];

test("an identical repaint builds nothing and keeps every view", () => {
  const root = mount(board(TASKS()));
  const cardA = root.kid(0).kid(0).kid(0);
  const { built: n } = paint(root, board(TASKS()));
  assert.equal(n, 0);
  assert.equal(root.kid(0).kid(0).kid(0), cardA);
});

test("editing one task rebuilds only the leaf that changed", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(0);
  const cardA = col.kid(0);
  const cardB = col.kid(1);
  const foot = cardA.kid(1);
  const cols = TASKS();
  cols[0].tasks[0].title = "a2";
  const { built: n } = paint(root, board(cols));
  assert.equal(n, 1, "only the title note");
  assert.equal(col.kid(0), cardA, "card view kept");
  assert.equal(cardA.kid(1), foot, "untouched sibling subtree kept");
  assert.equal(col.kid(1), cardB);
  assert.equal(cardA.kid(0).model.get("content"), "a2");
});

test("deleting a task removes one card and keeps the rest", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(0);
  const cardB = col.kid(1);
  const doomed = col.kid(0);
  const cols = TASKS();
  cols[0].tasks.shift();
  const { built: n, stats } = paint(root, board(cols));
  assert.equal(n, 0);
  assert.equal(stats.removed, 1);
  assert.equal(doomed.isDestroyed(), true);
  assert.equal(col.order.length, 1);
  assert.equal(col.kid(0), cardB);
});

test("creating a task builds exactly one card", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(1);
  const cardC = col.kid(0);
  const cols = TASKS();
  cols[1].tasks.unshift({ id: 4, title: "d", status: "done" });
  const { built: n } = paint(root, board(cols));
  assert.equal(n, 4, "card + title + foot + status");
  assert.equal(col.order.length, 2);
  assert.equal(col.kid(1), cardC);
  assert.equal(col.kid(0).model.get("dataset").tid, 4);
});

test("a pure reorder moves views without building any", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(0);
  const [a, b] = [col.kid(0), col.kid(1)];
  const cols = TASKS();
  cols[0].tasks.reverse();
  const { built: n } = paint(root, board(cols));
  assert.equal(n, 0);
  assert.deepEqual(col.order, [b, a]);
});

test("a card whose element was moved away by hand is rebuilt, not trusted", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(0);
  const a = col.kid(0);
  a.el.parentNode = root.kid(0).kid(1).el; // the drag path moved it
  const { built: n } = paint(root, board(TASKS()));
  assert.ok(n >= 1);
  assert.notEqual(col.kid(0), a);
  assert.equal(a.isDestroyed(), true);
});

test("a part fed by hand is brought back to the skeleton", () => {
  const root = mount(board(TASKS()));
  const col = root.kid(0).kid(1);
  // Something outside the reconciler fed the column (no stamps on these).
  col.collection.set([note("x", "hand-fed")]);
  const { built: n } = paint(root, board(TASKS()));
  assert.ok(n >= 1);
  assert.equal(col.order.length, 1);
  assert.equal(col.kid(0).model.get("className"), "card");
});

test("a node carrying a function is never reused", () => {
  const tree = () => box("main", [note("list", "x")].map((n) => ({ ...n, api: () => 1 })));
  const root = mount(tree());
  const list = root.kid(0).kid(0);
  paint(root, tree());
  assert.notEqual(root.kid(0).kid(0), list);
});

test("the panel handler hashes by cid, so uiHandler:[ui] does not defeat reuse", () => {
  const ui = { cid: "view7", el: {} };
  ui.self = ui; // circular, like a real view
  const tree = () => box("main", [{ ...note("n", "x"), uiHandler: [ui] }]);
  const root = mount(tree());
  const n = root.kid(0).kid(0);
  paint(root, tree());
  assert.equal(root.kid(0).kid(0), n);
});

test("switching the whole view replaces it", () => {
  const root = mount(board(TASKS()));
  const main = root.kid(0);
  paint(root, box("list", [note("row", "a")]));
  assert.equal(main.isDestroyed(), true);
  assert.equal(root.kid(0).model.get("className"), "list");
});
