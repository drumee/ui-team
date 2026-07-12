/**
 * Topbar — left to right:
 * breadcrumb | [add-new | upload | search | invite]
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
  addMenuItem(pfx, ui, "addmenu-folder", LOCALE.PRIVATE_FOLDER || "Private folder", "add-private-folder", "", { iconClass: "ico-private-folder" }),
  addMenuItem(pfx, ui, "addmenu-note", LOCALE.NOTE || "Note", "new-note", "", { iconClass: "ico-note" }),
  addMenuItem(pfx, ui, "addmenu-document", LOCALE.DOCUMENT || "Document", "new-document", "document.docx", { iconClass: "ico-document" }),
  addMenuItem(pfx, ui, "addmenu-spreadsheet", LOCALE.SPREADSHEET || "Spreadsheet", "new-spreadsheet", "spreadsheet.xlsx", { iconClass: "ico-spreadsheet" }),
  addMenuItem(pfx, ui, "addmenu-presentation", LOCALE.PRESENTATION || "Presentation", "new-presentation", "presentation.pptx", { iconClass: "ico-presentation" }),
];

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
          Skeletons.Menu({
            className: `${pfx}__add-wrapper`,
            direction: _a.down,
            opening: _e.click,
            persistence: _a.once,
            sys_pn: "addmenu",
            partHandler: [ui],
            trigger: Skeletons.Button.Label({
              ico: "topbar-add",
              className: `${pfx}__new-workspace-btn`,
              label: LOCALE.ADD_NEW || "Add new",
            }),
            items: addItems(pfx, ui),
          }),
          Skeletons.Button.Label({
            ico: "app-upload",
            className: `${pfx}__upload-btn`,
            label: LOCALE.UPLOAD,
            service: _e.upload,
            uiHandler: [ui],
          }),

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
