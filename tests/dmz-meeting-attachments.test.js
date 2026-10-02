// tests/dmz-meeting-attachments.test.js
//   node --test tests/dmz-meeting-attachments.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") } };
global.LOCALE = new Proxy({}, { get: (_t, k) => k });
const mod = require(path.join(__dirname, "../src/drumee/modules/dmz/meeting/skeleton/attachments.js"));
const ui = { fig: { family: "dmz-meeting" } };
const walk = (n, out = []) => { if (n && typeof n === "object") { out.push(n); for (const k of [].concat(n.kids || [])) walk(k, out); } return out; };

test("nothing attached → nothing drawn", () => {
  assert.equal(mod(ui, [], "h"), null);
  assert.equal(mod(ui, undefined, "h"), null);
});

test("one row per file, wired to open it", () => {
  const tree = mod(ui, [{ nid: "n1", filename: "a", ext: "pdf", filesize: 2048 }], "h1");
  const rows = walk(tree).filter((n) => n.service === "dmz-open-attachment");
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].fileNid, rows[0].fileHub], ["n1", "h1"]);
  assert.ok(walk(tree).some((n) => n.content === "a.pdf"));
});

test("fileUrl adds keysel only when there is one", () => {
  assert.equal(mod.fileUrl("n1", "h1", { endpoint: "https://x/-/" }), "https://x/-/file/orig/n1/h1");
  assert.equal(mod.fileUrl("n1", "h1", { endpoint: "https://x/-/", keysel: "k" }), "https://x/-/file/orig/n1/h1?keysel=k");
});
