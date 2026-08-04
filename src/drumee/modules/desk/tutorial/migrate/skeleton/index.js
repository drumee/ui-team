/**
 * Step 6 bodies — Google Drive migration.
 *
 * Figma 3314:86172 (the + New menu), 3314:86343 (the import dialog) and
 * 3314:86542 (its Verify & import button). Those frames are real vector, so the
 * metrics are the design's own: a 195x96 menu of 24px rows at (1396,40), and a
 * centred import dialog.
 *
 * The desk behind these comes from the step's faded workspace backdrop
 * (tutorial/index.js `_widgets`), so this widget renders only what the step is
 * about: the menu, then the dialog.
 *
 * Visual only — no services. Spotlight targets: `menu`, `address`, `verify`.
 */

// ── "+ New" menu ──────────────────────────────────────────────────────────────
const ITEMS = [
  { ico: 'desktop_upload', label: () => LOCALE.FROM_DEVICE || 'From device' },
  {
    ico: 'logo-google',
    label: () => LOCALE.MIGRATE_FROM_GOOGLE_DRIVE || 'Migrate from Google Drive',
    on: true,
  },
  { ico: 'topbar-add', label: () => LOCALE.ADD_NEW || 'Add new' },
];

function menu(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__menu`,
    // Screen 1's spotlight target — the design's connector rises to it.
    sys_pn: 'menu',
    partHandler: ui,
    kids: ITEMS.map((it) =>
      Skeletons.Box.X({
        className: `${pfx}__menu-item${it.on ? ' on' : ''}`,
        kids: [
          Skeletons.Image.Svg({ ico: it.ico, className: `${pfx}__menu-icon` }),
          Skeletons.Note({ className: `${pfx}__menu-label`, content: it.label() }),
        ],
      }),
    ),
  });
}

// ── "Import a folder or file" dialog ──────────────────────────────────────────
const SERVICE_ACCOUNT =
  'drumee-drive-import@growth-hacking-491411.iam.gserviceaccount.c…';

/**
 * @param {Object} ui
 * @param {String} pfx
 * @param {Boolean} [verifying] highlight the Verify & import button, as the
 *   third frame does
 */
function dialog(ui, pfx, verifying) {
  return Skeletons.Box.Y({
    className: `${pfx}__dialog`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__dialog-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__dialog-title`,
            content: LOCALE.IMPORT_FOLDER_OR_FILE || 'Import a folder or file',
          }),
          Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__dialog-close` }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__dialog-body`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__step`,
            content: LOCALE.MIGRATE_STEP_SHARE
              || '1. In Google Drive, share the folder or file with this address (Viewer access is enough):',
          }),
          // Screen 2's spotlight target: the address the user has to copy.
          Skeletons.Box.X({
            className: `${pfx}__address`,
            sys_pn: 'address',
            partHandler: ui,
            kids: [
              Skeletons.Note({
                className: `${pfx}__address-value`,
                content: SERVICE_ACCOUNT,
              }),
              Skeletons.Note({
                className: `${pfx}__address-copy`,
                content: LOCALE.COPY || 'Copy',
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__step`,
            content: LOCALE.MIGRATE_STEP_PASTE
              || "2. Paste the folder's or file's link (or ID) here:",
          }),
          Skeletons.Note({
            className: `${pfx}__input`,
            content: 'https://drive.google.con',
          }),
          // Screen 3's spotlight target: the button that starts the import.
          Skeletons.Box.X({
            className: `${pfx}__verify${verifying ? ' focused' : ''}`,
            sys_pn: 'verify',
            partHandler: ui,
            kids: [
              Skeletons.Note({
                className: `${pfx}__verify-label`,
                content: LOCALE.VERIFY_AND_IMPORT || 'Verify & import',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

const stage = (pfx, kid) =>
  Skeletons.Box.Y({ className: `${pfx}__stage`, kids: [kid] });

/** Screen 1 — the + New menu, with Migrate from Google Drive under the cursor. */
const menuScreen = (ui) => stage(ui.fig.family, menu(ui, ui.fig.family));

/** Screen 2 — the import dialog, waiting for the address to be copied. */
const dialogScreen = (ui) => stage(ui.fig.family, dialog(ui, ui.fig.family, false));

/** Screen 3 — the same dialog with Verify & import ready to go. */
const verifyScreen = (ui) => stage(ui.fig.family, dialog(ui, ui.fig.family, true));

module.exports = { menuScreen, dialogScreen, verifyScreen };
