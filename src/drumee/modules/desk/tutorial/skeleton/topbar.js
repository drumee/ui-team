/**
 * Tutorial topbar (visual only; no services).
 * Layout: breadcrumb | [add-new + menu | upload | search | invite]
 */

const addMenuItem = (p, ico, label, opts = {}) =>
  Skeletons.Button.Label({
    ico,
    label,
    className: `${p}-add-menu-item ${opts.iconClass || ''}`,
    dataset: { highlight: opts.highlight ? 1 : 0 },
  });

module.exports = function (ui) {
  const fig = ui.fig.family;
  const p = `${fig}__tb`;

  return Skeletons.Box.X({
    className: `${p}-topbar`,
    kids: [
      // Breadcrumb (left)
      Skeletons.Box.X({
        className: `${p}-breadcrumb`,
        kids: [
          Skeletons.Note({ className: `${p}-breadcrumb-root`, content: LOCALE.HOME }),
        ],
      }),

      // Actions cluster (right)
      Skeletons.Box.X({
        className: `${p}-actions-cluster`,
        kids: [
          // "Add new" + dropdown menu
          Skeletons.Box.Y({
            className: `${p}-add-wrapper`,
            kids: [
              Skeletons.Button.Label({
                ico: 'topbar-add',
                className: `${p}-new-workspace-btn`,
                label: LOCALE.ADD_NEW || 'Add new',
              }),
              Skeletons.Box.Y({
                className: `${p}-add-menu`,
                dataset: { state: 0 },
                kids: [
                  addMenuItem(p, 'addmenu-folder', LOCALE.WORKSPACE || 'Workspace', { highlight: 1, iconClass: 'ico-workspace' }),
                  addMenuItem(p, 'addmenu-note', LOCALE.NOTE || 'Note', { iconClass: 'ico-note' }),
                  addMenuItem(p, 'addmenu-document', LOCALE.DOCUMENT || 'Document', { iconClass: 'ico-document' }),
                  addMenuItem(p, 'addmenu-spreadsheet', LOCALE.SPREADSHEET || 'Spreadsheet', { iconClass: 'ico-spreadsheet' }),
                  addMenuItem(p, 'addmenu-presentation', LOCALE.PRESENTATION || 'Presentation', { iconClass: 'ico-presentation' }),
                ],
              }),
            ],
          }),

          // Upload
          Skeletons.Button.Label({
            ico: 'desktop_upload',
            className: `${p}-upload-btn`,
            label: LOCALE.UPLOAD,
          }),

          // Search bar
          Skeletons.Box.X({
            className: `${p}-search-bar`,
            kids: [
              Skeletons.Image.Svg({
                ico: 'magnifying-glass',
                className: `${p}-search-icon`,
              }),
              Skeletons.Entry({
                className: `${p}-search-input`,
                placeholder: LOCALE.SEARCH || 'Search...',
                type: _a.text,
                autocomplete: _a.off,
              }),
              Skeletons.Note({
                className: `${p}-search-kbd`,
                content: '⌘K',
              }),
            ],
          }),

          // Invite
          Skeletons.Button.Label({
            ico: 'topbar-invite',
            className: `${p}-invite-btn`,
            label: LOCALE.INVITE || 'Invite',
          }),
        ],
      }),
    ],
  });
};
