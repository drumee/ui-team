// tests/chat-toast-layer.test.js — the direct-message toast mounts in the
// window manager's toast layer, not among the windows.
//
//   node --test tests/chat-toast-layer.test.js
//
// While a workspace pane is open the headless layer takes the active-window
// lift over windowsLayer; the two are sibling stacking contexts, so a card
// appended to windowsLayer is painted under the Task board / file grid no
// matter its own z-index. The meeting toast already mounts in the dedicated
// layer (Wm.getMeetingToastPool); the chat toast has to use the same one.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/panel/activity/chat-toast.js"),
  "utf8",
);

// Top-level function, so tests/helpers/slice-method (2-space methods) does
// not apply: cut from its own `function` line to the first unindented `}`.
function sliceTopLevel(src, name) {
  const start = src.indexOf(`\nfunction ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = src.indexOf("\n}\n", start);
  return src.slice(start, end + 3).trim();
}

const mountCard = new Function(
  "Wm", "_", "killChatToast", "bindCardClicks", "setTimeout",
  `return (${sliceTopLevel(SRC, "mountCard")});`,
);

function layer(name) {
  return { name, append: (skl) => ({ name, skl, el: {} }) };
}

test("the card lands in the toast layer when the desk has one", () => {
  const toastLayer = layer("toast");
  const Wm = { windowsLayer: layer("windows"), getMeetingToastPool: () => toastLayer };
  const host = {};
  const fn = mountCard(Wm, { isFunction: (f) => typeof f === "function" }, () => {}, () => {}, () => 0);
  const card = fn(host, () => ({ kind: "card" }), 0);
  assert.equal(card.name, "toast");
  assert.equal(host._chatToast, card);
});

test("without a desk it still falls back to windowsLayer", () => {
  const Wm = { windowsLayer: layer("windows") };
  const fn = mountCard(Wm, { isFunction: (f) => typeof f === "function" }, () => {}, () => {}, () => 0);
  const card = fn({}, () => ({ kind: "card" }), 0);
  assert.equal(card.name, "windows");
});
