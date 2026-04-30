module.exports = function (ui) {
  const fig = ui.fig.family;
  const error = ui.getImportError();
  const progress = ui.getImportProgress();

  const progressNote = (() => {
    if (!progress) return null;
    if (progress.stage === "uploading") {
      return `${LOCALE.UPLOADING || "Uploading"}: ${progress.filename || ""}`;
    }
    if (progress.stage === "loading") {
      return LOCALE.IMPORT_IN_PROGRESS || "Importing contacts…";
    }
    if (progress.stage === "done") {
      return `${LOCALE.IMPORT_DONE || "Imported"}: ${progress.loaded || 0}/${progress.total || 0}`;
    }
    return null;
  })();

  return Skeletons.Box.Y({
    className: `${fig}__modal-backdrop`,
    bubble: 0,
    service: "cancel-import",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__modal`,
        bubble: 0,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__modal-form`,
            kids: [
              Skeletons.Box.X({
                className: `${fig}__modal-header`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__modal-title`,
                    content: LOCALE.IMPORT_CONTACTS || "Import contacts",
                  }),
                  Skeletons.Button.Svg({
                    className: `${fig}__modal-close`,
                    ico: "cross",
                    bubble: 0,
                    service: "cancel-import",
                    uiHandler: [ui],
                  }),
                ],
              }),
              error
                ? Skeletons.Note({
                    className: `${fig}__modal-error`,
                    content: error,
                  })
                : null,
              progressNote
                ? Skeletons.Note({
                    className: `${fig}__import-status`,
                    content: progressNote,
                  })
                : null,
              Skeletons.Box.Y({
                className: `${fig}__import-options`,
                kids: [
                  Skeletons.Box.X({
                    className: `${fig}__import-option`,
                    bubble: 0,
                    service: "pick-import-file",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Note({
                        className: `${fig}__import-option-title`,
                        content: LOCALE.IMPORT_FROM_FILE || "From file",
                      }),
                      Skeletons.Note({
                        className: `${fig}__import-option-sub`,
                        content: LOCALE.IMPORT_FROM_FILE_HINT || "Upload a .csv or .vcf file",
                      }),
                    ],
                  }),
                  Skeletons.Box.X({
                    className: `${fig}__import-option`,
                    bubble: 0,
                    service: "google-sync",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Note({
                        className: `${fig}__import-option-title`,
                        content: LOCALE.IMPORT_FROM_GOOGLE || "From Google Contacts",
                      }),
                      Skeletons.Note({
                        className: `${fig}__import-option-sub`,
                        content: LOCALE.IMPORT_FROM_GOOGLE_HINT
                          || "Authorize Drumee to read your Google contacts",
                      }),
                    ],
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${fig}__modal-actions`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__btn ${fig}__btn--secondary`,
                    content: LOCALE.CLOSE || "Close",
                    bubble: 0,
                    service: "cancel-import",
                    uiHandler: [ui],
                  }),
                ],
              }),
            ].filter(Boolean),
          }),
        ],
      }),
    ],
  });
};
