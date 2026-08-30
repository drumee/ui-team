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

/**
 * @param {Object} ui
 * @param {Object} [opt]
 * @param {Boolean} [opt.copied] the address has been copied — Copy goes green
 * @param {Boolean} [opt.linked] a link has been pasted — Verify goes solid
 */
module.exports = function (ui, opt = {}) {
  const pfx = ui.fig.family;
  const { copied = false, linked = false } = opt;

  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__backdrop`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__dialog`,
        sys_pn: "mg-dialog",
        partHandler: ui,
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
                      copied
                        ? Skeletons.Image.Svg({ active: 0,
                            ico: "checked",
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
