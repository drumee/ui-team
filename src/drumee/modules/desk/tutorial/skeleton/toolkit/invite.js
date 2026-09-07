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
 * THE WORKSPACE, AS THE BREADCRUMB DRAWS IT: its area-tinted shape, then its
 * name. Same source as the topbar's crumb and the switcher's rows —
 * media/grid/template/folder is the one place this app renders that shape
 * from — so a workspace looks like itself everywhere it is named.
 *
 * MARKUP, not a descriptor, because it sits INLINE in a sentence: `{0}` is
 * mid-copy in TUTORIAL_INVITE_BLURB_NAMED, and three sibling descriptors would
 * lay the sentence out as three columns rather than flow it (the skin has to
 * force `display: block` on the blurb for the same reason — see invite.scss).
 * folderArt returns an HTML string already, which is why passing it as an icon
 * NAME renders nothing.
 *
 * THE NAME IS ESCAPED, and that is not decoration: it is whatever the user
 * typed into the create dialog one screen ago, so it reaches here as untrusted
 * text. Interpolating it raw would put their input into the page as markup.
 *
 * @param {String} p   the family prefix
 * @param {Object} created libs/create-workspace's descriptor
 * @returns {String} HTML for one inline crumb
 */
function crumb(p, created) {
  const folderArt = require("media/grid/template/folder");
  const area = (created && created.area) || "";
  // A workspace is a hub, EXCEPT a personal one, which is a home-root folder —
  // the same rule desk/index.js `_openCreatedWorkspace` applies to the same
  // descriptor, and the reason it matters is the glyph: `hub` with role
  // "desk" is what gets the area emblem.
  const isHub = area !== _a.personal;
  const art = folderArt({
    area,
    filetype: isHub ? _a.hub : _a.folder,
    role: isHub ? "desk" : "",
    widgetId: _.uniqueId("inv-crumb-icon-"),
    // No kebab beside a name in a sentence: there is nothing for it to act on.
    isAttachment: 1,
  });
  const label = _.escape((created && created.filename) || "");
  return `<span class="${p}-crumb"><span class="${p}-crumb-icon ${_.escape(area)}">${art}`
    + `</span><span class="${p}-crumb-name">${label}</span></span>`;
}

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
  // AND IT NAMES IT THE WAY THE TOPBAR NAMES IT — the area-tinted glyph and
  // then the name, which is what desk-module-topbar__breadcrumb draws
  // (desk/breadcrumb/item/skeleton). The workspace the user is being asked to
  // invite into is the one they will see in that bar a second later, so it
  // reads as the same object rather than as a quoted string.
  //
  // `{0}` in the copy is where it goes, so the sentence stays a sentence and
  // the chip sits inline in it.
  const blurb = name
    ? String(LOCALE.TUTORIAL_INVITE_BLURB_NAMED).split("{0}").join(crumb(p, created))
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

      // Element, not Note: a Note renders its content as TEXT, so the chip
      // would appear as its own markup. Only when there is a name — with no
      // workspace to draw the copy is a plain sentence and a Note is right.
      name
        ? Skeletons.Element({ active: 0,
            className: `${p}-blurb`,
            content: blurb,
          })
        : Skeletons.Note({ active: 0,
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
