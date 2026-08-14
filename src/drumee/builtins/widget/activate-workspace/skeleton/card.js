/**
 * Activation step card.
 *
 * Layout: 2-segment progress bar → icon chip → title → description → footer.
 * Each step has exactly one control, its primary action.
 *
 * NEITHER CARD CARRIES A BACK, and that is a decision rather than an omission.
 * Step 1's has nothing behind it — this is the first thing the user sees. Step
 * 2's would offer to return to "create your workspace" when the workspace
 * already exists, which is the same lie the create walkthrough's perm phase
 * hides its own Back to avoid; pressing it could only produce a second, unused
 * workspace. The way out of either card is the same one the walkthroughs have:
 * click the dimmed backdrop and answer the guard.
 *
 * Back does exist INSIDE both walkthroughs, where it means something concrete —
 * one sub-step back, or out to the card that started it.
 *
 * The progress bar fills to the CURRENT step: step 1 lights 1 segment, step 2
 * lights 2.
 *
 * Pure function of `ui` — reads only fig.family and getStep().
 */

// step name → { index, ico, title, desc, primaryLabel, primaryService }
const STEPS = {
  step1: {
    index: 1,
    ico: "folder-header",
    title: () => LOCALE.ACTIVATE_WS_STEP1_TITLE
      || "Step 1: Create your workspace",
    desc: () => LOCALE.ACTIVATE_WS_STEP1_DESC
      || "Set up your first workspace to get started.",
    primaryLabel: () => LOCALE.ACTIVATE_WS_CONTINUE || "Continue",
    primaryService: "activate-continue",
  },
  step2: {
    index: 2,
    ico: "upload-simple",
    title: () => LOCALE.ACTIVATE_WS_STEP2_TITLE
      || "Step 2: Upload your first file",
    desc: () => LOCALE.ACTIVATE_WS_STEP2_DESC
      || "Open the workspace you just created and upload your first file into it.",
    primaryLabel: () => LOCALE.ACTIVATE_WS_OPEN_WORKSPACE || "Open workspace",
    primaryService: "activate-open-workspace",
  },
};

/** The number of segments the progress bar draws — one per card step. Derived
 *  from the table above so adding a step cannot leave the bar behind. */
const SEGMENTS = Object.keys(STEPS).length;

/** The step's config. `step` may carry a `_guide` suffix; no card renders in
 *  that state, but the modal shell and the cutout both resolve services through
 *  here, so the suffix is stripped rather than rejected. */
function configFor(step) {
  return STEPS[String(step).replace(/_guide$/, "")] || null;
}

module.exports = function stepCard(ui) {
  const pfx = ui.fig.family;
  const cfg = configFor(ui.getStep());
  if (!cfg) return null;

  const progress = Skeletons.Box.X({
    className: `${pfx}__progress`,
    kids: Array.from({ length: SEGMENTS }, (_, i) =>
      Skeletons.Box.Y({
        className: `${pfx}__progress-seg`,
        dataset: { on: i + 1 <= cfg.index ? "1" : "0" },
      }),
    ),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    dataset: { step: `step${cfg.index}` },
    kids: [
      progress,
      Skeletons.Box.Y({
        className: `${pfx}__chip`,
        kids: [Skeletons.Image.Svg({ className: `${pfx}__chip-ico`, ico: cfg.ico })],
      }),
      Skeletons.Note({ className: `${pfx}__title`, content: cfg.title() }),
      Skeletons.Note({ className: `${pfx}__desc`, content: cfg.desc() }),
      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__btn ${pfx}__btn--primary`,
            // Always the only button on the row, so always full width.
            dataset: { solo: "1" },
            content: cfg.primaryLabel(),
            service: cfg.primaryService,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};

module.exports.configFor = configFor;
module.exports.SEGMENTS = SEGMENTS;
