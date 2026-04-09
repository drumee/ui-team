const { userMenu } = require("builtins/skeleton/toolkit/user");

/**
 * Topbar — left to right:
 * logo | breadcrumb | search box | invite button | bell | avatar
 */
module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;
  const icoClass = `${pfx}__icon`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    kids: [
      // Breadcrumb
      {
        kind: "desk_breadcrumb",
        sys_pn: "breadcrumb",
        className: `${pfx}__breadcrumb`,
      },

      // Search box
      Skeletons.Box.X({
        className: `${pfx}__search-container`,
        kids: [
          Skeletons.Button.Svg({
            ico: "magnifying-glass",
            className: `${pfx}__icon`,
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
          // Skeletons.Box.X({
          //   className: `${pfx}__search-note`,
          //   kids: [
          //     Skeletons.Button.Svg({
          //       ico: "magnifying-glass",
          //       className: `${pfx}__icon`,
          //     }),
          //     Skeletons.Note({
          //       className: `${pfx}__search-text`,
          //       content: "K",
          //     }),
          //   ],
          // }),
        ],
      }),

      // Invite members button
      Skeletons.Button.Label({
        ico: "drumee-add-contact",
        className: `${pfx}__invite-btn`,
        label: LOCALE.INVITE_MEMBER || "Invite member",
        service: "invite-member",
        uiHandler: [ui],
      }),
    ],
  });
};
