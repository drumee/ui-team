// The chat widget stamps data-painted once its first page of messages is in,
// so the folder window's chat column can wait for it on a default load instead
// of sliding in as a header over an empty column (widget_chat is a lazy kind,
// and it fetches media.home before it even builds its message list).
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(require.resolve("../src/drumee/builtins/widget/chat/index.js"), "utf8");

test("the message list's first ready stamps data-painted on the chat widget", () => {
  assert.match(
    SRC,
    /child\.once\(_e\.ready, \(\) => \{\n\s*this\.scrollMessagesToBottom\(child\);\n(?:\s*\/\/.*\n)*\s*if \(this\.el && this\.el\.dataset\) this\.el\.dataset\.painted = "1";/,
  );
});

test("a load that never readies does not leave the chat column hidden", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const m = SRC.match(/\n  onDomRefresh\(\) \{\n([\s\S]*?)\n  \}\n/);
  assert.ok(m, "onDomRefresh not found");
  const run = new Function("SERVICE", "_a", "require", m[1]);
  const el = { dataset: {} };
  const chat = {
    el,
    hubId: "hub-1",
    isDestroyed: () => false,
    fetchService: () => new Promise(() => {}), // media.home never answers
  };
  run.call(chat, { media: { home: "media.home" } }, { home: "home", nid: "nid" }, () => () => ({}));
  t.mock.timers.tick(3999);
  assert.equal(el.dataset.painted, undefined, "not before the fallback");
  t.mock.timers.tick(1);
  assert.equal(el.dataset.painted, "1");
});

test("the fallback does not touch a widget that already painted", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const m = SRC.match(/\n  onDomRefresh\(\) \{\n([\s\S]*?)\n  \}\n/);
  const run = new Function("SERVICE", "_a", "require", m[1]);
  let writes = 0;
  const dataset = new Proxy({ painted: "1" }, { set(target, k, v) { writes++; target[k] = v; return true; } });
  const chat = { el: { dataset }, hubId: "h", isDestroyed: () => false, fetchService: () => new Promise(() => {}) };
  run.call(chat, { media: { home: "x" } }, { home: "home", nid: "nid" }, () => () => ({}));
  t.mock.timers.tick(4000);
  assert.equal(writes, 0);
});
