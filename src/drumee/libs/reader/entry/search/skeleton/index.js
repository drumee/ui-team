const __skl_search_box = function (_ui_) {
  let entry = {
    kind: KIND.entry_reminder,
    className: `${_ui_.fig.family}__widget`,
    active: 1,
    sys_pn: "ref-entry",
    uiHandler: [_ui_],
    inputClass: "entry-area",
    placeholder: _ui_.mget(_a.placeholder) || LOCALE.SEARCH,
    hidden: _ui_.mget(_a.hidden),
    mode: _ui_.mget(_a.mode),
    name: _ui_.mget(_a.name) || _a.string,
    preselect: _ui_.mget(_a.preselect),
    value: _K.char.empty,
    api: _ui_.mget(_a.api),
    showError: _ui_.mget('showError') || true,
    formcomplete: _ui_.mget('formcomplete') || _a.off,
    autocomplete: _ui_.mget('autocomplete') || _a.off
  };

  if (_ui_.mget(_a.vendorOpt) != null) {
    entry = _.merge(entry, _ui_.mget(_a.vendorOpt));
  }

  const a = [
    Skeletons.Box.X({
      sys_pn: "ref-input",
      className: `${_ui_.fig.family}__container--input ${_ui_.fig.family}__main`,
      active: 1,
      uiHandler: _ui_,
      kids: [entry]
    }),
    Skeletons.Wrapper.Y({
      name: "results",
      part: _ui_,
      className: `${_ui_.fig.family}__wrapper`,
      kidsOpt: {
        className: _ui_.mget(_a.itemsClass)
      }
    })
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __skl_search_box;
