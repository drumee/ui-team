const __account_wallpaper = function(_ui_, api) {

  const a = Skeletons.List.Smart({
    className : `${_ui_.fig.family}__wallpapers-list`,
    debug     : __filename,
    spinner   : Skeletons.Note('', _a.spinner),
    minPage   : 3,
    sys_pn    : 'roll-wallpaper',
    api       : api || _ui_._api,
    vendorOpt : Preset.List.Orange_e,
    itemsOpt  : {
      kind       : KIND.media.preview,
      className  : `${_ui_.fig.family}__wallpapers-items`,
      service    : 'set-wallpaper',
      uiHandler  : [_ui_],
      format     : _a.card
    }
  });

  return a;
};

module.exports = __account_wallpaper;
