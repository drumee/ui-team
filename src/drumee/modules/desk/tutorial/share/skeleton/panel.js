/**
 * The Secure Share panel — Figma 148:41197 → 148:44198.
 *
 * Six blocks, and the tour rings one per screen. The ring is the design's own
 * focus treatment here: a 2px brand outline on the block, not the opacity dip
 * the create-workspace dialog uses. Both live in skin/tooltip.scss so a step
 * only has to name which block is `lit`.
 *
 * The panel is taller than the window, so screens 5 and 6 show it scrolled —
 * the step scrolls the lit block into view before the callout measures it
 * (share/index.js _scrollPanelTo).
 *
 * Visual only — no services. `sp-panel` is the spotlight target; each block
 * carries a `sys_pn` so a screen can ring it and anchor the callout on it.
 */

/** Every block the panel can light, in the order the tour walks them. */
const BLOCKS = {
  RECIPIENT: "sp-recipient",
  ACCESS: "sp-access",
  EMAIL: "sp-email",
  PASSWORD: "sp-password",
  EXPIRY: "sp-expiry",
  NOTIFY: "sp-notify",
};

// Sample data — the file being shared, and the members already on the list.
const FILE = { name: "spec_v2.docx", meta: "Update 2 hour ago • 1.2MB" };
const MEMBERS = ["member@drumee.com", "member@drumee.com"];
const PASSWORD = "123456";
const LINK = "drumee.com/s/pink-fo…";

const lit = (on) => ({
  dataset: { lit: on ? 1 : 0 },
  attrOpt: { "data-lit": on ? 1 : 0 },
});

/** A permission row: icon, label, checkbox. */
const permission = (p, ico, label, on) =>
  Skeletons.Box.X({ active: 0,
    className: `${p}__perm`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${p}__perm-ico` }),
      Skeletons.Note({ active: 0, className: `${p}__perm-label`, content: label }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}__check`,
        dataset: { on: on ? 1 : 0 },
        attrOpt: { "data-on": on ? 1 : 0 },
      }),
    ],
  });

/** A radio row: icon, title + subtitle, radio. */
const choice = (p, ico, title, desc, on) =>
  Skeletons.Box.X({ active: 0,
    className: `${p}__choice`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${p}__choice-ico` }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}__choice-text`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__choice-title`, content: title }),
          Skeletons.Note({ active: 0, className: `${p}__choice-desc`, content: desc }),
        ],
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}__radio`,
        dataset: { on: on ? 1 : 0 },
        attrOpt: { "data-on": on ? 1 : 0 },
      }),
    ],
  });

const toggle = (p, on) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__toggle`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [Skeletons.Box.Y({ active: 0, className: `${p}__toggle-knob` })],
  });

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {String} [opt.lit] which block carries the focus ring
 * @returns {Object} the panel
 */
module.exports = function (ui, opt = {}) {
  const p = ui.fig.family;
  const on = (block) => lit(opt.lit === block);

  return Skeletons.Box.Y({ active: 0,
    className: `${p}__panel`,
    sys_pn: "sp-panel",
    partHandler: ui,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}__head`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__title`, content: LOCALE.SECURE_SHARE }),
          Skeletons.Image.Svg({ active: 0, ico: "cross", className: `${p}__close` }),
        ],
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}__body`,
        sys_pn: "sp-body",
        partHandler: ui,
        kids: [
          // The file being shared.
          Skeletons.Box.X({ active: 0,
            className: `${p}__file`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "app-doc-file", className: `${p}__file-ico` }),
              Skeletons.Box.Y({ active: 0,
                className: `${p}__file-text`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__file-name`, content: FILE.name }),
                  Skeletons.Note({ active: 0, className: `${p}__file-meta`, content: FILE.meta }),
                ],
              }),
            ],
          }),

          // 1/6 — what a recipient may do.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block`,
            sys_pn: BLOCKS.RECIPIENT,
            partHandler: ui,
            ...on(BLOCKS.RECIPIENT),
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.RECIPIENT_MODE }),
              Skeletons.Note({ active: 0, className: `${p}__hint`, content: LOCALE.RECIPIENT_MODE_HINT }),
              permission(p, "download", LOCALE.CAN_DOWNLOAD, true),
              permission(p, "chat-teardrop-dots", LOCALE.CAN_CHAT, false),
              permission(p, "ctxmenu-rename", LOCALE.CAN_EDIT, false),
            ],
          }),

          // 2/6 — public vs secure.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block`,
            sys_pn: BLOCKS.ACCESS,
            partHandler: ui,
            ...on(BLOCKS.ACCESS),
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.ACCESS_MANAGEMENT }),
              choice(p, "apps-eye", LOCALE.PUBLIC_SHARE, LOCALE.PUBLIC_SHARE_HINT, false),
              choice(p, "shield", LOCALE.SECURE_SHARE, LOCALE.SECURE_SHARE_HINT, true),
            ],
          }),

          // 3/6 — email gating, nested under Secure Share.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block ${p}__block--nested`,
            sys_pn: BLOCKS.EMAIL,
            partHandler: ui,
            ...on(BLOCKS.EMAIL),
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__row`,
                kids: [
                  Skeletons.Image.Svg({ active: 0, ico: "ab_address", className: `${p}__row-ico` }),
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__row-text`,
                    kids: [
                      Skeletons.Note({ active: 0, className: `${p}__row-title`, content: LOCALE.SHARE_REQUIRE_EMAIL }),
                      Skeletons.Note({ active: 0, className: `${p}__row-desc`, content: LOCALE.REQUIRE_EMAIL_HINT }),
                    ],
                  }),
                  Skeletons.Box.Y({ active: 0, className: `${p}__check`, dataset: { on: 1 }, attrOpt: { "data-on": 1 } }),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__row`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__row-title`, content: LOCALE.RESTRICT_TO_DOMAINS }),
                  toggle(p, true),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__chips`,
                kids: [
                  ...MEMBERS.map((m) =>
                    Skeletons.Box.X({ active: 0,
                      className: `${p}__chip`,
                      kids: [
                        Skeletons.Note({ active: 0, className: `${p}__chip-text`, content: m }),
                        Skeletons.Image.Svg({ active: 0, ico: "cross", className: `${p}__chip-x` }),
                      ],
                    }),
                  ),
                  Skeletons.Note({ active: 0, className: `${p}__chip-more`, content: "+3" }),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__entry`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__entry-text`, content: LOCALE.ENTER_EMAIL_OR_DOMAIN }),
                ],
              }),
            ],
          }),

          // 4/6 — password.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block ${p}__block--nested`,
            sys_pn: BLOCKS.PASSWORD,
            partHandler: ui,
            ...on(BLOCKS.PASSWORD),
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__row`,
                kids: [
                  Skeletons.Image.Svg({ active: 0, ico: "lock", className: `${p}__row-ico` }),
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__row-text`,
                    kids: [
                      Skeletons.Note({ active: 0, className: `${p}__row-title`, content: LOCALE.ADD_PASSWORD }),
                      Skeletons.Note({ active: 0, className: `${p}__row-desc`, content: LOCALE.ADD_PASSWORD_HINT }),
                    ],
                  }),
                  Skeletons.Box.Y({ active: 0, className: `${p}__check`, dataset: { on: 1 }, attrOpt: { "data-on": 1 } }),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__entry`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__entry-text`, dataset: { filled: 1 }, attrOpt: { "data-filled": 1 }, content: PASSWORD }),
                  Skeletons.Image.Svg({ active: 0, ico: "ctxmenu-rename", className: `${p}__entry-ico` }),
                ],
              }),
            ],
          }),

          // 5/6 — expiry.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block`,
            sys_pn: BLOCKS.EXPIRY,
            partHandler: ui,
            ...on(BLOCKS.EXPIRY),
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}__row`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.LINK_EXPIRATION }),
                  toggle(p, true),
                ],
              }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__segments`,
                kids: [LOCALE.ONE_HOUR, LOCALE.ONE_DAY, LOCALE.SEVEN_DAYS, LOCALE.CUSTOM].map((t) =>
                  Skeletons.Note({ active: 0, className: `${p}__segment`, content: t }),
                ),
              }),
            ],
          }),

          Skeletons.Box.X({ active: 0,
            className: `${p}__cta`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "copylink", className: `${p}__cta-ico` }),
              Skeletons.Note({ active: 0, className: `${p}__cta-label`, content: LOCALE.GET_LINK }),
            ],
          }),

          Skeletons.Box.X({ active: 0,
            className: `${p}__link`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: "copylink", className: `${p}__link-ico` }),
              Skeletons.Note({ active: 0, className: `${p}__link-text`, content: LINK }),
              Skeletons.Box.X({ active: 0,
                className: `${p}__revoke`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__revoke-label`, content: LOCALE.REVOKE }),
                ],
              }),
            ],
          }),

          // 6/6 — the open notification.
          Skeletons.Box.X({ active: 0,
            className: `${p}__block ${p}__block--row`,
            sys_pn: BLOCKS.NOTIFY,
            partHandler: ui,
            ...on(BLOCKS.NOTIFY),
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.NOTIFY_ON_OPEN }),
              toggle(p, true),
            ],
          }),
        ],
      }),
    ],
  });
};

module.exports.BLOCKS = BLOCKS;
