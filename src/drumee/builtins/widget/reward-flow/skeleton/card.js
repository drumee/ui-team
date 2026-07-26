/**
 * Reward flow step card — Figma 3275:236196 (step 1), 3275:236421 (step 2,
 * invite), 3275:236332 (step 3, upload).
 *
 * Layout: 3-segment progress bar → icon chip → title → description → footer.
 * Active Step 1 has a single full-width primary button and no Back (nothing to
 * go back to). Steps 2 and 3 pair Back with their primary action.
 *
 * The `*_waiting` variants render the same card minus the primary button, plus
 * a hint line: the user has been handed off to the real new-workspace dialog,
 * invite popup, or uploader. Every waiting state keeps Back — even step1's,
 * whose active card has none — so a user who changes their mind is never
 * trapped.
 *
 * The progress bar fills to the CURRENT step — step 1 lights 1 segment, step 2
 * lights 2, step 3 lights 3 — so stepping back rewinds it too.
 *
 * Pure function of `ui` — reads only fig.family and getStep().
 */

// step name → { index, ico, title, desc, primaryLabel, primaryService, waitingHint }
const STEPS = {
  step1: {
    index: 1,
    ico: "folder-header",
    title: () => LOCALE.REWARD_FLOW_STEP1_TITLE || "Step 1: Create your Workspace",
    desc: () => LOCALE.REWARD_FLOW_STEP1_DESC
      || "Set up your first workspace to get started.",
    primaryLabel: () => LOCALE.REWARD_FLOW_CONTINUE || "Continue",
    primaryService: "reward-continue",
    back: false,
  },
  step2: {
    index: 2,
    ico: "drumee-add-contact",
    title: () => LOCALE.REWARD_FLOW_STEP2_TITLE || "Step 2: Invite a teammate",
    desc: () => LOCALE.REWARD_FLOW_STEP2_DESC
      || "Click Invite and add at least 1 member. Real collaboration starts now!",
    primaryLabel: () => LOCALE.REWARD_FLOW_INVITE || "Invite member",
    primaryService: "reward-invite",
    back: true,
  },
  step3: {
    index: 3,
    ico: "upload-simple",
    title: () => LOCALE.REWARD_FLOW_STEP3_TITLE || "Step 3: Upload your first file",
    desc: () => LOCALE.REWARD_FLOW_STEP3_DESC
      || "Upload any file, and activate your storage instantly.",
    primaryLabel: () => LOCALE.REWARD_FLOW_UPLOAD || "Upload",
    primaryService: "reward-upload",
    back: true,
  },
};

/**
 * Step 2 when the user already invited a member from the Step 1 permission
 * panel: the ask is met, so the card explains why and offers a plain Continue
 * to Step 3 instead of re-opening the invite popup. Overlays the step2 entry
 * above — everything it does not name (index, icon, title, Back) is inherited.
 */
const STEP2_SATISFIED = {
  desc: () => LOCALE.REWARD_FLOW_STEP2_DONE_DESC
    || "You've already invited a member in the permission panel at step 1.",
  primaryLabel: () => LOCALE.REWARD_FLOW_CONTINUE || "Continue",
  primaryService: "reward-invite-done",
};

const WAITING_HINT = {
  step1_waiting: () => LOCALE.REWARD_FLOW_WAITING_WORKSPACE
    || "Waiting for your workspace…",
  step2_waiting: () => LOCALE.REWARD_FLOW_WAITING_INVITE
    || "Waiting for your first invitation…",
  step3_waiting: () => LOCALE.REWARD_FLOW_WAITING_UPLOAD
    || "Waiting for your first upload…",
};

/**
 * The service a step's primary button fires ("reward-invite" / "reward-upload",
 * or "reward-invite-done" for an already-satisfied Step 2). Exposed so the
 * cutout laid over that step's topbar control can fire the SAME service —
 * clicking the spotlighted Invite/Upload button then behaves exactly like
 * clicking the card's button, from one source of truth. `ui` is optional; pass
 * it so the satisfied Step 2 resolves correctly.
 */
function primaryServiceFor(step, ui) {
  const base = String(step).replace("_waiting", "");
  if (base === "step2" && ui && ui.inviteSatisfied && ui.inviteSatisfied()) {
    return STEP2_SATISFIED.primaryService;
  }
  const cfg = STEPS[base];
  return cfg && cfg.primaryService;
}

module.exports = function stepCard(ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const base = waiting ? step.replace("_waiting", "") : step;
  const satisfied =
    base === "step2" && ui.inviteSatisfied && ui.inviteSatisfied();
  const cfg = satisfied
    ? { ...STEPS[base], ...STEP2_SATISFIED }
    : STEPS[base];

  const progress = Skeletons.Box.X({
    className: `${pfx}__progress`,
    kids: [1, 2, 3].map((i) =>
      Skeletons.Box.Y({
        className: `${pfx}__progress-seg`,
        dataset: { on: i <= cfg.index ? "1" : "0" },
      }),
    ),
  });

  const footerKids = [];
  // Waiting states always show Back — even step1's, whose active card has none —
  // so the user handed off to a real surface can always retreat.
  if (cfg.back || waiting) {
    footerKids.push(
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--ghost`,
        content: LOCALE.BACK || "Back",
        service: "reward-back",
        uiHandler: [ui],
      }),
    );
  }
  if (!waiting) {
    footerKids.push(
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        dataset: { solo: cfg.back ? "0" : "1" },
        content: cfg.primaryLabel(),
        service: cfg.primaryService,
        uiHandler: [ui],
      }),
    );
  }

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    dataset: { step: base, waiting: waiting ? "1" : "0" },
    kids: [
      progress,
      Skeletons.Box.Y({
        className: `${pfx}__chip`,
        kids: [Skeletons.Image.Svg({ className: `${pfx}__chip-ico`, ico: cfg.ico })],
      }),
      Skeletons.Note({ className: `${pfx}__title`, content: cfg.title() }),
      Skeletons.Note({ className: `${pfx}__desc`, content: cfg.desc() }),
      waiting
        ? Skeletons.Note({
          className: `${pfx}__waiting`,
          content: WAITING_HINT[step](),
        })
        : null,
      Skeletons.Box.X({ className: `${pfx}__footer`, kids: footerKids }),
    ].filter(Boolean),
  });
};

module.exports.primaryServiceFor = primaryServiceFor;
