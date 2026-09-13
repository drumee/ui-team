// tests/helpers/load-esmish must load every export shape the skeletons reach.
const assert = require("node:assert/strict");
const test = require("node:test");
const { transform, requireEsmish } = require("./helpers/load-esmish");

function run(src, deps = {}) {
  const module = { exports: {} };
  const req = (name) => {
    if (name in deps) return deps[name];
    throw new Error(`unexpected require ${name}`);
  };
  new Function("module", "exports", "require", transform(src))(module, module.exports, req);
  return module.exports;
}

test("export function / const are re-exported (unchanged behaviour)", () => {
  const m = run("export function a() { return 1; }\nexport const b = 2;\n");
  assert.equal(m.a(), 1);
  assert.equal(m.b, 2);
});

test("export { … } lists are re-exported, `as` renames included", () => {
  const m = run("const x = 1;\nconst y = 2;\nexport { x, y as z };\n");
  assert.equal(m.x, 1);
  assert.equal(m.z, 2);
  assert.equal("y" in m, false);
});

test("export * from re-exports the named module, alongside own exports", () => {
  const m = run("export * from './perm';\nexport const own = 3;\n", {
    "./perm": { roleItems: [1, 2] },
  });
  assert.deepEqual(m.roleItems, [1, 2]);
  assert.equal(m.own, 3);
});

test("the permission toolkit loads with roleItems exported", () => {
  global._K = {
    privilege: { read: 3, chat: 7, write: 15, admin: 31 },
    permission: { admin: 16, write: 8, download: 4 },
  };
  global.LOCALE = new Proxy({}, { get: (_t, k) => String(k) });
  const perm = requireEsmish("src/drumee/builtins/skeleton/toolkit/permission.js");
  assert.equal(perm.roleItems.length, 4);
  assert.equal(perm.roleFromPrivilege(15).value, "edit");
});
