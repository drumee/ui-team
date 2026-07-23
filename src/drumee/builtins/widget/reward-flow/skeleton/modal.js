/**
 * Reward flow modals — Figma 3275:236554 (drop) and 3275:236463 (congrats).
 * Both are fed into Wm.__wrapperModal, which supplies the blurred backdrop
 * (the Overlay+OverlayBlur component in the design).
 *
 * Pure functions of `ui` — they read only fig.family and use `ui` as the
 * uiHandler so clicks route back to the orchestrator.
 */

/** Shared modal shell: icon → title → description block → footer buttons. */
function shell(ui, { ico, icoClass, title, body, footer }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__modal-ico ${icoClass}`,
        kids: [Skeletons.Image.Svg({ className: `${pfx}__modal-ico-svg`, ico })],
      }),
      Skeletons.Note({ className: `${pfx}__modal-title`, content: title }),
      body,
      Skeletons.Box.X({ className: `${pfx}__modal-footer`, kids: footer }),
    ],
  });
}

function dropModal(ui) {
  const pfx = ui.fig.family;
  return shell(ui, {
    ico: "logo",
    icoClass: `${pfx}__modal-ico--brand`,
    title: LOCALE.REWARD_FLOW_DROP_TITLE || "Don't drop now",
    body: Skeletons.Note({
      className: `${pfx}__modal-desc`,
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
        className: `${pfx}__congrats-seg`,
        content: LOCALE.REWARD_FLOW_CONGRATS_LEAD
          || "You've successfully claimed your",
      }),
      Skeletons.Note({
        className: `${pfx}__congrats-seg ${pfx}__congrats-prize`,
        content: LOCALE.REWARD_FLOW_CONGRATS_PRIZE
          || "5 years of unlimited storage!",
      }),
      Skeletons.Note({
        className: `${pfx}__congrats-seg`,
        content: LOCALE.REWARD_FLOW_CONGRATS_TAIL || "Welcome to Drumee.",
      }),
    ],
  });

  return shell(ui, {
    ico: "apps-check-circle",
    icoClass: `${pfx}__modal-ico--success`,
    title: LOCALE.REWARD_FLOW_CONGRATS_TITLE || "Congratulations!",
    body,
    footer: [
      Skeletons.Note({
        className: `${pfx}__btn ${pfx}__btn--primary`,
        dataset: { solo: "1" },
        content: LOCALE.REWARD_FLOW_GO_DASHBOARD || "Go to dashboard",
        service: "reward-finish",
        uiHandler: [ui],
      }),
    ],
  });
}

module.exports = { dropModal, congratsModal };
