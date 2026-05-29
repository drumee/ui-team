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
      Skeletons.Box.X({
        className: `${pfx}__title-wrap`,
        kids: [
          Skeletons.Image.Svg({ ico: 'logo-google', className: `${pfx}__title-ico` }),
          Skeletons.Note({ className: `${pfx}__title`, content: title }),
        ],
      }),
      close,
    ],
  });

  // Reusable hero block: big icon + title + subtitle.
  const hero = (ico, heroClass, title, subtitle) => Skeletons.Box.Y({
    className: `${pfx}__hero ${heroClass}`,
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx}__hero-ico` }),
      title ? Skeletons.Note({ className: `${pfx}__hero-title`, content: title }) : null,
      subtitle ? Skeletons.Note({ className: `${pfx}__hero-sub`, content: subtitle }) : null,
    ].filter(Boolean),
  });

  const primaryBtn = (content, service) => Skeletons.Note({
    className: `${pfx}__primary-btn`, content, service, uiHandler: [ui],
  });

  const state = ui.getState();
  const snap = ui.getJobSnap() || {};
  const auto = ui.isAutoFromOnboarding();
  let body;

  if (state === 'checking') {
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--checking`,
      kids: [
        Skeletons.Box.Y({ className: `${pfx}__spinner` }),
        Skeletons.Note({ className: `${pfx}__loading`, content: LOCALE.LOADING || 'Checking connection…' }),
      ],
    });
  } else if (state === 'not-connected') {
    const err = ui.getConnectError && ui.getConnectError();
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--not-connected`,
      kids: [
        hero('logo-google', `${pfx}__hero--brand`,
          LOCALE.MIGRATE_GDRIVE_CONNECT_TITLE || 'Connect your Google Drive',
          LOCALE.MIGRATE_GDRIVE_CONNECT_HINT),
        err ? Skeletons.Note({
          className: `${pfx}__status`,
          dataset: { state: '1', kind: 'error' },
          content: (LOCALE.MIGRATE_GDRIVE_CONNECT_ERROR || 'Connection failed: {0}').replace('{0}', err),
        }) : null,
        primaryBtn(LOCALE.MIGRATE_GDRIVE_CONNECT_BTN, 'gdrive-connect'),
        auto ? Skeletons.Note({
          className: `${pfx}__skip`,
          content: LOCALE.MIGRATE_GDRIVE_SKIP_FOR_NOW,
          service: 'gdrive-skip', uiHandler: [ui],
        }) : null,
      ].filter(Boolean),
    });
  } else if (state === 'ready') {
    const shared = ui.getIncludeShared ? ui.getIncludeShared() : 0;
    const seedFolder = ui.getSourceFolderId && ui.getSourceFolderId() !== 'root'
      ? ui.getSourceFolderId() : '';
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--ready`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__description`,
          content: LOCALE.MIGRATE_GDRIVE_HINT,
        }),
        // Destination card — where files will land.
        Skeletons.Box.X({
          className: `${pfx}__dest-card`,
          kids: [
            Skeletons.Image.Svg({ ico: 'desktop_folder', className: `${pfx}__dest-ico` }),
            Skeletons.Box.Y({
              className: `${pfx}__dest-text`,
              kids: [
                Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.DESTINATION || 'Destination' }),
                Skeletons.Note({ className: `${pfx}__destination`, content: ui._destinationName }),
              ],
            }),
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
              value: seedFolder,
              require: 'any',
              bubble: 0,
            }),
            Skeletons.Note({ className: `${pfx}__field-help`, content: LOCALE.MIGRATE_GDRIVE_SOURCE_FOLDER_HELP }),
          ],
        }),
        // Real toggle switch (track + knob) instead of a unicode checkbox.
        Skeletons.Box.X({
          className: `${pfx}__toggle-row`,
          dataset: { partname: 'shared-drives-toggle', state: String(shared) },
          service: 'gdrive-toggle-shared',
          uiHandler: [ui],
          kids: [
            Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.MIGRATE_GDRIVE_INCLUDE_SHARED }),
            Skeletons.Box.X({
              className: `${pfx}__switch`,
              kids: [Skeletons.Box.Y({ className: `${pfx}__switch-knob` })],
            }),
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
            primaryBtn(LOCALE.MIGRATE_GDRIVE_START, 'gdrive-start'),
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
    const cur = snap.current_filename;
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--in-progress`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__progress-head`,
          kids: [
            Skeletons.Image.Svg({ ico: 'cloud-pause', className: `${pfx}__progress-ico` }),
            Skeletons.Note({ className: `${pfx}__progress-label`, content: LOCALE.MIGRATION_IN_PROGRESS }),
            Skeletons.Note({ className: `${pfx}__progress-pct`, content: `${pct}%` }),
          ],
        }),
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
        // Current file being imported (truncated by CSS).
        cur ? Skeletons.Note({
          className: `${pfx}__progress-current`,
          content: (LOCALE.MIGRATION_IMPORTING_FILE || 'Importing: {0}').replace('{0}', cur),
        }) : null,
        Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__cancel`,
              content: LOCALE.MIGRATE_GDRIVE_CANCEL_JOB,
              service: 'gdrive-cancel', uiHandler: [ui],
            }),
          ],
        }),
      ].filter(Boolean),
    });
  } else { // done | failed | cancelled
    const errors = snap.errors || [];
    const isDone = state === 'done';
    const isFailed = state === 'failed';
    const heroIco = isDone ? 'apps-check-circle' : (isFailed ? 'alert' : 'cloud-pause');
    const heroMod = isDone ? `${pfx}__hero--success` : (isFailed ? `${pfx}__hero--error` : `${pfx}__hero--neutral`);
    const heroTitle = isDone
      ? (LOCALE.MIGRATION_DONE_TITLE || 'Migration complete')
      : isFailed
        ? (LOCALE.MIGRATION_FAILED_TITLE || 'Migration failed')
        : (LOCALE.MIGRATION_CANCELLED_TITLE || 'Migration cancelled');
    const summary = (LOCALE.MIGRATION_DONE_SUMMARY || 'Imported {0} files in {1} folders. {2} errors.')
      .replace('{0}', snap.processed_files || 0)
      .replace('{1}', snap.total_folders || 0)
      .replace('{2}', errors.length);
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--result ${pfx}__body--${state}`,
      kids: [
        hero(heroIco, heroMod, heroTitle, null),
        Skeletons.Note({ className: `${pfx}__summary`, content: summary }),
        // Top-level failure reason (Bull failedReason). Per-file errors land
        // in the list below; this surfaces a job-wide throw (e.g. token /
        // destination resolution) that would otherwise show as "0 errors".
        (isFailed && snap.failed_reason) ? Skeletons.Note({
          className: `${pfx}__summary ${pfx}__fail-reason`,
          dataset: { kind: 'error' },
          content: String(snap.failed_reason),
        }) : null,
        // Error detail list (first few) when present.
        errors.length ? Skeletons.Box.Y({
          className: `${pfx}__error-list`,
          kids: errors.slice(0, 5).map((e) => Skeletons.Note({
            className: `${pfx}__error-item`,
            content: `${e.file || e.folder || '?'} — ${e.reason || e.code || 'error'}`,
          })),
        }) : null,
        Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [primaryBtn(LOCALE.CLOSE || 'Close', 'close-migrate-popup')],
        }),
      ].filter(Boolean),
    });
  }

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [header(LOCALE.MIGRATE_GDRIVE_TITLE), body],
  });
};
