/**
 * Activation step card.
 *
 * Layout: 3-segment progress bar → icon chip → title → description → footer,
 * with an optional waiting hint and an optional Skip beneath.
 *
 * Step 1 has a single full-width primary button and no Back — nothing precedes
 * it. Steps 2 and 3 pair Back with their primary action.
 *
 * The `*_waiting` variants render the same card minus the primary button: the
 * user has been handed off to a real surface (today only Step 2 has one — the
 * invite popup or the members panel), so the card has nothing to offer until
 * they are done with it. Every waiting state keeps Back.
 *
 * They carried a "Waiting for your first invitation…" line until it was dropped:
 * the surface the user is working is right there beside the card, so narrating
 * that the flow is waiting on it told them what they could already see. What is
 * left still reads as a step in progress — the step title, its description, and
 * the controls that remain live.
 *
 * `ACTIVATE_WS_WAITING_INVITE` and `ACTIVATE_WS_WAITING_UPLOAD` are still defined
 * in the locale files and are deliberately left there, unreferenced: they cost
 * nothing, they are already translated, and putting the line back is then a
 * one-line change here rather than a round trip through seven locale files.
 *
 * STEP 2 ALSO CARRIES A SKIP, in both its variants, and it is the one control
 * this flow has that reward-flow does not. Inviting is the single step of the
 * three a user can be unable to perform: a brand-new account is on the free solo
 * plan, where the invite popup refuses to open at all, and a solo founder may
 * have nobody to invite yet. It sits below the footer as a quiet link rather
 * than a third button — it is a way past, not an equal choice — and it moves the
 * flow FORWARD, progress bar included, because skipping is a real answer.
 *
 * The progress bar fills to the CURRENT step — step 1 lights 1 segment, step 2
 * lights 2, step 3 lights 3 — so stepping back rewinds it too.
 *
 * Pure function of `ui` — reads only fig.family and getStep().
 */

// step name → { index, ico, title, desc, primaryLabel, primaryService, back, skip }
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
    back: false,
  },
  step2: {
    index: 2,
    ico: "drumee-add-contact",
    title: () => LOCALE.ACTIVATE_WS_STEP2_TITLE
      || "Step 2: Invite a teammate",
    desc: () => LOCALE.ACTIVATE_WS_STEP2_DESC
      || "Add someone to your workspace — this is where collaboration starts.",
    primaryLabel: () => LOCALE.ACTIVATE_WS_INVITE || "Invite member",
    primaryService: "activate-invite",
    back: true,
    skip: true,
  },
  step3: {
    index: 3,
    ico: "upload-simple",
    title: () => LOCALE.ACTIVATE_WS_STEP3_TITLE
      || "Step 3: Upload your first file",
    desc: () => LOCALE.ACTIVATE_WS_STEP3_DESC
      || "Open the workspace you created and upload your first file into it.",
    primaryLabel: () => LOCALE.ACTIVATE_WS_OPEN_WORKSPACE || "Open workspace",
    primaryService: "activate-open-workspace",
    back: true,
  },
};

/** The number of segments the progress bar draws — one per card step. Derived
 *  from the table above so adding a step cannot leave the bar behind. */
const SEGMENTS = Object.keys(STEPS).length;

/** The step's config. `step` may carry a `_waiting` or `_guide` suffix; no card
 *  renders in a guide state, but the cutout resolves its service through here,
 *  so both suffixes are stripped rather than rejected. */
function configFor(step) {
  return STEPS[String(step).replace(/_(waiting|guide)$/, "")] || null;
}

/**
 * The service a step's primary button fires. Exposed so the cutout laid over
 * that step's topbar control can fire the SAME service — clicking the
 * spotlighted Invite button then behaves exactly like clicking the card's
 * button.
 */
function primaryServiceFor(step) {
  const cfg = configFor(step);
  // undefined, never null: this lands in a skeleton `service:` key, and an
  // explicit null is not the same as an absent property to the framework.
  return cfg ? cfg.primaryService : undefined;
}

module.exports = function stepCard(ui) {
  const pfx = ui.fig.family;
  const step = ui.getStep();
  const waiting = step.endsWith("_waiting");
  const cfg = configFor(step);
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

  const footerKids = [];
  // Waiting states always show Back — even a step whose active card has none —
  // so the user handed off to a real surface can always retreat.
  if (cfg.back || waiting) {
    footerKids.push(
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--ghost`,
        content: LOCALE.BACK || "Back",
        service: "activate-back",
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
    dataset: { step: `step${cfg.index}`, waiting: waiting ? "1" : "0" },
    kids: [
      progress,
      Skeletons.Box.Y({
        className: `${pfx}__chip`,
        kids: [Skeletons.Image.Svg({ className: `${pfx}__chip-ico`, ico: cfg.ico })],
      }),
      Skeletons.Note({ className: `${pfx}__title`, content: cfg.title() }),
      Skeletons.Note({ className: `${pfx}__desc`, content: cfg.desc() }),
      Skeletons.Box.X({ className: `${pfx}__footer`, kids: footerKids }),
      // Below the footer, in both variants of the step that offers it.
      cfg.skip
        ? Skeletons.Note({
          className: `${pfx}__skip`,
          content: LOCALE.ACTIVATE_WS_SKIP || "Skip for now",
          service: "activate-skip-invite",
          uiHandler: [ui],
        })
        : null,
    ].filter(Boolean),
  });
};

module.exports.primaryServiceFor = primaryServiceFor;
module.exports.configFor = configFor;
module.exports.SEGMENTS = SEGMENTS;
