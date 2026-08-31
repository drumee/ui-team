/**
 * The Create-new-workspace dialog, as the tour draws it.
 *
 * Figma 176:40762 → 176:41391 (component 85:42209). This is the whole subject
 * of the `workspace` tour in 2.0 — the post-signup tour used to point at three
 * workspace tiles on the desk, but a brand-new account has no tiles, so the
 * design teaches the three workspace TYPES where the user actually meets
 * them: in the dialog that creates one.
 *
 * The dialog is the lit surface; the screen picks which block inside it is at
 * full strength and marks the rest `data-dim`, which is the design's own
 * treatment (skin/tooltip.scss owns that rule once, for every step).
 *
 * `wsd-dialog` is the spotlight target; each block carries a `sys_pn` so a
 * screen can anchor the callout's beak on it.
 *
 * Visual only — no services — EXCEPT in `live` mode, which the tour's last
 * screen uses to render the same dialog as a working form. That screen is the
 * one place in any tour where the user is doing something rather than being
 * shown it, and it is deliberately the same composer: a create form that
 * drifted from the five screens teaching it would be worse than no tour.
 */

// The area-tinted workspace shape, from the single source the desk renders it
// through. It returns an HTML STRING, hence Element + content rather than
// Image.Svg + ico.
const folderArt = require("media/grid/template/folder");

/**
 * The three types, in the design's order.
 *
 * `area` is the real area token, so each row gets the tint the product would
 * give that workspace rather than a colour picked to match a screenshot.
 *
 * The row subtitles use WS_TYPE_*_HINT, not the older *_WORKSPACE_HINT keys:
 * those already held the tour's own CALLOUT sentences ("Restricted to only
 * internal team"), so reusing them printed the callout copy inside the dialog
 * and the two read as the same sentence twice.
 */
const TYPES = [
  {
    key: "internal",
    area: _a.private,
    title: () => LOCALE.INTERNAL_WORKSPACE,
    desc: () => LOCALE.WS_TYPE_INTERNAL_HINT,
  },
  {
    key: "external",
    area: _a.share,
    title: () => LOCALE.EXTERNAL_WORKSPACE,
    desc: () => LOCALE.WS_TYPE_EXTERNAL_HINT,
  },
  {
    key: "personal",
    area: _a.personal,
    title: () => LOCALE.PERSONAL_WORKSPACE,
    desc: () => LOCALE.WS_TYPE_PERSONAL_HINT,
  },
];

/** Every block the dialog can light, so a screen can name one. */
const BLOCKS = {
  NAME: "wsd-name",
  TYPE: "wsd-type",
  CREATE: "wsd-create",
  type: (key) => `wsd-type-${key}`,
};

const dim = (on) => ({
  dataset: { dim: on ? 1 : 0 },
  attrOpt: { "data-dim": on ? 1 : 0 },
});

/**
 * A row is held back only when the screen is lighting ANOTHER row.
 *
 * Deliberately NOT when the name field is lit: the section around these rows
 * is dimmed as a whole on that screen, and `data-dim` is an opacity — nesting
 * one inside another multiplies them (0.35 x 0.35) and the rows go nearly
 * black rather than held back.
 *
 * Nor on the closing screen, which lights Create: that screen is about the
 * pair — pick a type, then press Create — so the rows stay up.
 */
function rowIsDim(lit, key) {
  if (!lit) return false;
  return lit.startsWith("wsd-type-") && lit !== BLOCKS.type(key);
}

function typeRow(ui, pfx, type, opt) {
  const selected = opt.selected === type.key;
  // Live, the row is how the type is chosen, so it takes a click. Mock, it is
  // scenery and must stay inert — `active: 0` is what keeps a stray click from
  // bubbling to the step wrapper (see _buildWidgets in ../../index.js).
  // ONE dataset for the row, built here rather than spread in from two places.
  //
  // It used to be two: the live props carried `data-type`, and `...dim()` came
  // AFTER them carrying `data-dim` — and a later spread REPLACES an earlier key
  // rather than merging into it, so `dataset` and `attrOpt` were overwritten
  // wholesale and `data-type` never reached the DOM. The click handler reads
  // the type off that attribute, found undefined, and returned without doing
  // anything: every row was clickable and none of them selected.
  const isDim = rowIsDim(opt.lit, type.key);
  const data = { dim: isDim ? 1 : 0 };
  if (opt.live) {
    data.type = type.key;
    data.on = selected ? 1 : 0;
  }
  const attrs = Object.keys(data).reduce((o, k) => {
    o[`data-${k}`] = data[k];
    return o;
  }, {});

  return Skeletons.Box.X({
    // Inline, like the submit below, so the inert-node guard can see both
    // halves of the choice on the node itself.
    ...(opt.live
      ? { service: "wsd-select-type", uiHandler: [ui] }
      : { active: 0 }),
    className: `${pfx}__wsd-type-row`,
    sys_pn: BLOCKS.type(type.key),
    partHandler: ui,
    dataset: data,
    attrOpt: attrs,
    kids: [
      Skeletons.Element({ active: 0,
        className: `${pfx}__wsd-type-icon ${type.area}`,
        content: folderArt({
          area: type.area,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("tutorial-wsd-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__wsd-type-text`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${pfx}__wsd-type-title`,
            content: type.title(),
          }),
          Skeletons.Note({ active: 0,
            className: `${pfx}__wsd-type-desc`,
            content: type.desc(),
          }),
        ],
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__wsd-radio`,
        dataset: { on: selected ? 1 : 0 },
        attrOpt: { "data-on": selected ? 1 : 0 },
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {String} [opt.lit]      the block at full strength; everything else
 *   is held back. Omit to render the dialog undimmed.
 * @param {String} [opt.selected='internal'] which type carries the radio
 * @param {Boolean} [opt.ready]   Create is enabled (solid rather than pale)
 * @param {Boolean} [opt.live]    the dialog WORKS — a real name field, rows
 *   that take a click, a Create that submits. Nothing dims: no screen is
 *   teaching one block any more, the whole thing is in use.
 * @param {Boolean} [opt.pending] the submit is waiting on the network
 * @param {String} [opt.name]     what the name field already holds. Picking a
 *   type re-renders this dialog, so the typing has to be handed back in or
 *   choosing a type silently empties the field above it.
 * @returns {Object} the dialog, centred on the pane
 */
function workspaceDialog(ui, opt = {}) {
  const pfx = ui.fig.family;
  const {
    lit, selected = "internal", ready = false, live = false, pending = false, name = "",
  } = opt;
  const held = (block) => dim(lit && lit !== block);
  // Create is at full strength on its own screen and held back on every
  // screen that is teaching one of the fields above it.
  const submitIsDim = !!lit && lit !== BLOCKS.CREATE;

  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__wsd-backdrop`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__wsd-dialog`,
        sys_pn: "wsd-dialog",
        partHandler: ui,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__wsd-header`,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__wsd-heading`,
                content: LOCALE.CREATE_NEW_WORKSPACE,
              }),
              Skeletons.Image.Svg({ active: 0, ico: "cross", className: `${pfx}__wsd-close` }),
            ],
          }),

          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__wsd-field`,
            sys_pn: BLOCKS.NAME,
            partHandler: ui,
            ...held(BLOCKS.NAME),
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__wsd-label`,
                content: LOCALE.WORKSPACE_NAME,
              }),
              live
                ? Skeletons.Entry({
                    className: `${pfx}__wsd-input`,
                    sys_pn: "wsd-name-input",
                    partHandler: ui,
                    formItem: _a.filename,
                    placeholder: LOCALE.TYPE_THE_NAME,
                    value: name || "",
                    // The step validates on submit and writes its own message
                    // into the slot below; `bubble` would put a second one in a
                    // tooltip saying the same thing somewhere else.
                    bubble: 0,
                  })
                : Skeletons.Box.X({ active: 0,
                    className: `${pfx}__wsd-entry`,
                    kids: [
                      Skeletons.Note({ active: 0,
                        className: `${pfx}__wsd-placeholder`,
                        content: LOCALE.TYPE_THE_NAME,
                      }),
                    ],
                  }),
              // Under the field, where the error belongs — not in a modal the
              // user has to dismiss before they can fix the name.
              live
                ? Skeletons.Note({ active: 0,
                    className: `${pfx}__wsd-error`,
                    sys_pn: "wsd-name-error",
                    partHandler: ui,
                    dataset: { state: 0 },
                    attrOpt: { "data-state": 0 },
                    content: "",
                  })
                : null,
            ].filter(Boolean),
          }),

          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__wsd-types`,
            sys_pn: BLOCKS.TYPE,
            partHandler: ui,
            ...dim(lit === BLOCKS.NAME),
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__wsd-label`,
                content: LOCALE.WORKSPACE_TYPE,
              }),
              ...TYPES.map((t) => typeRow(ui, pfx, t, { lit, selected, live })),
            ],
          }),

          Skeletons.Note({
            // Live it is the one control on the screen; mock it is a picture of
            // one, and inert for the same reason the rows are.
            ...(live
              ? { service: "wsd-create", uiHandler: [ui] }
              : { active: 0 }),
            className: `${pfx}__wsd-submit`,
            sys_pn: BLOCKS.CREATE,
            partHandler: ui,
            // Live, Create is always solid — there is no screen walking up to
            // it any more, and a pale button on the screen you are meant to
            // press reads as disabled.
            dataset: {
              ready: live || ready ? 1 : 0,
              dim: submitIsDim ? 1 : 0,
              pending: pending ? 1 : 0,
            },
            attrOpt: {
              "data-ready": live || ready ? 1 : 0,
              "data-dim": submitIsDim ? 1 : 0,
              "data-pending": pending ? 1 : 0,
            },
            content: LOCALE.CREATE,
          }),
        ],
      }),
    ],
  });
}

module.exports = { workspaceDialog, BLOCKS, TYPES };
