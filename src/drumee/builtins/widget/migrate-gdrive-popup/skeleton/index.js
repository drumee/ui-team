/**
 * Migrate-gdrive popup — per-state skeleton.
 * Reads ui.getState() / ui.getJobSnap() / ui.isAutoFromOnboarding() to
 * render the right card body.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;

  const close = Skeletons.Button.Svg({
    className: `${pfx}__close`, ico: 'cross',
    service: 'close-migrate-popup', uiHandler: [ui],
  });
  const header = (title) => Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: title }),
      close,
    ],
  });

  const state = ui.getState();
  const snap = ui.getJobSnap() || {};
  const auto = ui.isAutoFromOnboarding();
  let body;

  if (state === 'checking') {
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--checking`,
      kids: [
        Skeletons.Note({ className: `${pfx}__loading`, content: LOCALE.LOADING || 'Loading…' }),
      ],
    });
  } else if (state === 'not-connected') {
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--not-connected`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__description`,
          content: LOCALE.MIGRATE_GDRIVE_CONNECT_HINT,
        }),
        Skeletons.Note({
          className: `${pfx}__primary-btn`,
          content: LOCALE.MIGRATE_GDRIVE_CONNECT_BTN,
          service: 'gdrive-connect', uiHandler: [ui],
        }),
        auto ? Skeletons.Note({
          className: `${pfx}__skip`,
          content: LOCALE.MIGRATE_GDRIVE_SKIP_FOR_NOW,
          service: 'gdrive-skip', uiHandler: [ui],
        }) : null,
      ].filter(Boolean),
    });
  } else if (state === 'ready') {
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--ready`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__description`,
          content: LOCALE.MIGRATE_GDRIVE_HINT,
        }),
        Skeletons.Box.Y({
          className: `${pfx}__field`,
          kids: [
            Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.DESTINATION || 'Destination' }),
            Skeletons.Note({ className: `${pfx}__destination`, content: ui._destinationName }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__field`,
          dataset: { partname: 'source-folder-input' },
          kids: [
            Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.MIGRATE_GDRIVE_SOURCE_FOLDER }),
            Skeletons.Entry({
              className: `${pfx}__entry`,
              placeholder: LOCALE.MIGRATE_GDRIVE_SOURCE_FOLDER_HELP,
              require: 'any',
              bubble: 0,
            }),
            Skeletons.Note({ className: `${pfx}__field-help`, content: LOCALE.MIGRATE_GDRIVE_SOURCE_FOLDER_HELP }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__toggle-row`,
          dataset: { partname: 'shared-drives-toggle', state: '0' },
          service: 'gdrive-toggle-shared',
          uiHandler: [ui],
          kids: [
            Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.MIGRATE_GDRIVE_INCLUDE_SHARED }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__cancel`,
              content: LOCALE.CANCEL || 'Cancel',
              service: 'close-migrate-popup', uiHandler: [ui],
            }),
            Skeletons.Note({
              className: `${pfx}__primary-btn`,
              content: LOCALE.MIGRATE_GDRIVE_START,
              service: 'gdrive-start', uiHandler: [ui],
            }),
            auto ? Skeletons.Note({
              className: `${pfx}__skip`,
              content: LOCALE.MIGRATE_GDRIVE_SKIP_FOR_NOW,
              service: 'gdrive-skip', uiHandler: [ui],
            }) : null,
          ].filter(Boolean),
        }),
      ],
    });
  } else if (state === 'in-progress') {
    const total = snap.total_files || 0;
    const done = snap.processed_files || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--in-progress`,
      kids: [
        Skeletons.Note({ className: `${pfx}__progress-label`, content: LOCALE.MIGRATION_IN_PROGRESS }),
        Skeletons.Box.X({
          className: `${pfx}__progress-bar`,
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__progress-fill`,
              styleOpt: { width: `${pct}%` },
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__progress-count`,
          content: (LOCALE.MIGRATION_PROGRESS_X_OF_Y || '{0} of {1} files')
            .replace('{0}', done).replace('{1}', total || '?'),
        }),
        Skeletons.Note({
          className: `${pfx}__cancel`,
          content: LOCALE.MIGRATE_GDRIVE_CANCEL_JOB,
          service: 'gdrive-cancel', uiHandler: [ui],
        }),
      ],
    });
  } else { // done | failed | cancelled
    const errors = snap.errors || [];
    const summary = (LOCALE.MIGRATION_DONE_SUMMARY || 'Imported {0} files in {1} folders. {2} errors.')
      .replace('{0}', snap.processed_files || 0)
      .replace('{1}', snap.total_folders || 0)
      .replace('{2}', errors.length);
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--done ${pfx}__body--${state}`,
      kids: [
        Skeletons.Note({ className: `${pfx}__progress-label`, content: LOCALE.MIGRATION_DONE_TITLE }),
        Skeletons.Note({ className: `${pfx}__summary`, content: summary }),
        Skeletons.Note({
          className: `${pfx}__primary-btn`,
          content: LOCALE.CLOSE || 'Close',
          service: 'close-migrate-popup', uiHandler: [ui],
        }),
      ],
    });
  }

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [header(LOCALE.MIGRATE_GDRIVE_TITLE), body],
  });
};
