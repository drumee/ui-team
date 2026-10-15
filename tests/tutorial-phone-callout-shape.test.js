// Callout shapes the Figma phone workspace frames need: centred copy
// (380:54800, 385:938) and a card with no controls at all when the field or
// Create is the way forward.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");
const node = (type) => (o = {}) => ({ type, ...o });
global.Skeletons = { Box: { X: node("X"), Y: node("Y") }, Note: node("Note") };
global.LOCALE = { BACK: "Back", NEXT: "Next", DONE: "Done" };
// tooltip.js is an ES module; strip `export` so node can load it as a script.
const srcT = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/skeleton/toolkit/tooltip.js"), "utf8")
  .replace(/^export function/gm, "function") + "\nmodule.exports = { tooltipBubble };";
const m = { exports: {} };
new Function("module", "exports", "require", srcT)(m, m.exports, require);
const { tooltipBubble } = m.exports;
test.after(() => { delete global.Skeletons; delete global.LOCALE; });

const ui = { fig: { group: "tutorial" } };
const has = (t, cls) => {
  if (!t || typeof t !== "object") return false;
  if (typeof t.className === "string" && t.className.split(/\s+/).includes(cls)) return true;
  return (t.kids || []).some((k) => has(k, cls));
};

test("align: 'center' marks the card", () => {
  assert.ok(tooltipBubble(ui, { text: "x", align: "center" }).className.includes("tutorial__bubble-card--center"));
  assert.ok(!tooltipBubble(ui, { text: "x" }).className.includes("--center"));
});

test("no footer at all when both Back and Next are hidden", () => {
  assert.equal(has(tooltipBubble(ui, { text: "x", hide_back: true, hide_next: true }), "tutorial__bubble-footer"), false);
  assert.equal(has(tooltipBubble(ui, { text: "x", hide_back: true }), "tutorial__bubble-footer"), true);
});

test("spotlight passes phone_margin / phone_gap to phoneAnchor", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/spotlight/index.js"), "utf8");
  assert.match(src, /margin: a\.phone_margin, gap: a\.phone_gap, prefer: a\.phone_prefer/);
});
