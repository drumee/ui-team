/**
 * The import dialog, LIVE — what the tour's dialog becomes after Done.
 *
 * Same card, same classes (`tutorial-migrate__*`), real content: the address
 * is the service account's, Copy copies, the field takes a link, Import now
 * imports, and the card then shows the run to its end. The user was walked
 * through this exact card a moment ago, so it must not turn into a different
 * one — which is why this is not the popup.
 *
 * Renders a snapshot of libs/gdrive-sa-import and nothing else; every
 * decision about state lives there.
 *
 * NO `data-state` ANYWHERE: an unscoped global rule hides data-state="closed".
 * The phase rides on `data-phase`.
 *
 * @param {Object} ui the tutorial_migrate step
 * @param {Object} snap controller snapshot
 * @param {Object} dest {hub_id, nid, name, area, filetype}
 * @param {Object} [opt]
 * @param {String} [opt.link] what the field held, so a re-render keeps it
 */
const { destCard } = require('./dialog');
const { errorText, progressOf, summaryOf } = require('libs/gdrive-sa-import');

const FORM = ['loading', 'unavailable', 'idle', 'checking', 'verified'];

function heading(state) {
  switch (state) {
    case 'starting':
    case 'in-progress':
      return LOCALE.MIGRATE_GDRIVE_MIGRATING;
    case 'done':
      return LOCALE.MIGRATION_DONE_TITLE;
    case 'failed':
      return LOCALE.MIGRATION_FAILED_TITLE;
    case 'cancelled':
      return LOCALE.MIGRATION_CANCELLED_TITLE;
    default:
      return LOCALE.IMPORT_FOLDER_OR_FILE;
  }
}

module.exports = function (ui, snap = {}, dest = {}, opt = {}) {
  const pfx = ui.fig.family;
  const state = snap.state || 'loading';
  const note = (c, content, extra = {}) =>
    Skeletons.Note({ className: `${pfx}__${c}`, content, ...extra });
  const primary = (content, service) => Skeletons.Note({
    className: `${pfx}__submit`,
    content,
    dataset: { ready: service ? 1 : 0 },
    attrOpt: { 'data-ready': service ? 1 : 0 },
    ...(service ? { service, uiHandler: [ui] } : {}),
  });
  const secondary = (content, service) => Skeletons.Note({
    className: `${pfx}__live-secondary`, content, service, uiHandler: [ui],
  });

  let body;
  if (FORM.includes(state)) {
    const status = state === 'checking'
      ? note('live-status', LOCALE.LOADING || 'Checking…', { dataset: { kind: 'pending' } })
      : snap.error
        ? note('live-status', errorText(snap.error), { dataset: { kind: 'error' } })
        : snap.folder
          ? note('live-status',
            (LOCALE.GDRIVE_SA_FOUND || 'Folder found: {0}').replace('{0}', snap.folder.name),
            { dataset: { kind: 'ok' } })
          : null;
    const ready = !!snap.saEmail && state !== 'checking' && state !== 'loading';
    body = [
      destCard(dest),
      Skeletons.Box.Y({
        className: `${pfx}__step`,
        kids: [
          note('step-label', LOCALE.MIGRATE_STEP_SHARE_ADDRESS),
          Skeletons.Box.X({
            className: `${pfx}__address`,
            kids: [
              // The browser's own menu stays, so the address can also be
              // copied by hand.
              note('address-text', snap.saEmail || LOCALE.MIGRATE_GDRIVE_TREE_LOADING,
                { escapeContextmenu: true }),
              snap.saEmail ? Skeletons.Box.X({
                className: `${pfx}__copy`,
                service: 'mg-live-copy',
                uiHandler: [ui],
                kids: [note('copy-label', LOCALE.COPY)],
              }) : null,
            ].filter(Boolean),
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__step`,
        kids: [
          note('step-label', LOCALE.MIGRATE_STEP_PASTE_LINK),
          Skeletons.Box.X({
            className: `${pfx}__entry`,
            kids: [
              Skeletons.Entry({
                className: `${pfx}__live-input`,
                sys_pn: 'mg-live-link',
                partHandler: ui,
                placeholder: LOCALE.GDRIVE_SA_LINK_PLACEHOLDER,
                mode: 'commit',
                service: 'mg-live-verify',
                uiHandler: [ui],
                // Right-click must give the browser's Cut/Copy/Paste: without
                // it the desk opens its own menu and nobody can paste a link.
                escapeContextmenu: true,
                value: opt.link || (snap.folder && snap.folder.raw) || '',
              }),
            ],
          }),
          status,
        ].filter(Boolean),
      }),
      primary(LOCALE.GDRIVE_SA_IMPORT_NOW, ready ? 'mg-live-start' : null),
    ];
  } else if (state === 'starting' || state === 'in-progress') {
    const p = progressOf(snap.job || {});
    const { filesize } = require('@drumee/ui-essentials');
    const count = (LOCALE.MIGRATION_PROGRESS_X_OF_Y || '{0} of {1} files')
      .replace('{0}', p.done).replace('{1}', p.total || '?')
      + (p.bytesTotal > 0 ? ` · ${filesize(p.bytesSeen)} / ${filesize(p.bytesTotal)}` : '');
    body = [
      destCard(dest),
      Skeletons.Box.X({
        className: `${pfx}__live-bar`,
        kids: [Skeletons.Box.Y({ className: `${pfx}__live-fill`, styleOpt: { width: `${p.pct}%` } })],
      }),
      Skeletons.Box.X({
        className: `${pfx}__live-count-row`,
        kids: [note('live-count', count), note('live-pct', `${p.pct}%`)],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__live-log`,
        kids: (snap.fileLog || []).slice(-6).map((f) => Skeletons.Box.X({
          className: `${pfx}__live-log-row`,
          dataset: { status: f.status },
          kids: [
            note('live-log-name', f.name),
            note('live-log-status', f.status === 'done'
              ? (LOCALE.DONE || 'Done')
              : `${LOCALE.UPLOADING || 'Uploading'}…`),
          ],
        })),
      }),
      // NO service: caught on pointerup by the step (_installLiveCancel). The
      // 2s re-feed can replace this node between mousedown and mouseup, and a
      // click only fires when both land on the same element.
      state === 'in-progress' ? Skeletons.Note({
        className: `${pfx}__submit ${pfx}__live-cancel`,
        content: snap.cancelRequested
          ? (LOCALE.MIGRATE_GDRIVE_CANCELLING || 'Cancelling…')
          : (LOCALE.MIGRATE_GDRIVE_CANCEL_JOB || 'Cancel migration'),
        attrOpt: snap.cancelRequested ? { 'data-disabled': 1 } : {},
      }) : null,
    ].filter(Boolean);
  } else {
    const job = snap.job || {};
    const sm = summaryOf(job);
    const isDone = state === 'done';
    const line = (LOCALE.MIGRATE_GDRIVE_SUMMARY_BASE || 'Imported {0} files in {1} folders.')
      .replace('{0}', sm.processed).replace('{1}', sm.folders);
    const extra = sm.failures.length
      ? (LOCALE.MIGRATE_GDRIVE_SUMMARY_ERRORS || '{0} errors.').replace('{0}', sm.failures.length)
      : sm.skipped.length
        ? (LOCALE.MIGRATE_GDRIVE_SUMMARY_SKIPPED || '{0} skipped.').replace('{0}', sm.skipped.length)
        : '';
    const reason = (!isDone && job.failed_reason)
      ? (job.failed_reason === 'ACCESS_REVOKED'
        ? LOCALE.MIGRATE_GDRIVE_ACCESS_REVOKED
        : String(job.failed_reason))
      : null;
    body = [
      destCard(dest),
      note('live-summary', extra ? `${line} ${extra}` : line,
        { dataset: { kind: sm.failures.length ? 'error' : 'ok' } }),
      reason ? note('live-status', reason, { dataset: { kind: 'error' } }) : null,
      Skeletons.Box.X({
        className: `${pfx}__live-actions`,
        kids: [
          secondary(LOCALE.CLOSE || 'Close', 'mg-live-close'),
          primary(isDone
            ? (LOCALE.MIGRATE_GDRIVE_AGAIN || 'Migrate again')
            : (LOCALE.MIGRATE_GDRIVE_RETRY || 'Try again'), 'mg-live-again'),
        ],
      }),
    ].filter(Boolean);
  }

  return Skeletons.Box.Y({
    className: `${pfx}__stage ${pfx}__stage--live`,
    kids: [Skeletons.Box.Y({
      className: `${pfx}__overlay`,
      kids: [Skeletons.Box.Y({
        className: `${pfx}__backdrop`,
        kids: [Skeletons.Box.Y({
          className: `${pfx}__dialog`,
          sys_pn: 'mg-dialog',
          partHandler: ui,
          dataset: { live: 1, phase: state },
          attrOpt: { 'data-live': 1, 'data-phase': state },
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__header`,
              kids: [
                note('heading', heading(state)),
                Skeletons.Button.Svg({
                  ico: 'cross',
                  className: `${pfx}__close ${pfx}__live-close`,
                  service: 'mg-live-close',
                  uiHandler: [ui],
                }),
              ],
            }),
            ...body,
          ],
        })],
      })],
    })],
  });
};
