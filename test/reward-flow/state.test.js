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

const bcast = { handlers: {} };
global.RADIO_BROADCAST = {
  on: (evt, cb) => { (bcast.handlers[evt] = bcast.handlers[evt] || []).push(cb); },
  off: (evt, cb) => {
    bcast.handlers[evt] = (bcast.handlers[evt] || []).filter((f) => f !== cb);
  },
  trigger: (evt, d) => (bcast.handlers[evt] || []).forEach((f) => f(d)),
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
  // The real framework resolves a named part; headless there is no DOM, so the
  // guide's spotlight/clearSpotlight calls resolve to null and no-op.
  ensurePart() { return Promise.resolve(null); }
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

// Reach step 2 the way the real flow does: Continue starts the Step 1 guided
// walkthrough (step1_guide). A Personal workspace fires "workspace:refresh"
// flagged {personal:1} and finishes immediately (no follow-up panel), which is
// the simplest deterministic way to land on step 2 in a headless test.
function toStep2(f) {
  click(f, "reward-continue");
  RADIO_BROADCAST.trigger("workspace:refresh", { personal: 1 });
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  radio.handlers = {};
  bcast.handlers = {};
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

test("starts at step1", () => {
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
});

test("continue starts the guided walkthrough without firing a service", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step1_guide");
  // The user creates the workspace themselves via the spotlighted real UI, so
  // the flow fires nothing here (contrast reward-upload / reward-invite).
  assert.equal(f.sent, undefined);
});

test("continue is inert while already guiding", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step1_guide");
});

test("a Personal workspace finishes the guide and advances to step2", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step1_guide");
  RADIO_BROADCAST.trigger("workspace:refresh", { personal: 1 });
  assert.equal(f.getStep(), "step2");
});

test("an internal/external workspace keeps guiding until the panel is closed", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  // No `personal` flag → a permission panel opens next; the guide must stay
  // active (spotlighting the panel), not jump to step2 yet.
  RADIO_BROADCAST.trigger("workspace:refresh");
  assert.equal(f.getStep(), "step1_guide", "must wait for the permission panel");
  // The guide reports the panel closed → advance.
  f.onGuideComplete();
  assert.equal(f.getStep(), "step2");
});

test("onGuideComplete outside the guided state is ignored", () => {
  const f = makeFlow();
  f.onGuideComplete();
  assert.equal(f.getStep(), "step1");
});

test("a workspace:refresh outside the guided state is ignored", () => {
  const f = makeFlow();
  RADIO_BROADCAST.trigger("workspace:refresh", { personal: 1 });
  assert.equal(f.getStep(), "step1");
});

test("back from the guided walkthrough returns to step1", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step1_guide");
  click(f, "reward-back");
  assert.equal(f.getStep(), "step1");
});

test("upload fires the desk upload service and enters the waiting state", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  assert.equal(f.getStep(), "step2_waiting");
  assert.deepEqual(f.sent.at(-1), { service: _e.upload });
});

test("a completed upload advances to step3", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  RADIO_MEDIA.trigger(_e.uploaded, {});
  assert.equal(f.getStep(), "step3");
});

test("an upload completing outside the waiting state is ignored", () => {
  const f = makeFlow();
  RADIO_MEDIA.trigger(_e.uploaded, {});
  assert.equal(f.getStep(), "step1");
});

test("invite fires the desk invite service and enters the waiting state", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  assert.equal(f.getStep(), "step3_waiting");
  assert.deepEqual(f.sent.at(-1), { service: "invite-member" });
});

test("a sent invitation opens the congratulations modal", async () => {
  const f = makeFlow();
  toStep2(f);
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
  // The congrats-modal open is deferred by one microtask so the shared
  // host's collection.reset() can fully unwind first.
  await new Promise((r) => setTimeout(r, 0));
  assert.ok(modal.fed, "the congratulations modal should have been fed");
  assert.equal(modal.el.dataset.state, "open");
  assert.equal(f.getStep(), "congrats", "onInvitePopupClosed must latch off step3_waiting");
});

test("the flow reaches the congrats state after a sent invitation", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  assert.equal(f.getStep(), "congrats");
});

test("a trailing invite-popup close after a successful send does not disturb the congrats modal", async () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  // The desk relays the invite popup's destroy (which fires immediately
  // after a successful send) to onInvitePopupClosed(). This is the real
  // trigger that opens the congrats modal now that the host is free.
  f.onInvitePopupClosed();
  // The congrats-modal open is deferred by one microtask so the shared
  // host's collection.reset() can fully unwind first.
  await new Promise((r) => setTimeout(r, 0));
  const fedAfterClose = modal.fed;
  assert.ok(fedAfterClose, "the congratulations modal should have been fed");
  // A second, stray close (e.g. a duplicate desk relay) must be a no-op:
  // _inviteSucceeded is already consumed and _step is the terminal
  // "congrats" marker, not "step3_waiting".
  f.onInvitePopupClosed();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(f.getStep(), "congrats", "the trailing popup-close must not move the step back");
  assert.equal(modal.fed, fedAfterClose, "the congrats modal must not be replaced");
  assert.equal(modal.cleared, 0, "the congrats modal must not be cleared by the trailing close");
});

test("step-3 congrats waits for the invite-sent toast to be dismissed", async () => {
  // Exercise the observer path (a real DOM has MutationObserver + a host that
  // can report the toast present/absent). The fallback path — no
  // MutationObserver — is what every other test above runs.
  const prevMO = global.MutationObserver;
  const prevQS = modal.el.querySelector;
  let toastPresent = true;
  let fire = null;
  modal.el.querySelector = () => (toastPresent ? {} : null);
  global.MutationObserver = class {
    constructor(cb) { fire = cb; }
    observe() {}
    disconnect() {}
  };
  try {
    const f = makeFlow();
    toStep2(f);
    click(f, "reward-upload");
    f.onUploadDone();
    click(f, "reward-invite");
    f.onInvitationSent();
    f.onInvitePopupClosed();
    // The step latches to the terminal marker immediately, but the congrats
    // screen must NOT open while the success toast is still on screen.
    assert.equal(f.getStep(), "congrats");
    fire(); // a mutation while the toast is present
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(modal.fed, null, "congrats must not open while the toast is up");

    // The user dismisses the toast (X / Close) → it leaves the host → congrats.
    toastPresent = false;
    fire();
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(modal.fed, "congrats opens once the toast is dismissed");
    assert.equal(modal.el.dataset.state, "open");
  } finally {
    global.MutationObserver = prevMO;
    modal.el.querySelector = prevQS;
  }
});

// ── Step 1 walkthrough drop-guard ────────────────────────────────────────────

test("step-1 walkthrough: the dimmed frame opens the drop guard without the wrapper-modal", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step1_guide");
  click(f, "reward-vignette-click");
  assert.equal(f._guideDropOpen, true, "the walkthrough drop guard must be open");
  // It must NOT feed the shared wrapper-modal — that host may hold the create-form.
  assert.equal(modal.fed, null, "the walkthrough drop guard must not use Wm.__wrapperModal");
  assert.equal(f.getStep(), "step1_guide", "opening the guard must not change the step");
});

test("step-1 walkthrough: a second frame click is inert while the guard is open", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  click(f, "reward-vignette-click");
  click(f, "reward-vignette-click"); // must not re-open / stack
  assert.equal(f._guideDropOpen, true);
  assert.equal(modal.fed, null);
});

test("step-1 walkthrough: Continue resumes the walkthrough, Drop anyway ends it", () => {
  const stay = makeFlow();
  click(stay, "reward-continue");
  click(stay, "reward-vignette-click");
  click(stay, "reward-drop-stay");
  assert.equal(stay._guideDropOpen, false, "Continue must close the guard");
  assert.equal(stay.getStep(), "step1_guide", "Continue must resume the walkthrough, not exit");
  assert.equal(modal.cleared, 0, "no wrapper-modal was opened, so none is cleared");

  const leave = makeFlow();
  click(leave, "reward-continue");
  click(leave, "reward-vignette-click");
  click(leave, "reward-drop-leave");
  assert.equal(leave.destroyed, true, "Drop anyway must finish and tear the flow down");
});

test("step-1 walkthrough: Continue empties the guide-modal via collection.reset (not feed(null))", async () => {
  const f = makeFlow();
  click(f, "reward-continue");
  // A stand-in guide-modal part with a collection + el, capturing how it clears.
  let resets = 0;
  let fedNull = 0;
  const part = {
    el: { dataset: {} },
    collection: { reset: () => { resets++; } },
    feed: (tree) => { if (tree === null) fedNull++; },
  };
  f.ensurePart = () => Promise.resolve(part);

  click(f, "reward-vignette-click");
  await Promise.resolve();
  assert.equal(part.el.dataset.open, "1", "opening flags the host backdrop dim");

  click(f, "reward-drop-stay");
  await Promise.resolve();
  assert.equal(f._guideDropOpen, false, "Continue closes the guard");
  assert.equal(resets, 1, "Continue must reset the collection to actually remove the modal");
  assert.equal(fedNull, 0, "feed(null) must not be used — it leaves the modal in place");
  assert.equal(part.el.dataset.open, undefined, "Continue clears the backdrop flag");
});

test("a stored 'congrats' terminal marker is not resumable and falls back to step1", () => {
  store.reward_step = "congrats";
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
});

test("closing the invite popup without sending returns to step3", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitePopupClosed();
  assert.equal(f.getStep(), "step3");
});

test("continue is a no-op while a waiting state is active", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  assert.equal(f.getStep(), "step2_waiting");
  click(f, "reward-continue");
  assert.equal(f.getStep(), "step2_waiting", "continue must not fire while waiting");
});

// ── back navigation ─────────────────────────────────────────────────────────

test("back returns to the previous step", () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  assert.equal(f.getStep(), "step3");
  click(f, "reward-back");
  assert.equal(f.getStep(), "step2");
});

test("back from step2 lands on step1", () => {
  const f = makeFlow();
  toStep2(f);
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
  toStep2(f);
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
  toStep2(f);
  click(f, "reward-vignette-click");
  click(f, "reward-drop-stay");
  assert.equal(modal.cleared, 1);
  assert.equal(f.getStep(), "step2");
});

test("the vignette is inert during a waiting state", () => {
  const f = makeFlow();
  toStep2(f);
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

test("finishing latches the flow off and destroys it", async () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  // The congrats-modal open is deferred by one microtask so the shared
  // host's collection.reset() can fully unwind first.
  await new Promise((r) => setTimeout(r, 0));
  click(f, "reward-finish");
  assert.equal(store.reward_flow_done, "1");
  assert.equal(f.destroyed, true);
});

test("finishing clears the modal host so no stale modal outlives the flow", async () => {
  const f = makeFlow();
  toStep2(f);
  click(f, "reward-upload");
  f.onUploadDone();
  click(f, "reward-invite");
  f.onInvitationSent();
  f.onInvitePopupClosed();
  // The congrats-modal open is deferred by one microtask so the shared
  // host's collection.reset() can fully unwind first.
  await new Promise((r) => setTimeout(r, 0));
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

test("exiting unsubscribes from the workspace:refresh broadcast", () => {
  const f = makeFlow();
  click(f, "reward-vignette-click");
  click(f, "reward-drop-leave");
  assert.equal((bcast.handlers["workspace:refresh"] || []).length, 0);
});

// ── resume ──────────────────────────────────────────────────────────────────

test("every transition persists the step", () => {
  const f = makeFlow();
  click(f, "reward-continue");
  assert.equal(store.reward_step, "step1_guide");
});

test("a stored 'step1_guide' resumes as the step1 card, not mid-guide", () => {
  store.reward_step = "step1_guide";
  const f = makeFlow();
  assert.equal(f.getStep(), "step1");
});

test("a stored step is resumed on mount", () => {
  store.reward_step = "step3";
  const f = makeFlow();
  assert.equal(f.getStep(), "step3");
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

test("with no modal host, a sent invitation still finishes the flow", async () => {
  const saved = global.Wm;
  global.Wm = {};
  try {
    const f = makeFlow();
    toStep2(f);
    click(f, "reward-upload");
    f.onUploadDone();
    click(f, "reward-invite");
    f.onInvitationSent();
    f.onInvitePopupClosed();
    // The congrats-modal open is deferred by one microtask so the shared
    // host's collection.reset() can fully unwind first.
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(store.reward_flow_done, "1", "user must not be stranded");
    assert.equal(f.destroyed, true);
  } finally {
    global.Wm = saved;
  }
});
