/**
 * "Import a folder or file" — the Google Drive import dialog.
 * Figma 176:47527 / 180:49109 / 180:49990.
 *
 * Three states of one form, so this takes them as flags rather than being
 * three near-identical builders. There is deliberately no per-block dimming,
 * unlike the create-workspace dialog: the frames hold back the Files pane
 * behind it and leave the dialog whole, because its two numbered steps read as
 * one instruction.
 *
 * Visual only — no services. `mg-dialog` is the spotlight target; the address
 * row, the link entry and the submit each carry a `sys_pn` so a screen can
 * anchor the callout on the part it is talking about.
 */

// The service account the real dialog shows, and a sample link. Literals like
// the rest of the mock's fixtures: they are the example being taught, not UI
// labels.
const IMPORT_ADDRESS = "drumee-drive-import@growth-hacking-491411.ia…";
const SAMPLE_LINK = "https://drive.google.com";

// The real popup's BEM prefix, deliberately, for the destination card below.
const POPUP = "migrate-gdrive-popup";

// The folder shape the desk draws everywhere it names a place.
const folderArt = require("media/grid/template/folder");

/**
 * The destination card, borrowed whole from the real dialog.
 *
 * MOCK ONLY — no service, no part, nothing reads it. It is here because the
 * card the user meets after this tour opens with one, and a walkthrough that
 * omits it teaches a dialog with a different first row than the one that
 * actually appears.
 *
 * IT WEARS THE POPUP'S OWN CLASS NAMES rather than the tour's. That is the
 * whole point: this block takes its styling from
 * builtins/widget/migrate-gdrive-popup/skin, so the drawing cannot drift away
 * from the thing it is a drawing of. The step's skin loads that file for the
 * same reason (see ../index.js).
 *
 * The workspace it names is the tour's own fixture, like the address and the
 * link above it — an example, not the user's real destination, which the tour
 * has no way to know.
 */
function destCard() {
  return Skeletons.Box.X({ active: 0,
    className: `${POPUP}__dest-card`,
    kids: [
      Skeletons.Element({ active: 0,
        className: `${POPUP}__dest-ico`,
        content: folderArt({
          area: _a.personal,
          filetype: _a.hub,
          role: "desk",
          widgetId: _.uniqueId("mg-dest-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.Y({ active: 0,
        className: `${POPUP}__dest-text`,
        kids: [
          Skeletons.Note({ active: 0,
            className: `${POPUP}__field-label`,
            content: LOCALE.DESTINATION || "Destination",
          }),
          Skeletons.Note({ active: 0,
            className: `${POPUP}__destination`,
            content: LOCALE.MY_HOME || "My home",
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.copied] the address has been copied — Copy goes green
 * @param {Boolean} [opt.linked] a link has been pasted — Verify goes solid
 * @param {Boolean} [opt.enter] this screen is where the card arrives, so play
 *   the entrance. False between two dialog screens, where the card is already
 *   up and an animation would read as a flicker.
 */
module.exports = function (ui, opt = {}) {
  const pfx = ui.fig.family;
  const { copied = false, linked = false, enter = false } = opt;

  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__backdrop`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__dialog`,
        sys_pn: "mg-dialog",
        partHandler: ui,
        dataset: { enter: enter ? 1 : 0 },
        attrOpt: { "data-enter": enter ? 1 : 0 },
        kids: [
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__header`,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__heading`,
                content: LOCALE.IMPORT_FOLDER_OR_FILE,
              }),
              Skeletons.Image.Svg({ active: 0, ico: "cross", className: `${pfx}__close` }),
            ],
          }),

          destCard(),

          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__step`,
            sys_pn: "mg-address",
            partHandler: ui,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__step-label`,
                content: LOCALE.MIGRATE_STEP_SHARE_ADDRESS,
              }),
              Skeletons.Box.X({ active: 0,
                className: `${pfx}__address`,
                kids: [
                  Skeletons.Note({ active: 0,
                    className: `${pfx}__address-text`,
                    content: IMPORT_ADDRESS,
                  }),
                  Skeletons.Box.X({ active: 0,
                    className: `${pfx}__copy`,
                    dataset: { done: copied ? 1 : 0 },
                    attrOpt: { "data-done": copied ? 1 : 0 },
                    kids: [
                      // Shown on every screen where the address has been
                      // copied — screens 5 and 6, both of which carry
                      // `copied`. Deliberately not conditioned any finer: the
                      // tick means "copied", and a different glyph on the two
                      // screens that say the same thing would read as a bug.
                      copied
                        ? Skeletons.Image.Svg({ active: 0,
                            ico: "desktop_check",
                            className: `${pfx}__copy-ico`,
                          })
                        : null,
                      Skeletons.Note({ active: 0,
                        className: `${pfx}__copy-label`,
                        content: LOCALE.COPY,
                      }),
                    ].filter(Boolean),
                  }),
                ],
              }),
            ],
          }),

          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__step`,
            sys_pn: "mg-link",
            partHandler: ui,
            kids: [
              Skeletons.Note({ active: 0,
                className: `${pfx}__step-label`,
                content: LOCALE.MIGRATE_STEP_PASTE_LINK,
              }),
              Skeletons.Box.X({ active: 0,
                className: `${pfx}__entry`,
                kids: [
                  Skeletons.Note({ active: 0,
                    className: `${pfx}__entry-text`,
                    dataset: { filled: linked ? 1 : 0 },
                    attrOpt: { "data-filled": linked ? 1 : 0 },
                    content: linked ? SAMPLE_LINK : LOCALE.GDRIVE_SA_STEP2_TITLE,
                  }),
                ],
              }),
            ],
          }),

          Skeletons.Note({ active: 0,
            className: `${pfx}__submit`,
            sys_pn: "mg-verify",
            partHandler: ui,
            dataset: { ready: linked ? 1 : 0 },
            attrOpt: { "data-ready": linked ? 1 : 0 },
            content: LOCALE.VERIFY_AND_IMPORT,
          }),
        ],
      }),
    ],
  });
};
