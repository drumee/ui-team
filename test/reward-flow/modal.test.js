const { test } = require("node:test");
const assert = require("node:assert");
const { flatten, services, contents, byClass } = require("./_stubs");

const { dropModal, congratsModal } =
  require("../../src/drumee/builtins/widget/reward-flow/skeleton/modal");

const ui = { fig: { family: "reward-flow" } };

test("drop modal offers leave then stay, in that order", () => {
  const tree = dropModal(ui);
  assert.deepEqual(services(tree), ["reward-drop-leave", "reward-drop-stay"]);
});

test("drop modal carries its title and description", () => {
  const c = contents(dropModal(ui));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_DROP_TITLE));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_DROP_DESC));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_DROP_LEAVE));
});

test("congrats modal has exactly one action", () => {
  assert.deepEqual(services(congratsModal(ui)), ["reward-finish"]);
});

test("congrats modal renders all three copy segments", () => {
  const c = contents(congratsModal(ui));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_CONGRATS_TITLE));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_CONGRATS_LEAD));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_CONGRATS_PRIZE));
  assert.ok(c.includes(LOCALE.REWARD_FLOW_CONGRATS_TAIL));
});

test("the prize segment is separately styled so it can take the accent", () => {
  assert.equal(byClass(congratsModal(ui), "__congrats-prize").length, 1);
});

test("modal classNames derive from fig.family", () => {
  // Positive assertion, not just absence of the real prefix: a hardcoded
  // wrong prefix must fail this test, not slip through.
  const other = { fig: { family: "xx-yy" } };
  for (const build of [dropModal, congratsModal]) {
    const tree = build(other);
    const classed = flatten(tree).filter((n) => typeof n.className === "string");
    assert.ok(classed.length >= 4, "expected several classed nodes");
    for (const n of classed) {
      for (const cls of n.className.split(/\s+/)) {
        assert.ok(
          cls.startsWith("xx-yy__"),
          `className "${cls}" should start with "xx-yy__"`,
        );
      }
    }
    assert.equal(byClass(tree, "reward-flow").length, 0);
  }
});
