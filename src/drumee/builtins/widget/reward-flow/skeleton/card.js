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
 * Step 3 when Step 1 left us a workspace to reopen: instead of pointing at the
 * desk topbar's Upload button — which drops the file wherever the desk happens
 * to point, usually Home — the card opens that workspace and the walkthrough
 * takes over inside it. Overlays the step3 entry above; index, icon, title and
 * Back are inherited.
 */
const STEP3_GUIDED = {
  desc: () => LOCALE.REWARD_FLOW_STEP3_GUIDED_DESC
    || "Open the workspace you just created and upload your first file into it.",
  primaryLabel: () => LOCALE.REWARD_FLOW_OPEN_WORKSPACE || "Open workspace",
  primaryService: "reward-open-workspace",
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
 * The step's config, with any active variant overlaid. One source of truth for
 * the card body, the primary button and the cutout's service, so they can never
 * disagree about which variant is showing.
 */
function configFor(step, ui) {
  const base = String(step).replace(/_(waiting|guide)$/, "");
  const cfg = STEPS[base];
  if (!cfg) return null;
  if (base === "step3" && ui?.hasStep1Workspace?.()) {
    return { ...cfg, ...STEP3_GUIDED };
  }
  return cfg;
}

/**
 * The service a step's primary button fires ("reward-invite" / "reward-upload",
 * or the guided Step 3's "reward-open-workspace"). Exposed so
 * the cutout laid over that step's topbar control can fire the SAME service —
 * clicking the spotlighted Invite/Upload button then behaves exactly like
 * clicking the card's button. `ui` is optional; pass it so variants resolve.
 */
function primaryServiceFor(step, ui) {
  const cfg = configFor(step, ui);
  // undefined, never null: this lands in a skeleton `service:` key, and an
  // explicit null is not the same as an absent property to the framework.
  return cfg ? cfg.primaryService : undefined;
}

module.exports = function stepCard(ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const base = waiting ? step.replace("_waiting", "") : step;
  const cfg = configFor(base, ui);

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
module.exports.configFor = configFor;
