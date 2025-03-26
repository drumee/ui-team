// ===========================================================
// __desk_common_avatar
// ===========================================================

const __desk_common_avatar = function(_ui_) {

  const pfx = `${_ui_.fig.family}`;
  const styleOpt = {
    width   : 22,
    height  : 22,
    padding : 6
  };

  const trigger = Skeletons.Button.Svg({
    className : `${pfx} btn`,
    ico: "backoffice_penfill",
    styleOpt
  })

  const items = Skeletons.Box.Y({
    className   : `${pfx}__menu-dropdown`,
    populate    : [{
      kind      : KIND.note,
      className : `${pfx}__menu-item`,
      uiHandler : _ui_,
      _prepend  : 1
    },{
        content   : LOCALE.UPLOAD,
        service   : _e.change
    },{
        content   : LOCALE.CHOOSE_FROM_DRIVE, //"Select from drive"
        service   : "select-from-drive"
    },{
        content   : LOCALE.DELETE, //"Delete"
        service   : "delete-avatar"
    }]});

  const menu = {
    kind        : KIND.menu.topic,
    className   : `${pfx} change`,
    flow        : _a.vertical,
    trigger,
    items,
    opening     : _e.click, //temp
    signal      : _e.ui.events,
    service     : "update-avatar",
    uiHandler     : _ui_
  };

  const avatar = {
    kind     : KIND.avatar, //_t.profile
    sys_pn   : "ref-avatar",
    className: `${pfx}__ui`
  };

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug : __filename,
    kids : [ menu, avatar ]});
  return a; 
};

module.exports = __desk_common_avatar;
