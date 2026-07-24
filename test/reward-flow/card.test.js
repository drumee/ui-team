const { test } = require("node:test");
const assert = require("node:assert");
const { services, contents, byClass } = require("./_stubs");

const stepCard = require("../../src/drumee/builtins/widget/reward-flow/skeleton/card");

const ui = (step) => ({
  fig: { family: "reward-flow" },
  getStep: () => step,
});

test("step1 shows the continue button and no back button", () => {
  const tree = stepCard(ui("step1"));
  assert.deepEqual(services(tree), ["reward-continue"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP1_TITLE));
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP1_DESC));
});

test("step2 shows back then upload, in that order", () => {
  const tree = stepCard(ui("step2"));
  assert.deepEqual(services(tree), ["reward-back", "reward-upload"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP2_TITLE));
});

test("step3 shows back then invite, in that order", () => {
  const tree = stepCard(ui("step3"));
  assert.deepEqual(services(tree), ["reward-back", "reward-invite"]);
  assert.ok(contents(tree).includes(LOCALE.REWARD_FLOW_STEP3_TITLE));
});

test("progress bar always has 3 segments", () => {
  for (const step of ["step1", "step2", "step3"]) {
    const segs = byClass(stepCard(ui(step)), "__progress-seg");
    assert.equal(segs.length, 3, `${step} should render 3 segments`);
  }
});

test("progress fills to the current step: 1 lights 1, 2 lights 2, 3 lights 3", () => {
  const on = (step) =>
    byClass(stepCard(ui(step)), "__progress-seg").map((n) => n.dataset.on);
  assert.deepEqual(on("step1"), ["1", "0", "0"]);
  assert.deepEqual(on("step2"), ["1", "1", "0"]);
  assert.deepEqual(on("step3"), ["1", "1", "1"]);
});

test("a waiting state keeps its own step's progress", () => {
  const on = (step) =>
    byClass(stepCard(ui(step)), "__progress-seg").map((n) => n.dataset.on);
  assert.deepEqual(on("step2_waiting"), ["1", "1", "0"]);
  assert.deepEqual(on("step3_waiting"), ["1", "1", "1"]);
});

test("waiting states keep back but drop the primary action", () => {
  // step1's active card has no Back, but its waiting card must still show one
  // (the user has been handed off to the real new-workspace dialog).
  assert.deepEqual(services(stepCard(ui("step1_waiting"))), ["reward-back"]);
  assert.deepEqual(services(stepCard(ui("step2_waiting"))), ["reward-back"]);
  assert.deepEqual(services(stepCard(ui("step3_waiting"))), ["reward-back"]);
});

test("waiting states show the waiting hint", () => {
  assert.ok(
    contents(stepCard(ui("step1_waiting")))
      .includes(LOCALE.REWARD_FLOW_WAITING_WORKSPACE),
  );
  assert.ok(
    contents(stepCard(ui("step2_waiting")))
      .includes(LOCALE.REWARD_FLOW_WAITING_UPLOAD),
  );
  assert.ok(
    contents(stepCard(ui("step3_waiting")))
      .includes(LOCALE.REWARD_FLOW_WAITING_INVITE),
  );
});

test("every className is derived from fig.family", () => {
  const tree = stepCard({
    fig: { family: "xx-yy" },
    getStep: () => "step2",
  });

  const bad = byClass(tree, "reward-flow");
  assert.equal(bad.length, 0, "found a hardcoded reward-flow prefix");

  const card = byClass(tree, "__card");
  const segs = byClass(tree, "__progress-seg");
  const title = byClass(tree, "__title");
  const buttons = byClass(tree, "__btn");

  assert.equal(card.length, 1, "expected the card root node");
  assert.equal(segs.length, 3, "expected 3 progress segments");
  assert.equal(title.length, 1, "expected the title node");
  assert.equal(buttons.length, 2, "expected the back and primary footer buttons");

  for (const n of [...card, ...segs, ...title, ...buttons]) {
    assert.ok(
      n.className.startsWith("xx-yy__"),
      `expected className "${n.className}" to start with "xx-yy__", got a hardcoded prefix instead`,
    );
  }
});

test("primaryServiceFor resolves a step's primary button service", () => {
  assert.equal(stepCard.primaryServiceFor("step2"), "reward-upload");
  assert.equal(stepCard.primaryServiceFor("step3"), "reward-invite");
  // Waiting variants resolve to their base step's service.
  assert.equal(stepCard.primaryServiceFor("step2_waiting"), "reward-upload");
  assert.equal(stepCard.primaryServiceFor("nope"), undefined);
});

test("primaryServiceFor matches what the card's primary button fires", () => {
  // The cutout over the step's topbar control fires this service so clicking
  // the spotlighted button behaves exactly like clicking the card's button —
  // these two must not drift apart.
  for (const step of ["step2", "step3"]) {
    const fired = services(stepCard(ui(step)));
    assert.equal(stepCard.primaryServiceFor(step), fired.at(-1));
  }
});
