const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
require("./_stubs");

// ── minimal host stubs ──────────────────────────────────────────────────────
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const radio = { handlers: {} };
global.RADIO_MEDIA = {
  on: (evt, cb) => { (radio.handlers[evt] = radio.handlers[evt] || []).push(cb); },
  off: (evt, cb) => {
    radio.handlers[evt] = (radio.handlers[evt] || []).filter((f) => f !== cb);
  },
  trigger: (evt, d) => (radio.handlers[evt] || []).forEach((f) => f(d)),
};

const modal = { fed: null, cleared: 0, el: { dataset: {} } };
global.Wm = {
  __wrapperModal: {
    el: modal.el,
    feed: (t) => { modal.fed = t; },
    clear: () => { modal.cleared++; modal.fed = null; },
  },
};

global.Visitor = { id: "user-1" };

global.LetcBox = class {
  initialize() {
    // The real LetcBox derives the BEM family from the class name by
    // stripping leading underscores and replacing "_" with "-" (see
    // src/drumee/builtins/widget/reward-flow/index.js header comment /
    // CLAUDE.md constraints). No widget sets `fig` itself; every skeleton
    // in this feature (card.js, modal.js, skeleton/index.js) reads
    // `ui.fig.family`, so this stub must reproduce that derivation.
    this.fig = {
      family: this.constructor.name.replace(/^_+/, "").replace(/_/g, "-"),
    };
  }
  declareHandlers() {}
  feed(tree) { this.lastTree = tree; }
  softDestroy() { this.destroyed = true; }
  triggerHandlers(args) { (this.sent = this.sent || []).push(args); }
  warn() {}
};

const Flow = require("../../src/drumee/builtins/widget/reward-flow/index");

// Build an initialised instance without the Backbone machinery.
function makeFlow() {
  const f = new Flow();
  f.initialize({});
  return f;
}

const click = (f, service) => f.onUiEvent({ mget: () => null }, { service });

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  radio.handlers = {};
  modal.fed = null;
  modal.cleared = 0;
});

// ── eligibility ─────────────────────────────────────────────────────────────

test("not eligible when no utm is stored", () => {
  assert.equal(Flow.isEligible(), false);
});

test("eligible for the free-storage campaign", () => {
  store.drumee_utm = JSON.stringify({ utm_campaign: "free-storage" });
  assert.equal(Flow.isEligible(), true);
});

test("not eligible for a different campaign", () => {
  store.drumee_utm = JSON.stringify({ utm_campaign: "other" });
  assert.equal(Flow.isEligible(), false);
});

test("not eligible once the flow has been completed", () => {
  store.drumee_utm = JSON.stringify({ utm_campaign: "free-storage" });
  store.reward_flow_done = "1";
  assert.equal(Flow.isEligible(), false);
});

test("corrupt utm json does not throw", () => {
  store.drumee_utm = "{not json";
  assert.equal(Flow.isEligible(), false);
});

// ── forward transitions ─────────────────────────────────────────────────────

test("starts at step1 with the first segment filled", () => {
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
  assert.equal(f.getFurthest(), 1);
});

test("continue advances to step2", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step2");
  assert.equal(f.getFurthest(), 2);
});

test("upload fires the desk upload service and enters the waiting state", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  assert.equal(f.getStep(), "step2_waiting");
  assert.deepEqual(f.sent, [{ service: _e.upload }]);
});

test("a completed upload advances to step3", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  RADIO_MEDIA.trigger(_e.uploaded, {});
  assert.equal(f.getStep(), "step3");
  assert.equal(f.getFurthest(), 3);
});

test("an upload completing outside the waiting state is ignored", () => {
  const f = makeFlow();
  RADIO_MEDIA.trigger(_e.uploaded, {});
  assert.equal(f.getStep(), "step1");
});

test("invite fires the desk invite service and enters the waiting state", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  assert.equal(f.getStep(), "step3_waiting");
  assert.deepEqual(f.sent.at(-1), { service: "invite-member" });
});

test("a sent invitation opens the congratulations modal", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  // The invite popup's own close (which the real popup fires right after a
  // successful send, clearing the shared host on its way out) has not
  // happened yet, so the congrats modal must not be fed yet — this proves
  // the deferral, i.e. the fix for the shared-host race.
  assert.equal(modal.fed, null, "onInvitationSent alone must not feed the modal");
  assert.equal(f.getStep(), "step3_waiting", "the step must not move until the popup closes");

  f.onInvitePopupClosed();
  assert.ok(modal.fed, "the congratulations modal should have been fed");
  assert.equal(modal.el.dataset.state, "open");
  assert.equal(f.getStep(), "congrats", "onInvitePopupClosed must latch off step3_waiting");
});

test("getFurthest stays at 3 once the flow reaches the congrats state", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  assert.equal(f.getStep(), "congrats");
  assert.equal(f.getFurthest(), 3);
});

test("a trailing invite-popup close after a successful send does not disturb the congrats modal", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  // The desk relays the invite popup's destroy (which fires immediately
  // after a successful send) to onInvitePopupClosed(). This is the real
  // trigger that opens the congrats modal now that the host is free.
  f.onInvitePopupClosed();
  const fedAfterClose = modal.fed;
  assert.ok(fedAfterClose, "the congratulations modal should have been fed");
  // A second, stray close (e.g. a duplicate desk relay) must be a no-op:
  // _inviteSucceeded is already consumed and _step is the terminal
  // "congrats" marker, not "step3_waiting".
  f.onInvitePopupClosed();
  assert.equal(f.getStep(), "congrats", "the trailing popup-close must not move the step back");
  assert.equal(modal.fed, fedAfterClose, "the congrats modal must not be replaced");
  assert.equal(modal.cleared, 0, "the congrats modal must not be cleared by the trailing close");
});

test("a stored 'congrats' terminal marker is not resumable and falls back to step1", () => {
  store.reward_step = "congrats";
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
  assert.equal(f.getFurthest(), 1);
});

test("closing the invite popup without sending returns to step3", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitePopupClosed();
  assert.equal(f.getStep(), "step3");
});

test("continue is a no-op while a waiting state is active", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  assert.equal(f.getStep(), "step2_waiting");
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step2_waiting", "continue must not fire while waiting");
});

// ── back navigation ─────────────────────────────────────────────────────────

test("back is navigation only and never rewinds progress", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  assert.equal(f.getStep(), "step3");
  click(f, "reward-back");
  assert.equal(f.getStep(), "step2");
  assert.equal(f.getFurthest(), 3, "progress must not rewind");
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step3", "continue returns straight to step3");
});

test("back from step2 lands on step1", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-back");
  assert.equal(f.getStep(), "step1");
});

test("back on step1 is a no-op", () => {
  const f = makeFlow();
  click(f, "reward-back");
  assert.equal(f.getStep(), "step1");
});

test("back from a waiting state returns to its own step", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  assert.equal(f.getStep(), "step2_waiting");
  click(f, "reward-back");
  assert.equal(f.getStep(), "step2");
});

// ── drop modal ──────────────────────────────────────────────────────────────

test("clicking the vignette opens the drop modal", () => {
  const f = makeFlow();
  click(f, "reward-vignette-click");
  assert.ok(modal.fed, "the drop modal should have been fed");
});

test("staying closes the modal and keeps the same step", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-vignette-click");
  click(f, "reward-drop-stay");
  assert.equal(modal.cleared, 1);
  assert.equal(f.getStep(), "step2");
});

test("the vignette is inert during a waiting state", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  click(f, "reward-vignette-click");
  assert.equal(modal.fed, null, "no drop modal while waiting");
});

test("a second vignette click while the drop modal is already open does not feed it again", () => {
  const f = makeFlow();
  click(f, "reward-vignette-click");
  assert.ok(modal.fed, "the drop modal should have been fed");
  modal.fed = "SENTINEL";
  click(f, "reward-vignette-click");
  assert.equal(modal.fed, "SENTINEL", "the modal host must not be fed a second time");
});

// ── exit ────────────────────────────────────────────────────────────────────

test("dropping out latches the flow off and destroys it", () => {
  const f = makeFlow();
  click(f, "reward-vignette-click");
  click(f, "reward-drop-leave");
  assert.equal(store.reward_flow_done, "1");
  assert.equal(store.reward_step, undefined);
  assert.equal(f.destroyed, true);
});

test("finishing latches the flow off and destroys it", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  click(f, "reward-finish");
  assert.equal(store.reward_flow_done, "1");
  assert.equal(f.destroyed, true);
});

test("finishing clears the modal host so no stale modal outlives the flow", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  assert.ok(modal.fed, "the congratulations modal should have been fed");
  click(f, "reward-finish");
  assert.equal(modal.cleared, 1, "the modal host must be cleared");
  assert.equal(modal.fed, null, "clear() resets the fed tree");
  assert.equal(modal.el.dataset.state, "closed", "the modal host must be marked closed");
});

test("exiting unsubscribes from the media radio", () => {
  const f = makeFlow();
  click(f, "reward-vignette-click");
  click(f, "reward-drop-leave");
  assert.equal((radio.handlers[_e.uploaded] || []).length, 0);
});

// ── resume ──────────────────────────────────────────────────────────────────

test("every transition persists the step", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(store.reward_step, "step2");
});

test("a stored step is resumed on mount", () => {
  store.reward_step = "step3";
  const f = makeFlow();
  assert.equal(f.getStep(), "step3");
  assert.equal(f.getFurthest(), 3);
});

test("a stored waiting step resumes as its base step", () => {
  store.reward_step = "step2_waiting";
  const f = makeFlow();
  assert.equal(f.getStep(), "step2");
});

test("a corrupt stored step falls back to step1", () => {
  store.reward_step = "nonsense";
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
});

// ── degraded host ───────────────────────────────────────────────────────────

test("with no modal host, a sent invitation still finishes the flow", () => {
  const saved = global.Wm;
  global.Wm = {};
  try {
    const f = makeFlow();
    click(f, "reward-continue");
    click(f, "reward-upload");
    f.onUploadDone();
    click(f, "reward-invite");
    f.onInvitationSent();
    f.onInvitePopupClosed();
    assert.equal(store.reward_flow_done, "1", "user must not be stranded");
    assert.equal(f.destroyed, true);
  } finally {
    global.Wm = saved;
  }
});
