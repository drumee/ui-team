// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/skeleton/common/search.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_addressbook_common_search = function(_ui_) {

  const mode = _a.closed;

  const searchFig = `${_ui_.fig.family}-search`;

  const searchIcon = Skeletons.Button.Svg({
    ico       : "magnifying-glass",
    className : `${searchFig}__icon ${searchFig}__magnifying-glass magnifying-glass`,
    service   : 'toggle-search-bar'
  });

  const searchBar = Skeletons.Entry({
    formItem      : _a.search,
    className     : `${searchFig}__bar searchbar-input`,
    sys_pn        : 'search-bar-input',
    value         : '',
    placeholder   : LOCALE.SEARCH,
    mode          : _a.interactive,
    interactive   : 1,
    preselect     : 0,
    service       : _e.search,
    ui            : [_ui_]});

  const searchBox = Skeletons.Box.Y({
    debug     : __filename,
    className : `${searchFig}__wrapper ${_ui_.fig.group}__wrapper search-wrapper`,
    sys_pn    : _a.search,
    dataset   : {
      mode,
      state   : _a.open
    },
    kids      : [
      Skeletons.Box.X({
        className : `${searchFig}__toggle ${searchFig}__box search-min-icon`,
        kids:[
          searchIcon
        ]}),
      
      Skeletons.Box.X({
        className : `${searchFig}__box ${_ui_.fig.group}__box search-box`,
        kids:[
          searchIcon,
          searchBar
        ]}),
      
      Skeletons.Box.Y({
        className   : `${searchFig}__result-wrapper search-result-wrapper`,
        sys_pn      : 'search-result',
        state       : 0
      })
    ]});
  
  return searchBox;
};

module.exports = __skl_addressbook_common_search;
