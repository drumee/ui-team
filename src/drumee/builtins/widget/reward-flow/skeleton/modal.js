/**
 * Reward flow modals — Figma 3275:236554 (drop) and 3275:236463 (congrats).
 * Both are fed into Wm.__wrapperModal, which supplies the blurred backdrop
 * (the Overlay+OverlayBlur component in the design).
 *
 * Pure functions of `ui` — they read only fig.family and use `ui` as the
 * uiHandler so clicks route back to the orchestrator.
 */

/** Shared modal shell: header → title → description block → footer buttons.
 *  `header` is the top block: either the branded drumee logo (drop modal) or a
 *  single status icon (congrats). Passing it pre-built keeps this shell generic.
 *
 *  It IS a step card — same `__card` class, same `__title` / `__desc` /
 *  `__footer` inside. These are the last screens of the flow the cards run, so
 *  they take the card's shell, type scale and buttons by reusing them rather
 *  than by a parallel `__modal-*` stylesheet somebody has to keep in sync.
 *  `__modal` adds only what being fed OUTSIDE the flow root requires (its own
 *  font, and pointer events back on).
 */
function shell(ui, { header, title, body, footer }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__card ${pfx}__modal`,
    kids: [
      header,
      Skeletons.Note({ className: `${pfx}__title`, content: title }),
      body,
      Skeletons.Box.X({ className: `${pfx}__footer`, kids: footer }),
    ],
  });
}

/** A single status icon (congrats' success check), in the step card's chip. */
function iconHeader(ui, { ico, icoClass }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__chip ${icoClass}`,
    kids: [Skeletons.Image.Svg({ className: `${pfx}__chip-ico`, ico })],
  });
}

/** Branded drumee logo + wordmark — same lockup as the coach header. */
function brandHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__modal-brand`,
    kids: [
      Skeletons.Image.Svg({ className: `${pfx}__modal-brand-logo`, ico: "logo-upload" }),
      Skeletons.Note({ className: `${pfx}__modal-brand-name`, content: "drumee" }),
    ],
  });
}

function dropModal(ui) {
  const pfx = ui.fig.family;
  return shell(ui, {
    header: brandHeader(ui),
    title: LOCALE.REWARD_FLOW_DROP_TITLE || "Don't drop now",
    body: Skeletons.Note({
      className: `${pfx}__desc`,
      content: LOCALE.REWARD_FLOW_DROP_DESC || "You are super close to the reward.",
    }),
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--ghost`,
        content: LOCALE.REWARD_FLOW_DROP_LEAVE || "Drop anyway",
        service: "reward-drop-leave",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        content: LOCALE.REWARD_FLOW_CONTINUE || "Continue",
        service: "reward-drop-stay",
        uiHandler: [ui],
      }),
    ],
  });
}

function congratsModal(ui) {
  const pfx = ui.fig.family;
  // Three segments in a wrapping row: the prize takes the accent colour while
  // each segment stays a whole phrase for translators. Segment order is fixed.
  const body = Skeletons.Box.X({
    className: `${pfx}__congrats-copy`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__desc ${pfx}__congrats-seg`,
        content: LOCALE.REWARD_FLOW_CONGRATS_LEAD
          || "You've successfully claimed your",
      }),
      Skeletons.Note({
        className: `${pfx}__desc ${pfx}__congrats-seg ${pfx}__congrats-prize`,
        content: LOCALE.REWARD_FLOW_CONGRATS_PRIZE
          || "5 years of unlimited storage!",
      }),
      Skeletons.Note({
        className: `${pfx}__desc ${pfx}__congrats-seg`,
        content: LOCALE.REWARD_FLOW_CONGRATS_TAIL || "Welcome to Drumee.",
      }),
    ],
  });

  return shell(ui, {
    // Figma 3275:236468 — a green outline check-circle on a soft-green
    // ground. checked-circle.svg is that outline glyph (apps-check-circle is a
    // filled disc that reads as a dark blob at this size). The ground is the
    // step card's own chip, tinted green.
    header: iconHeader(ui, {
      ico: "checked-circle",
      icoClass: `${pfx}__chip--success`,
    }),
    title: LOCALE.REWARD_FLOW_CONGRATS_TITLE || "Congratulations!",
    body,
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        dataset: { solo: "1" },
        content: LOCALE.REWARD_FLOW_GO_DASHBOARD || "Back to home",
        service: "reward-finish",
        uiHandler: [ui],
      }),
    ],
  });
}

/**
 * The reward is gone — all of the campaign's limited slots are taken.
 *
 * Reached two ways, and it reads the same in both because the outcome is the
 * same: the gate turned an invited user away before the walkthrough started
 * (reward.get_state -> capped), or they finished while the last slot went to
 * someone else and the server refused the claim (reward.track -> granted=0).
 *
 * Congrats' twin, deliberately: same shell, same chip, one button. What it must
 * NOT do is apologise its way into a promise we cannot keep — there is no
 * waitlist and no second batch to offer — so it says what happened, and leaves.
 * The workspace, the invitation and the upload the user made along the way are
 * all real and all stay; nothing is taken back.
 */
function soldOutModal(ui) {
  const pfx = ui.fig.family;
  return shell(ui, {
    // The neutral information chip rather than congrats' green check: this is
    // news, not a failure, and nothing the user did went wrong.
    //
    // ctxmenu-info.svg is the outline info glyph and the only one in the sprite
    // drawn with fill="currentColor", so the chip's colour actually reaches it.
    // info.svg is a filled disc with a baked-in near-black fill, which reads as
    // a dark blob at this size — the same reason congrats uses checked-circle
    // rather than apps-check-circle.
    header: iconHeader(ui, {
      ico: "ctxmenu-info",
      icoClass: `${pfx}__chip--info`,
    }),
    title: LOCALE.REWARD_FLOW_SOLDOUT_TITLE || "All spots are taken",
    body: Skeletons.Note({
      className: `${pfx}__desc`,
      content: LOCALE.REWARD_FLOW_SOLDOUT_DESC
        || "This reward was limited to 100 people, and they have all claimed it. Everything you set up is yours to keep.",
    }),
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        dataset: { solo: "1" },
        content: LOCALE.REWARD_FLOW_GO_DASHBOARD || "Back to home",
        service: "reward-soldout-dismiss",
        uiHandler: [ui],
      }),
    ],
  });
}

module.exports = { dropModal, congratsModal, soldOutModal };
