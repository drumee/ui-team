export default function (ui) {
  const mode = _a.closed;

  const searchFig = `${ui.fig.family}-search`;

  const searchIcon = Skeletons.Button.Svg({
    ico: "magnifying-glass",
    className: `${searchFig}__icon ${searchFig}__magnifying-glass magnifying-glass`,
    service: 'toggle-search-bar'
  });

  const searchBar = Skeletons.Entry({
    formItem: _a.search,
    className: `${searchFig}__bar searchbar-input`,
    sys_pn: 'search-bar-input',
    value: '',
    placeholder: LOCALE.SEARCH,
    mode: _a.interactive,
    interactive: 1,
    preselect: 1,
    autocomplete: _a.off,
    service: _e.search,
    autocomplete: _a.off,
    name:"search-member",
    ui: ui
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${searchFig}__wrapper ${ui.fig.group}__wrapper search-wrapper`,
    sys_pn: _a.search,
    dataset: {
      mode,
      status: _a.open
    },
    kids: [
      Skeletons.Box.X({
        className: `${searchFig}__toggle ${searchFig}__box search-min-icon`,
        kids: [
          searchIcon
        ]
      }),

      Skeletons.Box.X({
        className: `${searchFig}__box ${ui.fig.group}__box search-box`,
        kids: [
          searchIcon,
          searchBar
        ]
      }),

      Skeletons.Box.Y({
        className: `${searchFig}__result-wrapper search-result-wrapper`,
        sys_pn: 'search-result',
        state: 0
      })
    ]
  });
};

