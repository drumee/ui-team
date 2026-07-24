/**
 * Reward flow step card — Figma 3275:236196 (step 1), 3275:236332 (step 2),
 * 3275:236421 (step 3).
 *
 * Layout: 3-segment progress bar → icon chip → title → description → footer.
 * Active Step 1 has a single full-width primary button and no Back (nothing to
 * go back to). Steps 2 and 3 pair Back with their primary action.
 *
 * The `*_waiting` variants render the same card minus the primary button, plus
 * a hint line: the user has been handed off to the real new-workspace dialog,
 * uploader, or invite popup. Every waiting state keeps Back — even step1's,
 * whose active card has none — so a user who changes their mind is never
 * trapped.
 *
 * Pure function of `ui` — reads only fig.family, getStep() and getFurthest().
 */

// step name → { index, ico, title, desc, primaryLabel, primaryService, waitingHint }
const STEPS = {
  step1: {
    ico: "folder-header",
    title: () => LOCALE.REWARD_FLOW_STEP1_TITLE || "Step 1: Create your Workspace",
    desc: () => LOCALE.REWARD_FLOW_STEP1_DESC
      || "Set up your first workspace to get started.",
    primaryLabel: () => LOCALE.REWARD_FLOW_CONTINUE || "Continue",
    primaryService: "reward-continue",
    back: false,
  },
  step2: {
    ico: "upload-simple",
    title: () => LOCALE.REWARD_FLOW_STEP2_TITLE || "Step 2: Upload your first file",
    desc: () => LOCALE.REWARD_FLOW_STEP2_DESC
      || "Upload any file, and activate your storage instantly.",
    primaryLabel: () => LOCALE.REWARD_FLOW_UPLOAD || "Upload",
    primaryService: "reward-upload",
    back: true,
  },
  step3: {
    ico: "drumee-add-contact",
    title: () => LOCALE.REWARD_FLOW_STEP3_TITLE || "Step 3: Invite a teammate",
    desc: () => LOCALE.REWARD_FLOW_STEP3_DESC
      || "Click Invite and add at least 1 member. Real collaboration starts now!",
    primaryLabel: () => LOCALE.REWARD_FLOW_INVITE || "Invite member",
    primaryService: "reward-invite",
    back: true,
  },
};

const WAITING_HINT = {
  step1_waiting: () => LOCALE.REWARD_FLOW_WAITING_WORKSPACE
    || "Waiting for your workspace…",
  step2_waiting: () => LOCALE.REWARD_FLOW_WAITING_UPLOAD
    || "Waiting for your first upload…",
  step3_waiting: () => LOCALE.REWARD_FLOW_WAITING_INVITE
    || "Waiting for your first invitation…",
};

module.exports = function stepCard(ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const base = waiting ? step.replace("_waiting", "") : step;
  const cfg = STEPS[base];
  const furthest = ui.getFurthest();

  const progress = Skeletons.Box.X({
    className: `${pfx}__progress`,
    kids: [1, 2, 3].map((i) =>
      Skeletons.Box.Y({
        className: `${pfx}__progress-seg`,
        dataset: { on: i <= furthest ? "1" : "0" },
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
