// tests/helpers/slice-method.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { sliceFunction } = require("./slice-method");

const SRC = `
class X {
  foo(a) {
    return a + 1;
  }

  async bar(b = {}) {
    return b.v;
  }
}
`;

test("slices a sync method into a function expression", () => {
  const fn = new Function(`return ${sliceFunction(SRC, "foo(a)")}`)();
  assert.equal(fn(1), 2);
});

test("slices an async method with default params", async () => {
  const fn = new Function(`return ${sliceFunction(SRC, "async bar(b = {})")}`)();
  assert.equal(await fn({ v: 3 }), 3);
});

test("throws on a missing method", () => {
  assert.throws(() => sliceFunction(SRC, "nope()"), /nope\(\) not found/);
});
