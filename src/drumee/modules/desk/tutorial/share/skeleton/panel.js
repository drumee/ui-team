/**
 * The Secure Share panel — Figma 148:41197 → 148:44198.
 *
 * Six blocks, and the tour rings one per screen. The ring is the design's own
 * focus treatment here: a brand outline on the block, not the opacity dip the
 * create-workspace dialog uses.
 *
 * The panel is 512 wide with a 13px gutter, and the frame's own grouping is
 * load-bearing rather than decorative: "Secure Share" is not a row beside the
 * email and password blocks, it is a CONTAINER holding them as white cards
 * (148:41786). Screen 3's ring proves it — 148:42637 sits at x25..487,
 * y520..687, which is exactly the nested email card's box, not a sibling's.
 * Drawn as three flat blocks, the panel said the three settings were peers when
 * two of them are conditions of the third.
 *
 * The panel is taller than the window, so screens 5 and 6 show it scrolled —
 * the step scrolls the lit block into view before the callout measures it
 * (share/index.js _scrollTo).
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

// The area-tinted folder shape, from the single source the desk renders it
// through — the same call the tour's own Files grid makes
// (../../skeleton/toolkit/files-grid.js), so the workspace in the panel header
// is the same picture as the workspaces behind it.
const folderArt = require("media/grid/template/folder");
// The glyph map and the "Update <when> • <size>" line, shared with the media
// grid's own attachment card so the two cannot drift.
const { fileGlyph, fileMeta } = require("libs/file-meta");

// Sample data — the members already on the list, and the FALLBACK subject.
//
// THE SUBJECT ROW IS REAL NOW. The rest of the panel is not, and that is
// deliberate: the members, the password and the link stay the frames' own
// placeholders, because a tour must not offer a working control. The row was
// mock too, on the argument that nothing real should leak into a drawing —
// which lost to the plainer one that a tour about sharing THIS file should say
// which file. The trigger passes the item (fire()'s third argument, in
// builtins/media/interact.js) and `subject_data` carries it here.
//
// These three are what renders when nobody passed one: `?tutorial=share`
// previews and the `full` tour, neither of which has an item. Copy is the
// frames', verbatim — 148:41935 a file, 180:51964 a folder, 180:52963 a
// workspace. Three subjects where this had two, and its "WORKSPACE" was really
// the folder frame's copy.
const FALLBACK = {
  file: { name: "spec_v2.docx", meta: "Update 2 hour ago • 1.2MB" },
  folder: { name: "Folders-name", meta: "Update 2 hour ago" },
  workspace: { name: "Workspace-name", meta: "Update 2 hour ago" },
};
const MEMBERS = ["member@drumee.com", "member@drumee.com"];
const PASSWORD = "123456";
const LINK = "drumee.com/s/pink-fo…";

const lit = (on) => ({
  dataset: { lit: on ? 1 : 0 },
  attrOpt: { "data-lit": on ? 1 : 0 },
});

/**
 * The focus state of one TOP-LEVEL block: is it the one being rung, and should
 * it be filmed back?
 *
 * Filmed unless it IS the lit block — the access block included, on the two
 * screens whose subject is a card nested inside it. Its label, the Public
 * Share choice and the Secure Share head all describe a choice already made by
 * then, so they go under the film with everything else and the one card being
 * described is lifted out of it (`__card[data-lit="1"]` in ../skin/index.scss).
 *
 * That lift is only possible because the treatment is an OVERLAY. It used to be
 * `filter: blur()`, which an ancestor imposes on its whole subtree with no way
 * for a descendant to escape — so the block holding the lit card had to be
 * exempted wholesale, and the exemption dragged the label and the public row
 * along with it. A film is just a layer, and z-index decides who is above it.
 *
 * Stamped only on the four blocks directly under `__body`; anything nested
 * sits under its container's single film rather than gaining a second.
 */
const focus = (block, lit) => {
  const on = block === lit ? 1 : 0;
  return {
    dataset: { lit: on, blur: on ? 0 : 1 },
    attrOpt: { "data-lit": on, "data-blur": on ? 0 : 1 },
  };
};

/**
 * A checkbox. 20px in the permission rows, 16px inside the white cards.
 *
 * The tick is a glyph rather than a CSS shape, and it has to be a BARE check.
 * `app-check` was tried first and is a check inside a RING, which drew a circle
 * on top of the square and read as two controls stacked; `desktop_check` is the
 * mark on its own, on a 10x8 viewBox with nothing around it.
 */
const check = (p, on, size) =>
  Skeletons.Box.Y({ active: 0,
    className: size === "sm" ? `${p}__check ${p}__check--sm` : `${p}__check`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: "desktop_check", className: `${p}__check-tick` }),
    ],
  });

/** A permission row: icon, label, checkbox — 148:41781. */
const permission = (p, ico, label, on) =>
  Skeletons.Box.X({ active: 0,
    className: `${p}__perm`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${p}__perm-ico` }),
      Skeletons.Note({ active: 0, className: `${p}__perm-label`, content: label }),
      check(p, on),
    ],
  });

/**
 * The head of a setting: icon, title over subtitle, and one control on the
 * right. Shared by the two access choices (radio) and the two white cards
 * inside Secure Share (checkbox) — one shape in the frame, one here.
 */
const settingHead = (p, ico, title, desc, control, pn) =>
  Skeletons.Box.X({ active: 0,
    className: `${p}__setting`,
    ...(pn ? { sys_pn: pn.pn, partHandler: pn.ui } : {}),
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}__setting-main`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico, className: `${p}__setting-ico` }),
          Skeletons.Box.Y({ active: 0,
            className: `${p}__setting-text`,
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__setting-title`, content: title }),
              Skeletons.Note({ active: 0, className: `${p}__setting-desc`, content: desc }),
            ],
          }),
        ],
      }),
      control,
    ],
  });

const radio = (p, on) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__radio`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
  });

const toggle = (p, on) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}__toggle`,
    dataset: { on: on ? 1 : 0 },
    attrOpt: { "data-on": on ? 1 : 0 },
    kids: [Skeletons.Box.Y({ active: 0, className: `${p}__toggle-knob` })],
  });

/**
 * The header row: what is being shared.
 *
 * Same box for all three subjects — 148:41930, 180:51964 and 180:52963 are the
 * identical row, 8/12 padding on an 8px radius over the frame's 5% black, with
 * a 14/20 semibold name over a 12/1.4 grey meta line. What differs is the icon,
 * and it differs in KIND rather than in glyph: a file gets a tinted 32-box with
 * a type mark inside it, a folder or workspace gets the folder SHAPE itself,
 * area-tinted and badged, with no box around it.
 *
 * REAL DATA when the trigger had it: the item's own name, a meta line built
 * from its timestamp and size, and a glyph from its filetype and extension.
 * Falling back to FALLBACK[key] rather than to nothing, because a preview URL
 * has no item and still has to draw the frame.
 *
 * @param {String} p
 * @param {String} [kind] "workspace", "folder", or anything else for a file
 * @param {Object} [node] the item's raw fields, when a trigger passed them
 */
const subject = (p, kind, node) => {
  // Anything that is not one of the two folder-shaped subjects is a file: an
  // unrecognised value has to draw something, and the file row is what the
  // majority of triggers want.
  const key = kind === "workspace" ? "workspace" : (kind === "folder" ? "folder" : "file");
  const ws = key !== "file";
  const real = !!(node && node.name);
  const data = real
    ? {
        name: node.name,
        // No size on a folder or a workspace — neither has a meaningful byte
        // count, and the frames' "1.2MB" on those two is copy carried over
        // from the file variant. An item with no usable timestamp either
        // yields "", so the frame's line stands in rather than an empty row.
        meta: fileMeta(node, { size: !ws }) || FALLBACK[key].meta,
      }
    : FALLBACK[key];
  return Skeletons.Box.X({ active: 0,
    className: `${p}__file`,
    dataset: { subject: key },
    attrOpt: { "data-subject": key },
    kids: [
      ws
        ? Skeletons.Element({ active: 0,
            className: `${p}__file-art`,
            // `hub`, not `folder`: the template only draws the area emblem for
            // a hub, and the emblem is what makes this read as a workspace
            // rather than a folder inside one. `isAttachment` holds back the
            // kebab — this row is scenery with no menu behind it. Same
            // arguments the Files grid passes, for the same reasons.
            content: folderArt({
              // The item's own area, so a shared workspace is pink and an
              // internal one is not. The frames draw pink because they share
              // from an external workspace; `share` stays the fallback.
              area: (real && node.area) || _a.share,
              filetype: _a.hub,
              role: "desk",
              widgetId: _.uniqueId("tutorial-sp-ws-"),
              isAttachment: 1,
            }),
          })
        : Skeletons.Box.Y({ active: 0,
            className: `${p}__file-ico`,
            kids: [
              // The mark for what this actually IS, not a fixed document
              // glyph — see fileGlyph in libs/file-meta for the map. With no
              // item to read, the frame's own document mark.
              Skeletons.Image.Svg({ active: 0,
                ico: real ? fileGlyph(node) : "app-doc-file",
                className: `${p}__file-glyph`,
              }),
            ],
          }),
      Skeletons.Box.Y({ active: 0,
        className: `${p}__file-text`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}__file-name`, content: data.name }),
          Skeletons.Note({ active: 0, className: `${p}__file-meta`, content: data.meta }),
        ],
      }),
    ],
  });
};

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {String} [opt.lit] which block carries the focus ring
 * @param {String} [opt.subject] "workspace" to draw a workspace in the header
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
      // 148:41940 — heading row and the file, one group at 12.
      Skeletons.Box.Y({ active: 0,
        className: `${p}__head`,
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${p}__head-row`,
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__title`, content: LOCALE.SECURE_SHARE }),
              Skeletons.Image.Svg({ active: 0, ico: "cross", className: `${p}__close` }),
            ],
          }),
          subject(p, opt.subject, opt.subject_data),
        ],
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}__body`,
        sys_pn: "sp-body",
        partHandler: ui,
        kids: [
          // 1/6 — what a recipient may do. 148:41781.
          //
          // Three nested groups rather than five flat children, because the
          // frame uses three different gaps: 4 between the label and its hint,
          // 16 from the hint down to the rows, 8 between the rows. One `gap` on
          // the block can only say one of those.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block ${p}__block--recipient`,
            sys_pn: BLOCKS.RECIPIENT,
            partHandler: ui,
            ...focus(BLOCKS.RECIPIENT, opt.lit),
            kids: [
              Skeletons.Box.Y({ active: 0,
                className: `${p}__block-head`,
                kids: [
                  Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.RECIPIENT_MODE }),
                  Skeletons.Note({ active: 0, className: `${p}__hint`, content: LOCALE.RECIPIENT_MODE_HINT }),
                ],
              }),
              Skeletons.Box.Y({ active: 0,
                className: `${p}__perms`,
                kids: [
                  permission(p, "download", LOCALE.CAN_DOWNLOAD, true),
                  permission(p, "chat-teardrop-dots", LOCALE.CAN_CHAT, false),
                  permission(p, "ctxmenu-rename", LOCALE.CAN_EDIT, false),
                ],
              }),
            ],
          }),

          // 2/6 — public vs secure. 148:41782.
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block ${p}__block--access`,
            sys_pn: BLOCKS.ACCESS,
            partHandler: ui,
            ...focus(BLOCKS.ACCESS, opt.lit),
            kids: [
              Skeletons.Note({ active: 0, className: `${p}__label`, content: LOCALE.ACCESS_MANAGEMENT }),
              Skeletons.Box.Y({ active: 0,
                className: `${p}__choices`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__choice`,
                    dataset: { on: 0 },
                    attrOpt: { "data-on": 0 },
                    kids: [
                      settingHead(p, "apps-globe", LOCALE.PUBLIC_SHARE, LOCALE.PUBLIC_SHARE_HINT, radio(p, false)),
                    ],
                  }),

                  // The selected choice, and the two settings it governs.
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}__choice`,
                    dataset: { on: 1 },
                    attrOpt: { "data-on": 1 },
                    kids: [
                      // Named so step 2 can measure where its ring stops: the
                      // ring covers the label and the two choice HEADS, not
                      // the settings nested below this one (see _sizeRing in
                      // ../index.js).
                      settingHead(p, "shield", LOCALE.SECURE_SHARE, LOCALE.SECURE_SHARE_HINT, radio(p, true),
                        { pn: "sp-secure-head", ui }),

                      // 3/6 — email gating.
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__card`,
                        sys_pn: BLOCKS.EMAIL,
                        partHandler: ui,
                        ...on(BLOCKS.EMAIL),
                        kids: [
                          settingHead(p, "ph-envelope-simple", LOCALE.SHARE_REQUIRE_EMAIL, LOCALE.REQUIRE_EMAIL_HINT, check(p, true, "sm")),
                          Skeletons.Box.Y({ active: 0,
                            className: `${p}__restrict`,
                            kids: [
                              Skeletons.Box.Y({ active: 0,
                                className: `${p}__restrict-top`,
                                kids: [
                                  Skeletons.Box.X({ active: 0,
                                    className: `${p}__restrict-row`,
                                    kids: [
                                      Skeletons.Box.X({ active: 0,
                                        className: `${p}__restrict-label`,
                                        kids: [
                                          Skeletons.Note({ active: 0, className: `${p}__restrict-text`, content: LOCALE.RESTRICT_TO_DOMAINS }),
                                          Skeletons.Image.Svg({ active: 0, ico: "info", className: `${p}__restrict-info` }),
                                        ],
                                      }),
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
                                      Skeletons.Box.Y({ active: 0,
                                        className: `${p}__chip ${p}__chip--more`,
                                        kids: [
                                          Skeletons.Note({ active: 0, className: `${p}__chip-text`, content: "+3" }),
                                        ],
                                      }),
                                    ],
                                  }),
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
                        ],
                      }),

                      // 4/6 — password.
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}__card`,
                        sys_pn: BLOCKS.PASSWORD,
                        partHandler: ui,
                        ...on(BLOCKS.PASSWORD),
                        kids: [
                          settingHead(p, "lock", LOCALE.ADD_PASSWORD, LOCALE.ADD_PASSWORD_HINT, check(p, true, "sm")),
                          Skeletons.Box.X({ active: 0,
                            className: `${p}__pass`,
                            kids: [
                              Skeletons.Note({ active: 0, className: `${p}__pass-text`, content: PASSWORD }),
                              Skeletons.Image.Svg({ active: 0, ico: "ctxmenu-rename", className: `${p}__pass-ico` }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 5/6 — expiry, and the link controls the frame groups with it
          // (148:41787: one block, 16 between its two halves).
          Skeletons.Box.Y({ active: 0,
            className: `${p}__block ${p}__block--expiry`,
            sys_pn: BLOCKS.EXPIRY,
            partHandler: ui,
            ...focus(BLOCKS.EXPIRY, opt.lit),
            kids: [
              Skeletons.Box.Y({ active: 0,
                className: `${p}__expiry`,
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
                    kids: [LOCALE.ONE_HOUR, LOCALE.ONE_DAY, LOCALE.SEVEN_DAYS, LOCALE.CUSTOM].map((t, i) =>
                      Skeletons.Box.X({ active: 0,
                        className: `${p}__segment`,
                        dataset: { on: i === 3 ? 1 : 0 },
                        attrOpt: { "data-on": i === 3 ? 1 : 0 },
                        kids: [
                          Skeletons.Note({ active: 0, className: `${p}__segment-label`, content: t }),
                        ],
                      }),
                    ),
                  }),
                ],
              }),

              Skeletons.Box.Y({ active: 0,
                className: `${p}__linkgroup`,
                kids: [
                  Skeletons.Box.X({ active: 0,
                    className: `${p}__cta`,
                    kids: [
                      Skeletons.Image.Svg({ active: 0, ico: "apps-link-simple", className: `${p}__cta-ico` }),
                      Skeletons.Note({ active: 0, className: `${p}__cta-label`, content: LOCALE.GET_LINK }),
                    ],
                  }),
                  Skeletons.Box.X({ active: 0,
                    className: `${p}__linkrow`,
                    kids: [
                      Skeletons.Box.X({ active: 0,
                        className: `${p}__link`,
                        kids: [
                          Skeletons.Image.Svg({ active: 0, ico: "apps-link-simple", className: `${p}__link-ico` }),
                          Skeletons.Note({ active: 0, className: `${p}__link-text`, content: LINK }),
                          Skeletons.Image.Svg({ active: 0, ico: "ctxmenu-copy", className: `${p}__link-copy` }),
                        ],
                      }),
                      Skeletons.Box.X({ active: 0,
                        className: `${p}__revoke`,
                        kids: [
                          Skeletons.Image.Svg({ active: 0, ico: "app-ban", className: `${p}__revoke-ico` }),
                          Skeletons.Note({ active: 0, className: `${p}__revoke-label`, content: LOCALE.REVOKE }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 6/6 — the open notification.
          Skeletons.Box.X({ active: 0,
            className: `${p}__block ${p}__block--row`,
            sys_pn: BLOCKS.NOTIFY,
            partHandler: ui,
            ...focus(BLOCKS.NOTIFY, opt.lit),
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
