/**
 * libs/guided-flow/steps + descriptor — the two pure modules a guided flow
 * leans on for its state names and for the workspace it carries between steps.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  baseStep, isWaiting, isGuiding,
} = require("../src/drumee/libs/guided-flow/steps");
const {
  readDescriptor, FIELDS,
} = require("../src/drumee/libs/guided-flow/descriptor");

// ───────── steps ─────────

test("baseStep strips both suffixes", () => {
  assert.equal(baseStep("step1"), "step1");
  assert.equal(baseStep("step2_waiting"), "step2");
  // The case that sent a reloading user back to the start of the flow when
  // only _waiting was stripped.
  assert.equal(baseStep("step3_guide"), "step3");
});

test("baseStep answers '' for nothing at all", () => {
  assert.equal(baseStep(undefined), "");
  assert.equal(baseStep(null), "");
  assert.equal(baseStep(""), "");
});

test("baseStep strips only a TRAILING suffix", () => {
  assert.equal(baseStep("step1_guide_extra"), "step1_guide_extra");
  assert.equal(baseStep("_waiting"), "");
});

test("baseStep strips one suffix, not both", () => {
  // Nothing produces this name; the point is that the regex is anchored and
  // single-shot rather than looping.
  assert.equal(baseStep("step1_guide_waiting"), "step1_guide");
});

test("isWaiting / isGuiding read their own suffix and no other", () => {
  assert.equal(isWaiting("step2_waiting"), true);
  assert.equal(isWaiting("step2_guide"), false);
  assert.equal(isWaiting("step2"), false);
  assert.equal(isGuiding("step1_guide"), true);
  assert.equal(isGuiding("step1_waiting"), false);
  assert.equal(isGuiding("congrats"), false);
});

test("the suffix tests survive a missing step", () => {
  assert.equal(isWaiting(undefined), false);
  assert.equal(isGuiding(null), false);
});

// ───────── descriptor ─────────

test("a full descriptor round-trips through JSON", () => {
  const raw = JSON.stringify({
    hub_id: "42", nid: "7", area: "private", filename: "Team",
  });
  assert.deepEqual(readDescriptor(raw), {
    hub_id: "42", nid: "7", area: "private", filename: "Team",
  });
});

test("an object is accepted as readily as a string", () => {
  const d = readDescriptor({ hub_id: 42, nid: 7, area: "share", filename: "X" });
  assert.equal(d.hub_id, 42);
  assert.equal(d.nid, 7);
});

test("only the fields loadWorkspace reads are kept", () => {
  const d = readDescriptor({
    hub_id: "42", nid: "7", area: "private", filename: "Team",
    // Everything the server also sent, which would just rot in localStorage.
    owner: "someone", ctime: 12345, permission: {},
  });
  assert.deepEqual(Object.keys(d).sort(), [...FIELDS].sort());
});

test("missing hub_id or nid makes the descriptor unusable", () => {
  // loadWorkspace warns and bails without hub_id; without nid it resolves the
  // hub HOME root instead of the workspace.
  assert.equal(readDescriptor({ nid: "7" }), null);
  assert.equal(readDescriptor({ hub_id: "42" }), null);
});

test("the hub/0 placeholder is not a workspace root", () => {
  assert.equal(readDescriptor({ hub_id: "0", nid: "7" }), null);
  assert.equal(readDescriptor({ hub_id: "42", nid: 0 }), null);
  assert.equal(readDescriptor({ hub_id: "42", nid: "" }), null);
});

test("absent optional fields become empty strings, not undefined", () => {
  const d = readDescriptor({ hub_id: "42", nid: "7" });
  assert.equal(d.area, "");
  assert.equal(d.filename, "");
});

test("junk in storage is not fatal", () => {
  assert.equal(readDescriptor("{ truncated"), null);
  assert.equal(readDescriptor("[]"), null);
  assert.equal(readDescriptor("null"), null);
  assert.equal(readDescriptor(""), null);
  assert.equal(readDescriptor(null), null);
});
