const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(
  require.resolve("../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
const { showsFileGrid } = require("../src/drumee/builtins/window/folder/access-column");

// A class method's body: it opens on `\n  name(args) {\n` and closes on the first
// `\n  }\n` — nested blocks close on four spaces or more.
function methodBody(signature) {
  const esc = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = SRC.match(new RegExp(`\\n  ${esc} \\{\\n([\\s\\S]*?)\\n  \\}\\n`));
  assert.ok(m, `${signature} not found`);
  return m[1];
}

test("the folder window requires the Access view module", () => {
  assert.match(
    SRC,
    /const \{ ACCESS_TAB, showAccessColumn, showsFileGrid \} = require\("\.\/access-column"\);/,
  );
});

test("switchView mounts the Access column for the access tab", () => {
  assert.match(
    SRC,
    /case ACCESS_TAB:\n(?:\s*\/\/.*\n)*\s*showAccessColumn\(this, view\);\n\s*return;/,
  );
});

test("the list/grid toggle stays on Access", () => {
  assert.match(SRC, /viewCtrl\.el\.dataset\.visible = showsFileGrid\(tab\) \? "1" : "0";/);
});

test("+ New stays on Access for a member who may create", () => {
  const run = new Function("require", "showsFileGrid", "_a", methodBody("syncNewCtrlVisibility()"));
  const fakeRequire = (name) => {
    if (name === "libs/over-limit") return { isLocked: () => false };
    throw new Error(`unexpected require ${name}`);
  };
  for (const [tab, expected] of [
    [undefined, "1"], ["files", "1"], ["access", "1"], ["chat", "0"], ["task", "0"],
  ]) {
    const el = { dataset: {} };
    const win = {
      activeTab: tab,
      canUpload: () => true,
      getPart: () => ({ el, mget: () => ({}), mset() {} }),
    };
    run.call(win, fakeRequire, showsFileGrid, { dataset: "dataset" });
    assert.equal(el.dataset.visible, expected, `tab ${tab}`);
  }
});
