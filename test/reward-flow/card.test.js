const { test } = require("node:test");
const assert = require("node:assert");
const { services, contents, byClass } = require("./_stubs");

const stepCard = require("../../src/drumee/builtins/widget/reward-flow/skeleton/card");

const ui = (step, furthest) => ({
  fig: { family: "reward-flow" },
  getStep: () => step,
  getFurthest: () => furthest,
});

test("step1 shows the continue button and no back button", () => {
  const tree = stepCard(ui("step1", 1));
  assert.deepEqual(services(tree), ["reward-continue"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP1_TITLE));
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP1_DESC));
});

test("step2 shows back then upload, in that order", () => {
  const tree = stepCard(ui("step2", 2));
  assert.deepEqual(services(tree), ["reward-back", "reward-upload"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP2_TITLE));
});

test("step3 shows back then invite, in that order", () => {
  const tree = stepCard(ui("step3", 3));
  assert.deepEqual(services(tree), ["reward-back", "reward-invite"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP3_TITLE));
});

test("progress bar always has 3 segments", () => {
  for (const [step, furthest] of [["step1", 1], ["step2", 2], ["step3", 3]]) {
    const segs = byClass(stepCard(ui(step, furthest)), "__progress-seg");
    assert.equal(segs.length, 3, `${step} should render 3 segments`);
  }
});

test("progress segments fill up to furthest, never beyond", () => {
  const on = (furthest) =>
    byClass(stepCard(ui("step1", furthest)), "__progress-seg")
      .map((n) => n.dataset.on);
  assert.deepEqual(on(1), ["1", "0", "0"]);
  assert.deepEqual(on(2), ["1", "1", "0"]);
  assert.deepEqual(on(3), ["1", "1", "1"]);
});

test("waiting states keep back but drop the primary action", () => {
  assert.deepEqual(services(stepCard(ui("step2_waiting", 2))), ["reward-back"]);
  assert.deepEqual(services(stepCard(ui("step3_waiting", 3))), ["reward-back"]);
});

test("waiting states show the waiting hint", () => {
  assert.ok(
    contents(stepCard(ui("step2_waiting", 2)))
      .includes(LOCALE.REWARD_FLOW_WAITING_UPLOAD),
  );
  assert.ok(
    contents(stepCard(ui("step3_waiting", 3)))
      .includes(LOCALE.REWARD_FLOW_WAITING_INVITE),
  );
});

test("every className is derived from fig.family", () => {
  const tree = stepCard({
    fig: { family: "xx-yy" },
    getStep: () => "step2",
    getFurthest: () => 2,
  });
  const bad = byClass(tree, "reward-flow");
  assert.equal(bad.length, 0, "found a hardcoded reward-flow prefix");
});
