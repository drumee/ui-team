/**
 * The screen after a workspace exists — Figma 200:9366 and 200:9490.
 *
 * Two cards, and the split is not a style choice. `SERVICE.hub.invite` is keyed
 * on `hub_id`, and a personal workspace is not a hub — it is a home-root folder
 * only presented as a workspace type (see libs/create-workspace). There is
 * literally nothing to invite anyone to, so the design says so plainly rather
 * than offering a field that could only fail.
 *
 *   shared    internal / external. A real email field, a real Send Invitation.
 *   personal  a mark, a sentence, and a way out.
 *
 * The only live screen of any tour besides the create form before it, so unlike
 * every other toolkit here these controls carry services.
 */

const pfx = (ui) => `${ui.fig.group}__inv`;

/**
 * A full-width button, in the design's two weights.
 *
 * @param {String} cls    modifier suffix — `primary` or `ghost`
 * @param {Object} opt    { label, service, ui }
 */
const button = (p, cls, opt) =>
  Skeletons.Note({
    className: `${p}-btn ${p}-btn--${cls}`,
    service: opt.service,
    uiHandler: [opt.ui],
    content: opt.label,
  });

/**
 * internal / external — 200:9366.
 *
 * 460 wide, 33px insets, the heading and the ✕ on one row, then the blurb, the
 * email field, and the two buttons.
 */
function inviteCard(ui, created) {
  const p = pfx(ui);
  // The blurb names the workspace that was just made. Without it the card is a
  // generic pitch arriving straight after a create, and the user has no
  // confirmation the thing they typed a name for actually exists.
  const name = (created && created.filename) || "";
  const blurb = name
    ? String(LOCALE.TUTORIAL_INVITE_BLURB_NAMED).replace("{0}", name)
    : LOCALE.TUTORIAL_INVITE_BLURB;
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-card`,
    sys_pn: "inv-card",
    partHandler: ui,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-head`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-title`,
            content: LOCALE.TUTORIAL_INVITE_TITLE,
          }),
          // Same exit as Skip, in the corner the design puts it.
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${p}-close`,
            tooltips: LOCALE.SKIP,
            service: "inv-skip",
            uiHandler: [ui],
          }),
        ],
      }),

      Skeletons.Note({ active: 0,
        className: `${p}-blurb`,
        content: blurb,
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}-field`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${p}-label`,
            content: LOCALE.TUTORIAL_INVITE_LABEL,
          }),
          Skeletons.Entry({
            className: `${p}-input`,
            sys_pn: "inv-email",
            partHandler: ui,
            formItem: _a.email,
            placeholder: LOCALE.ENTER_EMAIL_ADDRESS,
            // The step writes its own message into the slot below rather than
            // letting the entry raise a bubble somewhere else on screen.
            bubble: 0,
          }),
          Skeletons.Note({ active: 0,
            className: `${p}-error`,
            sys_pn: "inv-error",
            partHandler: ui,
            dataset: { state: 0 },
            attrOpt: { "data-state": 0 },
            content: "",
          }),
        ],
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}-actions`,
        kids: [
          Skeletons.Note({
            className: `${p}-btn ${p}-btn--primary`,
            sys_pn: "inv-send",
            partHandler: ui,
            service: "inv-send",
            uiHandler: [ui],
            dataset: { pending: 0 },
            attrOpt: { "data-pending": 0 },
            content: LOCALE.TUTORIAL_INVITE_SEND,
          }),
          button(p, "ghost", {
            ui,
            service: "inv-skip",
            label: LOCALE.TUTORIAL_INVITE_SKIP,
          }),
        ],
      }),
    ],
  });
}

/**
 * personal — 200:9490.
 *
 * 360 wide, centred, 32px between the mark, the sentence and the one button.
 * No ✕: the button IS the way out, and a second one would imply there was
 * something here to decline.
 */
function personalCard(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-card ${p}-card--personal`,
    sys_pn: "inv-card",
    partHandler: ui,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: "rail-logo", className: `${p}-mark` }),
      Skeletons.Note({ active: 0,
        className: `${p}-title ${p}-title--centred`,
        content: LOCALE.TUTORIAL_INVITE_PERSONAL,
      }),
      button(p, "primary", {
        ui,
        service: "inv-skip",
        label: LOCALE.TUTORIAL_INVITE_LATER,
      }),
    ],
  });
}

/**
 * @param {Object} ui       the step widget
 * @param {Object} created   the workspace step 7 just made — `type` picks the
 *   card ("personal" has no hub to invite to), `filename` names it in the
 *   blurb, and `hub_id` is what the step invites against.
 * @returns {Object} the card, centred on the pane
 */
function inviteScreen(ui, created = {}) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-backdrop`,
    kids: [
      created.type === "personal" ? personalCard(ui) : inviteCard(ui, created),
    ],
  });
}

module.exports = { inviteScreen };
