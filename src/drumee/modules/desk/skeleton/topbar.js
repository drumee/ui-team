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
            ico: "plus",
            className: `${pfx}__new-workspace-btn`,
            label: LOCALE.ADD_NEW || "Add new",
            service: "new-workspace",
            uiHandler: [ui],
          }),

          // Search bar
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
                placeholder: LOCALE.SEARCH || "Search...",
                service: _e.search,
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

          // Invite button
          Skeletons.Button.Label({
            ico: "drumee-add-contact",
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
