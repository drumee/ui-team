const __desk_dock = function (ui) {
  const fig = ui.fig.family;

  const navButton = Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__container nav-container ${fig}--divider-right`,
    kids: [
      Skeletons.Button.Svg({
        ico: "dock-nav",
        className: `${fig}__button nav`,
        uiHandler: [ui],
        innerClass: "bigchat",
        sys_pn: "chat-p2p-launcher",
        service: "toggle-chat",
        tooltips: {
          className: `${fig}__tooltips ${ui.fig.name}-tooltips`,
          content: LOCALE.CHAT,
        },
      }),
    ],
  });
  ``;

  const search_btn = Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__container trash-container ${fig}--divider-left`,
    service: "open-searchbox",
    uiHandler: [ui],
    kidsOpt: {
      active: 0,
    },
    state: 0,
    kids: [
      Skeletons.Button.Svg({
        ico: "magnifying-glass",
        className: `${fig}__button trash`,
        service: "open-searchbox",
        uiHandler: [ui],
        tooltips: {
          className: `${fig}__tooltips ${ui.fig.name}-tooltips`,
          content: LOCALE.SEARCH,
        },
      }),
    ],
  });

  const searchbox = Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__container searchbox ${fig}--divider-left`,
    sys_pn: "searchbox",
    state: 0,
    kids: [
      Skeletons.Entry({
        className: `${fig}__searchbox-input`,
        uiHandler: [ui],
        placeholder: "Enter filename",
        service: "search-files",
        type: _a.text,
        sys_pn: "searchbox-input",
        autocomplete: _a.off,
        preselect: 1,
        interactive: 1,
      }),
    ],
  });
  const trash = Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__container trash-container ${fig}--divider-left`,
    kids: [
      Skeletons.Button.Svg({
        ico: "dock-trash",
        className: `${fig}__button trash`,
        service: _e.trash,
        sys_pn: "trash-bin",
        uiHandler: [ui],
        tooltips: {
          className: `${fig}__tooltips ${ui.fig.name}-tooltips`,
          content: LOCALE.BASKET,
        },
      }),
    ],
  });
  const a = Skeletons.Box.X({
    className: `${fig}__main`,
    sys_pn: "dock-container",
    debug: __filename,
    kids: [
      navButton,
      // require('./minifier').default(ui),
      // require("./mobile")(ui), // dead code — kept out of the tree
      require("./maker")(ui),
      searchbox,
      search_btn,
      // require('./doc-menu')(ui),

      require("./launcher")(ui),

      trash,
    ],
  });

  return a;
};
module.exports = __desk_dock;
