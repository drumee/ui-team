/**
 * Topbar — left to right:
 * breadcrumb | [new-workspace | search | invite]
 */
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
      },

      // Actions cluster (right)
      Skeletons.Box.X({
        className: `${pfx}__actions-cluster`,
        kids: [
          // New workspace button
          Skeletons.Button.Label({
            ico: "topbar-add",
            className: `${pfx}__new-workspace-btn`,
            label: LOCALE.ADD_NEW || "Add new",
            service: "new-workspace",
            uiHandler: [ui],
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
                    flow: _a.none,
                    spinner: true,
                    spinnerWait: 300,
                    vendorOpt: Preset.List.Orange_e,
                    api: {
                      service: SERVICE.desk.home,
                      hub_id: Visitor.id,
                      type: _a.hub,
                    },
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
