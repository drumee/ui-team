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

module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      // Breadcrumb (left)
      {
        kind: "desk_breadcrumb",
        sys_pn: "breadcrumb",
        className: `${pfx}__breadcrumb`,
        uiHandler: [ui],
      },

      // Actions cluster (right)
      Skeletons.Box.X({
        className: `${pfx}__actions-cluster`,
        kids: [
          // "Add new" button + dropdown wrapper
          // Skeletons.Menu({
          //   lassName: `${pfx}__add-wrapper`,
          //   trigger: Skeletons.Button.Label({
          //     ico: "topbar-add",
          //     className: `${pfx}__new-workspace-btn`,
          //     label: LOCALE.ADD_NEW || "Add new",
          //     persistence: _a.once,
          //     direction: _a.down,
          //     offsetY: 20
          //     // service: "toggle-add-menu",
          //     // uiHandler: [ui],
          //   }),
          //   items: Skeletons.Box.Y({
          //     className: `${pfx}__add-menu`,
          //     sys_pn: "add-menu",
          //     partHandler: ui,
          //     // dataset: { state: 0 },
          //     // active: 0,
          //     kids: [
          //       addMenuItem(pfx, ui, "addmenu-folder", LOCALE.WORKSPACE || "Workspace", "new-workspace", { highlight: 1, iconClass: "ico-workspace" }),
          //       addMenuItem(pfx, ui, "addmenu-note", LOCALE.NOTE || "Note", "new-note", { iconClass: "ico-note" }),
          //       addMenuItem(pfx, ui, "addmenu-document", LOCALE.DOCUMENT || "Document", "new-document", { iconClass: "ico-document" }),
          //       addMenuItem(pfx, ui, "addmenu-spreadsheet", LOCALE.SPREADSHEET || "Spreadsheet", "new-spreadsheet", { iconClass: "ico-spreadsheet" }),
          //       addMenuItem(pfx, ui, "addmenu-presentation", LOCALE.PRESENTATION || "Presentation", "new-presentation", { iconClass: "ico-presentation" }),
          //     ],
          //   }),

          // }),
          Skeletons.Box.Y({
            className: `${pfx}__add-wrapper`,
            kids: [
              Skeletons.Button.Label({
                ico: "topbar-add",
                className: `${pfx}__new-workspace-btn`,
                label: LOCALE.ADD_NEW || "Add new",
                service: "toggle-add-menu",
                uiHandler: [ui],
              }),

              Skeletons.Box.Y({
                className: `${pfx}__add-menu`,
                sys_pn: "add-menu",
                partHandler: ui,
                dataset: { state: 0 },
                active: 0,
                kids: [
                  addMenuItem(pfx, ui, "addmenu-folder", LOCALE.WORKSPACE || "Workspace", "new-workspace", "", { highlight: 1, iconClass: "ico-workspace" }),
                  addMenuItem(pfx, ui, "addmenu-note", LOCALE.NOTE || "Note", "new-note", "", { iconClass: "ico-note" }),
                  addMenuItem(pfx, ui, "addmenu-document", LOCALE.DOCUMENT || "Document", "new-document", "document.docx", { iconClass: "ico-document" }),
                  addMenuItem(pfx, ui, "addmenu-spreadsheet", LOCALE.SPREADSHEET || "Spreadsheet", "new-spreadsheet", "spreadsheet.xlsx", { iconClass: "ico-spreadsheet" }),
                  addMenuItem(pfx, ui, "addmenu-presentation", LOCALE.PRESENTATION || "Presentation", "new-presentation", "presentation.pptx", { iconClass: "ico-presentation" }),
                ],
              }),
            ],
          }),

          Skeletons.Button.Label({
            ico: "desktop_upload",
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
                      service: "load-workspace",
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
        ],
      }),
    ],
  });
};
