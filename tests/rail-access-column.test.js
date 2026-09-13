const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const _ = require("lodash");

const SRC = fs.readFileSync(require.resolve("../src/drumee/modules/desk/index.js"), "utf8");
const m = SRC.match(/\n  async _railAccess\(opt\) \{\n([\s\S]*?)\n  \}\n/);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const railAccess = new AsyncFunction("opt", "_", m[1]);

function desk(workspace) {
  const calls = [];
  return {
    calls,
    el: { dataset: {} },
    isDestroyed: () => false,
    _navigated: () => calls.push("navigated"),
    _railWorkspace: () => workspace,
    _leaveSectionScreen: () => calls.push("leaveSection"),
    _openDefaultWorkspace: () => calls.push("openDefault"),
    _endWindowTourUnlessAbout: (t) => calls.push(`endTour:${t}`),
    _whenToursIdle: async () => calls.push("toursIdle"),
  };
}
function workspace() {
  const calls = [];
  return {
    calls,
    isDestroyed: () => false,
    showFolderTab: (t) => calls.push(`tab:${t}`),
    raise: () => calls.push("raise"),
    onUiEvent: (_w, args) => calls.push(`ui:${args.service}:${args.members}`),
  };
}

test("the rail's Access shows the Access view of the workspace", async () => {
  const w = workspace();
  const d = desk(w);
  await railAccess.call(d, { members: 1 }, _);
  assert.deepEqual(w.calls, ["tab:access", "raise"]);
  assert.equal(d.el.dataset.mtab, "access");
  assert.deepEqual(d.calls, ["navigated", "leaveSection", "endTour:access", "toursIdle"]);
});

test("the header's link icon still opens the manage-access drawer", async () => {
  const w = workspace();
  await railAccess.call(desk(w), undefined, _);
  assert.deepEqual(w.calls, ["ui:folder-manage-access:0"]);
});

test("no workspace open: opens the default one and nothing else", async () => {
  const d = desk(null);
  await railAccess.call(d, { members: 1 }, _);
  assert.deepEqual(d.calls, ["navigated", "leaveSection", "openDefault"]);
});
