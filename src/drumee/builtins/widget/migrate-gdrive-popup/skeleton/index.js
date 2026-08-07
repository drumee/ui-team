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

  const secondaryBtn = (content, service) => Skeletons.Note({
    className: `${pfx}__cancel`, content, service, uiHandler: [ui],
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
        // Peer option: share-to-SA import needs NO Google connection (the SA
        // reads the shared item with its own credentials), so it's offered
        // here too — not only after connecting.
        (ui.isSaAvailable && ui.isSaAvailable()) ? Skeletons.Box.Y({
          className: `${pfx}__alt`,
          kids: [
            Skeletons.Note({ className: `${pfx}__or`, content: LOCALE.OR || 'or' }),
            Skeletons.Box.X({
              className: `${pfx}__sa-cta ${pfx}__sa-cta--ghost`,
              service: 'gdrive-sa-open',
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Image.Svg({ ico: 'desktop_folder', className: `${pfx}__sa-cta-ico` }),
                Skeletons.Note({ className: `${pfx}__sa-cta-label`, content: LOCALE.GDRIVE_SA_TITLE }),
              ],
            }),
            Skeletons.Note({ className: `${pfx}__sa-cta-sub`, content: LOCALE.GDRIVE_SA_NO_CONNECT || 'No Google sign-in needed — just share the item with our address.' }),
          ],
        }) : null,
        auto ? Skeletons.Note({
          className: `${pfx}__skip`,
          content: LOCALE.MIGRATE_GDRIVE_SKIP_FOR_NOW,
          service: 'gdrive-skip', uiHandler: [ui],
        }) : null,
      ].filter(Boolean),
    });
  } else if (state === 'ready') {
    const shared = ui.getIncludeShared ? ui.getIncludeShared() : 0;
    const mode = ui.getMigrateMode ? ui.getMigrateMode() : 'all';
    const isSelected = mode === 'selected';
    // drive.file flow: the in-app tree/mode UI is replaced by the Google
    // Picker — the token can only see what the user explicitly picks there.
    // Legacy drive.readonly grants keep the original whole-Drive UI.
    const usesPicker = !!(ui.usesPicker && ui.usesPicker());
    const pickerDocs = (usesPicker && ui.getPickerDocs) ? ui.getPickerDocs() : [];

    // Radio: Migrate everything | Choose folders & files.
    const modeRadio = (label, value) => Skeletons.Box.X({
      className: `${pfx}__mode-opt`,
      dataset: { state: mode === value ? '1' : '0' },
      service: 'gdrive-mode',
      mode: value,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Box.X({ className: `${pfx}__mode-radio`, kids: [Skeletons.Box.Y({ className: `${pfx}__mode-dot` })] }),
        Skeletons.Note({ className: `${pfx}__mode-label`, content: label }),
      ],
    });
    const connectedEmail = (ui.getConnectedEmail && ui.getConnectedEmail()) || '';
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--ready`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__description`,
          content: LOCALE.MIGRATE_GDRIVE_HINT,
        }),
        // Connected Google account — confirm which Drive, and manage it:
        // Switch account (re-OAuth with the account chooser) / Disconnect.
        connectedEmail ? Skeletons.Box.X({
          className: `${pfx}__account-row`,
          kids: [
            Skeletons.Image.Svg({ ico: 'logo-google', className: `${pfx}__account-ico` }),
            Skeletons.Box.Y({
              className: `${pfx}__account-text`,
              kids: [
                Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.MIGRATE_GDRIVE_CONNECTED_AS || 'Connected as' }),
                Skeletons.Note({ className: `${pfx}__account-email`, content: connectedEmail }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}__account-actions`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__account-action`,
                  content: LOCALE.MIGRATE_GDRIVE_SWITCH_ACCOUNT || 'Switch account',
                  service: 'gdrive-switch-account', uiHandler: [ui],
                }),
                Skeletons.Note({
                  className: `${pfx}__account-action ${pfx}__account-action--danger`,
                  content: LOCALE.DISCONNECT || 'Disconnect',
                  service: 'gdrive-disconnect', uiHandler: [ui],
                }),
              ],
            }),
          ],
        }) : null,
        // Returning user (already migrated once): frame this run as an
        // incremental sync — new files only, existing ones skipped.
        (ui.hasPriorJob && ui.hasPriorJob()) ? Skeletons.Note({
          className: `${pfx}__resync-hint`,
          content: LOCALE.MIGRATE_GDRIVE_RESYNC_HINT,
        }) : null,
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
        // ── drive.file flow: two EQUAL import entry points ──
        // 1. Google Picker — pick individual files (open folders, multiselect)
        // 2. Share-to-SA — import an entire folder tree
        // Same CTA style/size for both, stacked full-width.
        usesPicker ? Skeletons.Box.Y({
          className: `${pfx}__picker`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__sa-cta`,
              service: 'gdrive-open-picker',
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Image.Svg({ ico: 'desktop_docfile', className: `${pfx}__sa-cta-ico` }),
                Skeletons.Note({ className: `${pfx}__sa-cta-label`, content: LOCALE.GDRIVE_PICKER_CHOOSE }),
              ],
            }),
            (ui.isSaAvailable && ui.isSaAvailable()) ? Skeletons.Box.X({
              className: `${pfx}__sa-cta`,
              service: 'gdrive-sa-open',
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Image.Svg({ ico: 'desktop_folder', className: `${pfx}__sa-cta-ico` }),
                Skeletons.Note({ className: `${pfx}__sa-cta-label`, content: LOCALE.GDRIVE_SA_TITLE }),
              ],
            }) : null,
            Skeletons.Note({
              className: `${pfx}__picker-hint`,
              content: LOCALE.GDRIVE_PICKER_HINT,
            }),
            // Staged Picker picks (removable) — Start appears in the footer
            // once something is staged.
            pickerDocs.length ? Skeletons.Box.Y({
              className: `${pfx}__picker-list`,
              kids: pickerDocs.map((d) => Skeletons.Box.X({
                className: `${pfx}__picker-item`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: d.is_folder ? 'desktop_folder' : 'desktop_docfile',
                    className: `${pfx}__picker-item-ico`,
                  }),
                  Skeletons.Note({ className: `${pfx}__picker-item-name`, content: d.name }),
                  Skeletons.Button.Svg({
                    ico: 'cross',
                    className: `${pfx}__picker-item-remove`,
                    service: 'gdrive-picker-remove',
                    gid: d.id,
                    uiHandler: [ui],
                    bubble: 0,
                  }),
                ],
              })),
            }) : null,
          ].filter(Boolean),
        }) : null,
        // ── legacy drive.readonly flow: mode radio + shared toggle + tree ──
        // Mode selector.
        !usesPicker ? Skeletons.Box.Y({
          className: `${pfx}__mode`,
          kids: [
            modeRadio(LOCALE.MIGRATE_GDRIVE_MODE_ALL || 'Migrate everything', 'all'),
            modeRadio(LOCALE.MIGRATE_GDRIVE_MODE_SELECTED || 'Choose folders & files', 'selected'),
          ],
        }) : null,
        // Shared Drives toggle — All mode only. (Track + knob; only the switch
        // is clickable. data-state on the row drives styling + is read by
        // _getInputs.)
        (!usesPicker && !isSelected) ? Skeletons.Box.X({
          className: `${pfx}__toggle-row`,
          dataset: { partname: 'shared-drives-toggle', state: String(shared) },
          kids: [
            Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.MIGRATE_GDRIVE_INCLUDE_SHARED }),
            Skeletons.Box.X({
              className: `${pfx}__switch`,
              service: 'gdrive-toggle-shared',
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [Skeletons.Box.Y({ className: `${pfx}__switch-knob` })],
            }),
          ],
        }) : null,
        // Picker tree — Selected mode only.
        (!usesPicker && isSelected) ? Skeletons.List.Scroll({
          className: `${pfx}__tree`,
          sys_pn: 'gdrive-tree',
          flow: 'y',
          kids: require('./tree')(ui),
        }) : null,
        // Footer (Figma 1646:91930): one full-width primary. Legacy
        // mode=selected reads "Next" (goes to the Choose-folders step).
        // drive.file users get Start only once Picker picks are staged —
        // the SA path starts from its own screen.
        (!usesPicker || pickerDocs.length) ? Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__primary-btn ${pfx}__primary-btn--full`,
              sys_pn: 'gdrive-start-btn',
              content: (!usesPicker && isSelected) ? (LOCALE.NEXT || 'Next') : LOCALE.MIGRATE_GDRIVE_START,
              service: (!usesPicker && isSelected) ? 'gdrive-next' : 'gdrive-start',
              uiHandler: [ui],
            }),
          ],
        }) : null,
        auto ? Skeletons.Note({
          className: `${pfx}__skip`,
          content: LOCALE.MIGRATE_GDRIVE_SKIP_FOR_NOW,
          service: 'gdrive-skip', uiHandler: [ui],
        }) : null,
      ].filter(Boolean),
    });
  } else if (state === 'sa') {
    // Whole-folder import via share-to-SA: the user shares a Drive folder
    // with our service account's email, pastes its link, we verify (share +
    // ownership) and import the entire tree with the SA's own auth.
    const email = (ui.getSaEmail && ui.getSaEmail()) || '';
    const saF = ui.getSaFolder && ui.getSaFolder();
    const saErr = ui.getSaError && ui.getSaError();
    const checking = !!(ui.isSaChecking && ui.isSaChecking());
    const ERR_TEXT = {
      SA_NOT_SHARED: LOCALE.GDRIVE_SA_NOT_SHARED,
      SA_NOT_OWNER: LOCALE.GDRIVE_SA_NOT_OWNER,
      SA_NEEDS_GOOGLE: LOCALE.GDRIVE_SA_NEEDS_GOOGLE,
      SA_BAD_LINK: LOCALE.GDRIVE_SA_BAD_LINK,
      SA_NOT_A_FOLDER: LOCALE.GDRIVE_SA_NOT_A_FOLDER,
    };
    // Two numbered steps, each a titled block. The old screen ran the step
    // numbers inline in prose ("1. In Google Drive, share…"), so the two
    // actions read as one paragraph of instructions with controls scattered
    // through it — the user could not see at a glance that this is a
    // do-this-then-that task, or which half they were on.
    const step = (n, title, kids) => Skeletons.Box.Y({
      className: `${pfx}__sa-step`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__sa-step-head`,
          kids: [
            Skeletons.Note({ className: `${pfx}__sa-step-badge`, content: String(n) }),
            Skeletons.Note({ className: `${pfx}__sa-step-title`, content: title }),
          ],
        }),
        ...kids.filter(Boolean),
      ],
    });

    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--sa`,
      kids: [
        // Destination card — same block the ready pane shows. Matters most
        // here: the folder-window "+ New" launch targets the folder the user
        // is standing in, and this line is how they see that before
        // committing an import into it.
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
        step(1, LOCALE.GDRIVE_SA_STEP1_TITLE, [
          Skeletons.Note({ className: `${pfx}__description`, content: LOCALE.GDRIVE_SA_STEP1_BODY }),
          Skeletons.Box.X({
            className: `${pfx}__sa-email-card`,
            kids: [
              // Same reason as the link input below: keep the browser's own
              // menu so the address can be copied with the mouse too.
              Skeletons.Note({
                className: `${pfx}__sa-email`,
                content: email,
                escapeContextmenu: true,
              }),
              Skeletons.Note({
                className: `${pfx}__sa-copy`,
                dataset: { partname: 'sa-copy-btn' },
                content: LOCALE.COPY || 'Copy',
                service: 'gdrive-sa-copy', uiHandler: [ui],
              }),
            ],
          }),
        ]),
        step(2, LOCALE.GDRIVE_SA_STEP2_TITLE, [
        Skeletons.Box.X({
          className: `${pfx}__sa-input-row`,
          dataset: { partname: 'sa-folder-row' },
          kids: [
            Skeletons.Entry({
              className: `${pfx}__sa-input`,
              placeholder: LOCALE.GDRIVE_SA_LINK_PLACEHOLDER,
              mode: 'commit',
              service: 'gdrive-sa-verify',
              uiHandler: [ui],
              // Right-click must give the browser's own Cut/Copy/Paste menu:
              // without this the handler walks up to the desk/home manager,
              // opens ITS context menu under the popup and preventDefault()s
              // the native one — so users cannot paste the Drive link.
              escapeContextmenu: true,
            }),
          ],
        }),
        checking ? Skeletons.Note({
          className: `${pfx}__sa-status`,
          content: LOCALE.LOADING || 'Checking…',
        }) : null,
        (saF && !checking) ? Skeletons.Note({
          className: `${pfx}__sa-status`,
          dataset: { kind: 'ok' },
          content: (LOCALE.GDRIVE_SA_FOUND || 'Folder found: {0}').replace('{0}', saF.name),
        }) : null,
        (saErr && !checking) ? Skeletons.Note({
          className: `${pfx}__sa-status`,
          dataset: { kind: 'error' },
          content: ERR_TEXT[saErr] || LOCALE.GDRIVE_SA_NOT_SHARED,
        }) : null,
        ]),
        // SA-only: this is the popup's main screen, so there's no "Back"
        // destination — just the full-width primary action.
        Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__primary-btn ${pfx}__primary-btn--full`,
              // One label for both halves of the action. It used to read
              // "Verify & import" before a link was checked and "Start
              // migration" after — narrating our own two-phase implementation
              // at the user, who only ever asked for one thing.
              content: LOCALE.GDRIVE_SA_IMPORT_NOW,
              service: 'gdrive-sa-start',
              uiHandler: [ui],
            }),
          ],
        }),
      ].filter(Boolean),
    });
  } else if (state === 'choose') {
    // Step 2 (legacy readonly, Figma 1639:52297 / 1657:9475): the folder tree
    // as its own screen — hint, tree rows with sizes, selection summary,
    // Back + Start Migrate.
    const sel = ui.getSelectionSummary ? ui.getSelectionSummary() : { folders: 0, files: 0, bytes: 0 };
    const { filesize } = require('@drumee/ui-essentials');
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--choose`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__description`,
          content: LOCALE.MIGRATE_GDRIVE_CHOOSE_HINT,
        }),
        Skeletons.List.Scroll({
          className: `${pfx}__tree`,
          sys_pn: 'gdrive-tree',
          flow: 'y',
          kids: require('./tree')(ui),
        }),
        Skeletons.Box.X({
          className: `${pfx}__summary-row`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__summary-count`,
              content: (LOCALE.MIGRATE_GDRIVE_FOLDERS_SELECTED || '{0} folders selected')
                .replace('{0}', sel.folders + sel.files),
            }),
            sel.bytes ? Skeletons.Note({
              className: `${pfx}__summary-total`,
              content: (LOCALE.MIGRATE_GDRIVE_TOTAL || '{0} total').replace('{0}', filesize(sel.bytes)),
            }) : null,
          ].filter(Boolean),
        }),
        Skeletons.Box.X({
          className: `${pfx}__footer ${pfx}__btn-row`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__back-btn`,
              content: LOCALE.BACK || 'Back',
              service: 'gdrive-back', uiHandler: [ui],
            }),
            Skeletons.Note({
              className: `${pfx}__primary-btn ${pfx}__primary-btn--grow`,
              sys_pn: 'gdrive-start-btn',
              dataset: (ui.hasSelection && !ui.hasSelection()) ? { disabled: '1' } : undefined,
              content: LOCALE.MIGRATE_GDRIVE_START,
              service: 'gdrive-start',
              uiHandler: [ui],
            }),
          ],
        }),
      ].filter(Boolean),
    });
  } else if (state === 'in-progress') {
    // Figma 1640:83630 — "Migrating files…": keep-open note, progress bar,
    // "X of Y files" + %, rolling per-file list with status chips, and a
    // full-width primary Cancel.
    const total = snap.total_files || 0;
    const done = snap.processed_files || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const log = (ui.getFileLog ? ui.getFileLog() : []).slice(-8);
    const chip = (kind, label) => Skeletons.Note({
      className: `${pfx}__chip`, dataset: { kind }, content: label,
    });
    body = Skeletons.Box.Y({
      className: `${pfx}__body ${pfx}__body--in-progress`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__progress-label`,
          content: LOCALE.MIGRATE_GDRIVE_IMPORTING_FROM,
        }),
        Skeletons.Note({
          className: `${pfx}__keep-open`,
          content: LOCALE.MIGRATE_GDRIVE_KEEP_OPEN,
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
        Skeletons.Box.X({
          className: `${pfx}__progress-row`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__progress-count`,
              content: (LOCALE.MIGRATION_PROGRESS_X_OF_Y || '{0} of {1} files')
                .replace('{0}', done).replace('{1}', total || '?'),
            }),
            Skeletons.Note({ className: `${pfx}__progress-pct`, content: `${pct}%` }),
          ],
        }),
        log.length ? Skeletons.Box.Y({
          className: `${pfx}__filelog`,
          kids: log.map((f) => Skeletons.Box.X({
            className: `${pfx}__filelog-row`,
            kids: [
              Skeletons.Image.Svg({ ico: 'app-file', className: `${pfx}__filelog-ico` }),
              Skeletons.Note({ className: `${pfx}__filelog-name`, content: f.name }),
              f.status === 'done'
                ? chip('done', LOCALE.DONE || 'Done')
                : chip('uploading', (LOCALE.UPLOADING || 'Uploading') + '…'),
            ],
          })),
        }) : null,
        Skeletons.Box.X({
          className: `${pfx}__footer`,
          kids: [
            Skeletons.Note({
              // --cancel-job also anchors the widget's root pointerup
              // delegate: the 2s status poll re-feeds this whole screen, so
              // the button ELEMENT is replaced mid-click and the engine's
              // per-element click never completes (tester 2026-07-30:
              // "không ấn được cancel"). The delegate survives re-renders.
              className: `${pfx}__primary-btn ${pfx}__primary-btn--full ${pfx}__primary-btn--cancel-job`,
              dataset: ui._cancelRequested ? { disabled: 1 } : undefined,
              content: ui._cancelRequested
                ? (LOCALE.MIGRATE_GDRIVE_CANCELLING || 'Cancelling…')
                : (LOCALE.MIGRATE_GDRIVE_CANCEL_JOB || 'Cancel migration'),
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
    // NEEDS_RECONNECT = the stored Drive token is dead (revoked, or clobbered
    // by a later Google *login* writing a login-client token over the row).
    // "Try again" would re-fail immediately; the user must re-authorize Drive.
    const needsReconnect = isFailed && snap.failed_reason === 'NEEDS_RECONNECT';
    // ACCESS_REVOKED = the folder's share was removed DURING the run; the
    // worker's access sentinel stopped the job (2026-07-29). Distinct from
    // NEEDS_RECONNECT: the OAuth grant is fine, only the item is gone —
    // "Try again" is the right CTA once sharing is restored.
    const accessRevoked = isFailed && snap.failed_reason === 'ACCESS_REVOKED';
    // Summary per Figma 1645:86388/86966: base sentence + errors fragment,
    // the fragment turning red when > 0.
    const summaryBase = (LOCALE.MIGRATE_GDRIVE_SUMMARY_BASE || 'Imported {0} files in {1} folders.')
      .replace('{0}', snap.processed_files || 0)
      .replace('{1}', snap.total_folders || 0);
    // Not every entry in `errors` is a failure. The importer reports skipped
    // items through the same channel — a Drive SHORTCUT is deliberately not
    // followed, and a real run of a shared folder produced 30 of them against
    // 140 imported files. Counting those as "30 errors" told the user their
    // migration was broken when nothing was lost, so the two are separated and
    // only genuine failures are coloured as errors.
    const SKIP_CODES = ['SHORTCUT_SKIPPED'];
    const skipped = errors.filter((e) => SKIP_CODES.includes(e.code));
    const failures = errors.filter((e) => !SKIP_CODES.includes(e.code));
    const summaryErr = failures.length
      ? (LOCALE.MIGRATE_GDRIVE_SUMMARY_ERRORS || '{0} errors.').replace('{0}', failures.length)
      : (skipped.length
          ? (LOCALE.MIGRATE_GDRIVE_SUMMARY_SKIPPED || '{0} skipped.').replace('{0}', skipped.length)
          : '');
    const summaryRow = Skeletons.Box.X({
      className: `${pfx}__summary`,
      kids: [
        Skeletons.Note({ content: summaryBase }),
        summaryErr ? Skeletons.Note({
          className: `${pfx}__summary-errors`,
          // Only real failures read as an error; skipped items stay neutral.
          dataset: { kind: failures.length ? 'error' : 'skipped' },
          content: summaryErr,
        }) : null,
      ],
    });
    /**
     * Human reason for one reported item. NOT_GRANTED is the drive.file grant
     * gap (children of a picked folder the Picker never "saw") — show the
     * re-pick hint rather than the raw axios "Not Found", which reads as if
     * the file had been deleted.
     */
    const reasonOf = (e) => {
      if (e.code === 'NOT_GRANTED') return LOCALE.GDRIVE_NOT_GRANTED;
      if (e.code === 'SHORTCUT_SKIPPED') {
        return LOCALE.GDRIVE_SHORTCUT_SKIPPED || 'Google Drive shortcut — not copied';
      }
      return e.reason || e.code || LOCALE.ERROR || 'error';
    };

    // Detail list, grouped by reason. Previously this printed the first five
    // raw lines and stopped — with 30 shortcuts the user saw five names, no
    // reason they could act on, and no hint that 25 more existed. Grouping
    // states the cause once and names the items under it, failures first so
    // anything actionable is at the top.
    const GROUP_LIMIT = 8;
    const groups = [];
    [...failures, ...skipped].forEach((e) => {
      const reason = reasonOf(e);
      const g = groups.find((x) => x.reason === reason);
      const name = e.file || e.folder || '?';
      if (g) g.items.push(name);
      else groups.push({ reason, items: [name], isFailure: !SKIP_CODES.includes(e.code) });
    });

    const errorList = groups.length ? Skeletons.Box.Y({
      className: `${pfx}__error-list`,
      kids: groups.map((g) => Skeletons.Box.Y({
        className: `${pfx}__error-group`,
        dataset: { kind: g.isFailure ? 'error' : 'skipped' },
        kids: [
          Skeletons.Note({
            className: `${pfx}__error-reason`,
            content: `${g.reason} (${g.items.length})`,
          }),
          Skeletons.Note({
            className: `${pfx}__error-item`,
            content: g.items.slice(0, GROUP_LIMIT).join(', ')
              + (g.items.length > GROUP_LIMIT
                  ? ' ' + (LOCALE.MIGRATE_GDRIVE_MORE_ITEMS || '+{0} more')
                      .replace('{0}', g.items.length - GROUP_LIMIT)
                  : ''),
          }),
        ],
      })),
    }) : null;

    if (isDone) {
      // Figma 1645:85383 — headerless: check tile, title, hint, destination
      // card, one full-width "Open in Drumee →".
      body = Skeletons.Box.Y({
        className: `${pfx}__body ${pfx}__body--result ${pfx}__body--done`,
        kids: [
          hero('apps-check-circle', `${pfx}__hero--success`,
            LOCALE.MIGRATION_DONE_TITLE || 'Migration complete!',
            LOCALE.MIGRATE_GDRIVE_DONE_HINT),
          Skeletons.Box.Y({
            className: `${pfx}__dest-block`,
            kids: [
              Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.DESTINATION || 'Destination' }),
              Skeletons.Box.X({
                className: `${pfx}__dest-card`,
                kids: [
                  Skeletons.Image.Svg({ ico: 'desktop_folder', className: `${pfx}__dest-ico` }),
                  Skeletons.Box.Y({
                    className: `${pfx}__dest-text`,
                    kids: [
                      Skeletons.Note({ className: `${pfx}__destination`, content: ui._destinationName }),
                      Skeletons.Note({ className: `${pfx}__dest-sub`, content: summaryBase }),
                      // A successful run can still have skipped or failed
                      // items. The done screen used to show only the imported
                      // count, so the reasons below appeared with nothing
                      // stating how many there were.
                      summaryErr ? Skeletons.Note({
                        className: `${pfx}__dest-sub ${pfx}__summary-errors`,
                        dataset: { kind: failures.length ? 'error' : 'skipped' },
                        content: summaryErr,
                      }) : null,
                    ].filter(Boolean),
                  }),
                ],
              }),
            ],
          }),
          errorList,
          Skeletons.Box.X({
            className: `${pfx}__footer`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__primary-btn ${pfx}__primary-btn--full`,
                content: (LOCALE.MIGRATE_GDRIVE_OPEN || 'Open in Drumee') + ' →',
                service: 'gdrive-open-dest', uiHandler: [ui],
              }),
            ],
          }),
          // Secondary path: run another (incremental) migration without
          // leaving the popup — existing files are skipped by the worker.
          Skeletons.Note({
            className: `${pfx}__skip`,
            content: LOCALE.MIGRATE_GDRIVE_AGAIN || 'Migrate again',
            service: 'gdrive-restart', uiHandler: [ui],
          }),
        ].filter(Boolean),
      });
    } else {
      // cancelled (Figma 1645:86388 / 86966) + failed (same family, undesigned):
      // red tile, title, summary with red errors fragment, one full-width CTA.
      const heroTitle = isFailed
        ? (LOCALE.MIGRATION_FAILED_TITLE || 'Migration failed')
        : (LOCALE.MIGRATION_CANCELLED_TITLE || 'Migration cancelled');
      body = Skeletons.Box.Y({
        className: `${pfx}__body ${pfx}__body--result ${pfx}__body--${state}`,
        kids: [
          // No circled-x sprite exists — the hero tile supplies the rounded
          // red square (Figma look) and 'cross' sits inside it.
          hero(isFailed ? 'apps-warning' : 'cross', `${pfx}__hero--error`, heroTitle, null),
          summaryRow,
          (isFailed && snap.failed_reason) ? Skeletons.Note({
            className: `${pfx}__summary ${pfx}__fail-reason`,
            dataset: { kind: 'error' },
            content: needsReconnect
              ? (LOCALE.MIGRATE_GDRIVE_NEEDS_RECONNECT || 'Your Google Drive access expired. Connect again to continue.')
              : accessRevoked
                ? (LOCALE.MIGRATE_GDRIVE_ACCESS_REVOKED || 'Google Drive access to the selected folder was removed during the migration, so it was stopped. Restore sharing and try again.')
                : String(snap.failed_reason),
          }) : null,
          errorList,
          Skeletons.Box.X({
            className: `${pfx}__footer`,
            kids: isFailed
              ? [
                  Skeletons.Note({
                    className: `${pfx}__primary-btn ${pfx}__primary-btn--full`,
                    content: needsReconnect
                      ? (LOCALE.MIGRATE_GDRIVE_CONNECT_BTN || 'Connect Google Drive')
                      : (LOCALE.MIGRATE_GDRIVE_RETRY || 'Try again'),
                    service: needsReconnect ? 'gdrive-reconnect' : 'gdrive-restart',
                    uiHandler: [ui],
                  }),
                ]
              : [
                  Skeletons.Note({
                    className: `${pfx}__primary-btn ${pfx}__primary-btn--full`,
                    content: LOCALE.MIGRATE_GDRIVE_AGAIN || 'Migrate again',
                    service: 'gdrive-restart', uiHandler: [ui],
                  }),
                ],
          }),
        ].filter(Boolean),
      });
    }
  }

  // Header per Figma: standard Google-logo header for most screens; the
  // Choose-folders step has a plain title; in-progress swaps the logo for a
  // cloud icon + "Migrating files…"; the done screen has no header at all
  // (just a floating close so the popup is never a trap).
  let head;
  if (state === 'choose') {
    head = Skeletons.Box.X({
      className: `${pfx}__header`,
      kids: [
        Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.MIGRATE_GDRIVE_CHOOSE_TITLE || 'Choose folders to migrate' }),
        close,
      ],
    });
  } else if (state === 'sa') {
    // "Import from Google Drive", not "Import a folder or file": name the
    // source, which is what the user is orienting by. Uses the shared
    // header() so this screen carries the Drive logo like the others — it
    // was the one titled header built by hand, and so the one without it.
    head = header(LOCALE.GDRIVE_SA_HEADER_TITLE);
  } else if (state === 'in-progress') {
    head = Skeletons.Box.X({
      className: `${pfx}__header`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__title-wrap`,
          kids: [
            Skeletons.Image.Svg({ ico: 'app-upload', className: `${pfx}__title-ico ${pfx}__title-ico--cloud` }),
            Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.MIGRATE_GDRIVE_MIGRATING || 'Migrating files…' }),
          ],
        }),
        close,
      ],
    });
  } else if (state === 'done') {
    head = Skeletons.Box.X({ className: `${pfx}__header ${pfx}__header--bare`, kids: [close] });
  } else {
    head = header(LOCALE.MIGRATE_GDRIVE_TITLE);
  }

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [head, body],
  });
};
