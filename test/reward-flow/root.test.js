const { test } = require("node:test");
const assert = require("node:assert");
const { flatten, byClass } = require("./_stubs");

const root = require("../../src/drumee/builtins/widget/reward-flow/skeleton/index");
const stepCard = require("../../src/drumee/builtins/widget/reward-flow/skeleton/card");

const tree = (step) => root({ fig: { family: "reward-flow" }, getStep: () => step });
const cutout = (t) =>
  flatten(t).find(
    (n) => typeof n.className === "string" && n.className.includes("__cutout"),
  );

test("steps 2 and 3 get a cutout over their topbar control", () => {
  for (const step of ["step2", "step3"]) {
    const t = tree(step);
    assert.equal(t.dataset.cutout, "1", `${step} should mark the cutout active`);
    assert.ok(cutout(t), `${step} should render a cutout`);
  }
});

test("the active cutout fires that step's primary service", () => {
  assert.equal(cutout(tree("step2")).service, stepCard.primaryServiceFor("step2"));
  assert.equal(cutout(tree("step3")).service, stepCard.primaryServiceFor("step3"));
});

test("the cutout survives the waiting state so the overlay and card stay put", () => {
  for (const step of ["step2_waiting", "step3_waiting"]) {
    const t = tree(step);
    assert.equal(t.dataset.cutout, "1", `${step} should keep the cutout`);
    assert.ok(cutout(t), `${step} should still render a cutout`);
  }
});

test("the waiting cutout is inert — the real uploader/popup is in play", () => {
  for (const step of ["step2_waiting", "step3_waiting"]) {
    assert.equal(
      cutout(tree(step)).service,
      undefined,
      `${step} must not intercept clicks meant for the real surface`,
    );
  }
});

test("step 1 has no target, so no cutout", () => {
  const t = tree("step1");
  assert.equal(t.dataset.cutout, "0");
  assert.equal(cutout(t), undefined);
});

test("the guiding cutout renders but never intercepts", () => {
  const t = tree("step1_guide");
  // Not a "targeted" step: the guide positions this cutout itself, and the user
  // must be able to click the real desk chrome through it.
  assert.equal(t.dataset.cutout, "0");
  assert.ok(cutout(t));
  assert.equal(cutout(t).service, undefined);
});

test("guiding shows the coach callout and no card; other steps show the card", () => {
  const guiding = tree("step1_guide");
  assert.equal(byClass(guiding, "__guide-callout").length, 1);
  assert.equal(byClass(guiding, "__card").length, 0);

  const active = tree("step2");
  assert.equal(byClass(active, "__guide-callout").length, 0);
  assert.equal(byClass(active, "__card").length, 1);
});

test("the connector arrow is gone for good", () => {
  for (const step of ["step1", "step2", "step3", "step1_guide"]) {
    assert.equal(byClass(tree(step), "__arrow").length, 0, `${step} still has an arrow`);
  }
});
