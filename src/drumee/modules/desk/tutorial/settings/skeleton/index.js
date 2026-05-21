const ACTIONS = [
  { label: LOCALE.DOWNLOAD || 'Download', ico: 'desktop_download' },
  { label: LOCALE.RENAME || 'Rename', ico: 'apps-pencil-simple' },
  { label: LOCALE.ORGANIZE || 'Organize', ico: 'file-organize' },
  { label: LOCALE.DUPLICATE || 'Duplicate', ico: 'apps-copy' },
  { label: LOCALE.DELETE || 'Delete', ico: 'drumee-trash', danger: true },
];

const ACCESS_ITEMS = [
  { label: LOCALE.CAN_VIEW_FILES || 'Can View Files', ico: 'apps-eye', checked: true },
  { label: LOCALE.CAN_EDIT_UPLOAD || 'Can Edit & Upload', ico: 'apps-pencil-simple', checked: false },
  { label: LOCALE.CAN_CHAT || 'Can Chat', ico: 'apps-chat', checked: true },
];

// ── Action rows ───────────────────────────────────────────────────────────────
function actionItem(pfx, { label, ico, danger }) {
  return Skeletons.Box.X({
    className: `${pfx}__action-item${danger ? ' danger' : ''}`,
    kids: [
      Skeletons.Note({ className: `${pfx}__action-label`, content: label }),
      Skeletons.Image.Svg({ ico, className: `${pfx}__action-icon` }),
    ],
  });
}

// ── Public link section ───────────────────────────────────────────────────────
function publicLinkSection(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.PUBLIC_LINK || 'Public Link' }),
      Skeletons.Box.X({
        className: `${pfx}__link-row`,
        kids: [
          Skeletons.Note({ className: `${pfx}__link-url`, content: 'drumee.com/s/pink-folder-2023-x92...' }),
          Skeletons.Button.Svg({ ico: 'copylink', className: `${pfx}__link-copy` }),
        ],
      }),
    ],
  });
}

// ── Link expiration section ───────────────────────────────────────────────────
function linkExpirationSection(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__expiry-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.LINK_EXPIRATION || 'Link Expiration' }),
          Skeletons.Box.X({
            className: `${pfx}__toggle on`,
            kids: [Skeletons.Box.Y({ className: `${pfx}__toggle-thumb` })],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__date-row`,
        kids: [
          Skeletons.Button.Label({ ico: 'calendar', className: `${pfx}__date-btn`, label: LOCALE.SELECT_DATE || 'Select Date' }),
          Skeletons.Button.Label({ ico: '', className: `${pfx}__clear-btn`, label: LOCALE.CLEAR || 'Clear' }),
        ],
      }),
    ],
  });
}

// ── Access level section ──────────────────────────────────────────────────────
function accessItem(pfx, { label, ico, checked }) {
  return Skeletons.Box.X({
    className: `${pfx}__access-item`,
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx}__access-ico` }),
      Skeletons.Note({ className: `${pfx}__access-label`, content: label }),
      checked
        ? Skeletons.Image.Svg({ ico: 'checked-circle', className: `${pfx}__access-check checked` })
        : Skeletons.Box.Y({ className: `${pfx}__access-check unchecked` }),
    ],
  });
}

function accessSection(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Note({ className: `${pfx}__section-label`, content: LOCALE.ACCESS_LEVEL || 'Access level' }),
      ...ACCESS_ITEMS.map((item) => accessItem(pfx, item)),
    ],
  });
}

// ── Root ─────────────────────────────────────────────────────────────────────
module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    kids: [
      // Header
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__header-title`, content: LOCALE.FOLDER_SETTING || 'Folder Setting' }),
          Skeletons.Button.Svg({ ico: 'cross', className: `${pfx}__header-close` }),
        ],
      }),
      // Scrollable body
      Skeletons.Box.Y({
        className: `${pfx}__body`,
        kids: [
          // Action list
          Skeletons.Box.Y({
            className: `${pfx}__actions`,
            kids: ACTIONS.map((a) => actionItem(pfx, a)),
          }),

          publicLinkSection(pfx),
          linkExpirationSection(pfx),
          accessSection(ui, pfx),
        ],
      }),

      // Footer
      Skeletons.Box.Y({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__apply-btn`,
            content: LOCALE.APPLY_CHANGES || 'Apply Changes',
            service: 'next-step',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
