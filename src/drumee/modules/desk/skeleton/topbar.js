/**
 * Topbar — left to right:
 * breadcrumb | [new | search | invite]
 */

const addMenuItem = (pfx, ui, ico, label, service, name, opts = {}) =>
  Skeletons.Button.Label({
    ico,
    label,
    name,
    className: `${pfx}__add-menu-item ${opts.iconClass || ""}`,
    dataset: { highlight: opts.highlight ? 1 : 0 },
    service,
    uiHandler: [ui],
  });

const addItems = (pfx, ui) => [
  addMenuItem(pfx, ui, "addmenu-folder", LOCALE.WORKSPACE || "Workspace", "new-workspace", "", { highlight: 1, iconClass: "ico-workspace" }),
  addMenuItem(pfx, ui, "addmenu-note", LOCALE.NOTE || "Note", "new-note", "", { iconClass: "ico-note" }),
  addMenuItem(pfx, ui, "addmenu-document", LOCALE.DOCUMENT || "Document", "new-document", "document.docx", { iconClass: "ico-document" }),
  addMenuItem(pfx, ui, "addmenu-spreadsheet", LOCALE.SPREADSHEET || "Spreadsheet", "new-spreadsheet", "spreadsheet.xlsx", { iconClass: "ico-spreadsheet" }),
  addMenuItem(pfx, ui, "addmenu-presentation", LOCALE.PRESENTATION || "Presentation", "new-presentation", "presentation.pptx", { iconClass: "ico-presentation" }),
];

const newMenuRow = (pfx, ui, {
  ico,
  label,
  service,
  name,
  className = "",
  highlight = 0,
}) => Skeletons.Box.X({
  className: `${pfx}__new-menu-item ${className}`,
  uiHandler: [ui],
  service,
  name,
  dataset: { highlight },
  kidsOpt: { active: 0 },
  kids: [
    Skeletons.Button.Svg({
      ico,
      active: 0,
      className: `${pfx}__new-menu-icon`,
    }),
    Skeletons.Note({
      content: label,
      active: 0,
      className: `${pfx}__new-menu-name`,
    }),
  ],
});

const deskNewMenu = (pfx, ui) => {
  const createItems = [
    newMenuRow(pfx, ui, {
      ico: "addmenu-folder",
      label: LOCALE.WORKSPACE || "Workspace",
      service: "new-workspace",
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ico-workspace`,
    }),
    newMenuRow(pfx, ui, {
      ico: "addmenu-note",
      label: LOCALE.NOTE || "Note",
      service: "new-note",
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ico-note`,
    }),
    newMenuRow(pfx, ui, {
      ico: "addmenu-document",
      label: LOCALE.DOCUMENT || "Document",
      service: "new-document",
      name: "document.docx",
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ico-document`,
    }),
    newMenuRow(pfx, ui, {
      ico: "addmenu-spreadsheet",
      label: LOCALE.SPREADSHEET || "Spreadsheet",
      service: "new-spreadsheet",
      name: "spreadsheet.xlsx",
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ico-spreadsheet`,
    }),
    newMenuRow(pfx, ui, {
      ico: "addmenu-presentation",
      label: LOCALE.PRESENTATION || "Presentation",
      service: "new-presentation",
      name: "presentation.pptx",
      className: `${pfx}__add-menu-item ${pfx}__new-menu-submenu-item ico-presentation`,
    }),
  ];

  const createGroup = Skeletons.Box.X({
    className: `${pfx}__new-menu-item ${pfx}__new-menu-create-group`,
    sys_pn: "desk-new-create-group",
    partHandler: ui,
    uiHandler: [ui],
    service: "toggle-desk-new-create-menu",
    dataset: { submenu: _a.closed },
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        content: "+",
        active: 0,
        className: `${pfx}__new-menu-create-symbol`,
      }),
      Skeletons.Note({
        content: LOCALE.ADD_NEW || "Add new",
        active: 0,
        className: `${pfx}__new-menu-name`,
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${pfx}__new-menu-create-submenu`,
        kids: createItems,
      }),
    ],
  });

  return Skeletons.Menu({
    className: `${pfx}__add-wrapper`,
    direction: _a.down,
    duration: 0.01,
    opening: _e.click,
    persistence: _a.always,
    sys_pn: "addmenu",
    partHandler: [ui],
    callback: () => {
      const group = ui.getPart && ui.getPart("desk-new-create-group");
      if (group && group.el) group.el.dataset.submenu = _a.closed;
    },
    trigger: Skeletons.Button.Label({
      ico: "topbar-add",
      className: `${pfx}__new-workspace-btn`,
      label: LOCALE.NEW || "New",
    }),
    items: Skeletons.Box.Y({
      className: `${pfx}__new-menu-items`,
      kids: [
        newMenuRow(pfx, ui, {
          ico: "app-upload",
          label: LOCALE.FROM_DEVICE || "From device",
          service: _e.upload,
          className: `${pfx}__new-menu-item--from-device`,
        }),
        newMenuRow(pfx, ui, {
          ico: "logo-google",
          label: LOCALE.MIGRATE_GDRIVE_TITLE || "Migrate from Google Drive",
          service: "launch-gdrive-migration",
          className: `${pfx}__new-menu-item--gdrive`,
        }),
        createGroup,
      ],
    }),
  });
};

module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      // Left cluster — home breadcrumb + folder tabs glued together so
      // the topbar's space-between layout doesn't push them apart.
      Skeletons.Box.X({
        className: `${pfx}__left-cluster`,
        kids: [
          {
            kind: "desk_breadcrumb",
            sys_pn: "breadcrumb",
            className: `${pfx}__breadcrumb`,
            uiHandler: [ui],
          },
          Skeletons.Box.X({
            className: `${pfx}__folder-tabs`,
            sys_pn: "folder-tabs",
            partHandler: ui,
          }),
        ],
      }),

      // Actions cluster (right)
      Skeletons.Box.X({
        className: `${pfx}__actions-cluster`,
        sys_pn :"action-cluster",
        kids: [
          deskNewMenu(pfx, ui),

          // Search bar + suggestions
          Skeletons.Box.Y({
            className: `${pfx}__search-container`,
            sys_pn: "search-container",
            partHandler: ui,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__search-bar`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "magnifying-glass",
                    className: `${pfx}__search-icon`,
                  }),
                  Skeletons.Entry({
                    className: `${pfx}__search-input`,
                    sys_pn: "search-box",
                    uiHandler: [ui],
                    partHandler: ui,
                    placeholder: LOCALE.SEARCH || "Search...",
                    service: "search-files",
                    type: _a.text,
                    autocomplete: _a.off,
                    interactive: 1,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__search-kbd`,
                    content: "⌘K",
                  }),
                ],
              }),

              // Suggestions dropdown — shown on search bar focus
              Skeletons.Box.Y({
                className: `${pfx}__search-suggestions`,
                sys_pn: "search-suggestions",
                partHandler: ui,
                state: 0,
                kids: [
                  Skeletons.List.Smart({
                    className: `${pfx}__suggestions-list`,
                    sys_pn: "suggestions-list",
                    partHandler: ui,
                    flow: _a.none,
                    spinner: true,
                    spinnerWait: 300,
                    vendorOpt: Preset.List.Orange_e,
                    itemsOpt: {
                      kind: "workspace_item",
                      uiHandler: [ui],
                      // Clicking a search hit reveals it in context: files open
                      // their host folder with the file highlighted, folders open
                      // themselves, messages open the hosting chat. Handled by
                      // desk/index.js onUiEvent → "open-search-hit".
                      service: "open-search-hit",
                    },
                  }),
                ],
              }),
            ],
          }),

          // Invite button
          Skeletons.Button.Label({
            ico: "topbar-invite",
            className: `${pfx}__invite-btn`,
            label: LOCALE.INVITE || "Invite",
            service: "invite-member",
            uiHandler: [ui],
          }),

          // Tablet-only consolidated menu (768px ≤ width < 1024px).
          // Flattened: nesting Skeletons.Menu inside another Menu's `items`
          // breaks menu_topic's outside-click handling, so the six Add
          // entries are spliced in at the top instead of behind a sub-menu.
          Skeletons.Menu({
            className: `${pfx}__more-wrapper`,
            direction: _a.down,
            opening: _e.click,
            persistence: _a.once,
            sys_pn: "moremenu",
            partHandler: [ui],
            trigger: Skeletons.Button.Label({
              ico: "bars",
              className: `${pfx}__more-btn`,
            }),
            items: [
              ...addItems(pfx, ui),
              Skeletons.Button.Label({
                ico: "app-upload",
                className: `${pfx}__more-menu-item`,
                label: LOCALE.UPLOAD,
                service: _e.upload,
                uiHandler: [ui],
              }),
              Skeletons.Button.Label({
                ico: "topbar-invite",
                className: `${pfx}__more-menu-item`,
                label: LOCALE.INVITE || "Invite",
                service: "invite-member",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
