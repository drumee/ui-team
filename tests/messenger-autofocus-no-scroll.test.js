// messenger-autofocus-no-scroll.test.js — the composer's autofocus must not
// scroll its ancestors. ui-core's editable autofocus calls a plain focus(),
// which scrolls every scrollable ancestor to reveal the composer: on a phone
// the folder's Files view is a two-page carousel (files, Team Chat), so a
// reload slid it to the chat page. The messenger now owns the autofocus and
// focuses with preventScroll.
//
//   node --test tests/messenger-autofocus-no-scroll.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee/builtins/messenger");
const js = fs.readFileSync(path.join(SRC, "index.js"), "utf8");
const sk = fs.readFileSync(path.join(SRC, "skeleton/index.js"), "utf8");

const method = (name, args = "") => {
  const m = js.match(new RegExp(`\\n {2}${name}\\(${args}\\) \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`));
  assert.ok(m, `${name} defined`);
  return m[1];
};

test("the RichText is no longer asked to autofocus (that path scrolls ancestors)", () => {
  const rich = sk.slice(sk.indexOf("Skeletons.RichText("));
  const block = rich.slice(0, rich.indexOf("})"));
  assert.doesNotMatch(block, /autofocus: ui\.mget\('autofocus'\)/);
});

test("autofocus focuses the composer with preventScroll and puts the caret at the end", () => {
  const body = method("_autofocus", "tries = 0");
  const calls = [];
  const ranges = [];
  const el = { isConnected: true, textContent: "draft", focus: (o) => calls.push(o) };
  const doc = {
    createRange: () => ({ selectNodeContents(n) { this.n = n; }, collapse(toStart) { this.toStart = toStart; } }),
    getSelection: () => ({ removeAllRanges() {}, addRange: (r) => ranges.push(r) }),
  };
  const ctx = { isDestroyed: () => false, __content: { content: el } };
  new Function("document", "tries", body).call(ctx, doc, 0);
  assert.deepEqual(calls, [{ preventScroll: true }]);
  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].n, el);
  assert.equal(ranges[0].toStart, false, "collapsed to the end");
});

test("autofocus is scheduled only when asked, and cancelled on destroy", () => {
  assert.match(method("onDomRefresh"), /if \(this\.mget\('autofocus'\)\) \{[\s\S]*_\.delay\(\(\) => this\._autofocus\(\), Visitor\.timeout\(1000\)\)/);
  assert.match(method("onBeforeDestroy"), /clearTimeout\(this\._autofocusTimer\)/);
});
