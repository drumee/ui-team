// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : 
// ==================================================================== *
const CHANNEL = _.uniqueId();
const _row=function(_ui_, name, label){
  const perm  = ~~ _ui_.mget(_a.permission);
  _dbg('aaaaaaaaaa 9', perm, _K.permission[name], toggleState(perm&_K.permission[name]));
  const state = toggleState(perm&_K.permission[name]);
  const a = Skeletons.Button.Label({
    ico           : "account_check",
    uiHandler         : _ui_,
    radio         : CHANNEL,
    initialState  : state, //toggleState(perm&_K.permission.download) 
    label, //LOCALE.DOWNLOAD
    labelClass    : "text",
    reference     : _a.state,
    service       : _e.update,
    name,
    //className : "option__checkbox option__text my-5 zzz u-fd-row"
    className : `${_ui_.fig.family}__checkbox my-5 u-fd-row`
  });
  return a;
};


// ===========================================================
// __invitation_permission
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __invitation_permission = function(manager) {
  const a = [
    _row(manager, _a.view, LOCALE.VIEW),
    _row(manager, _a.download, LOCALE.DOWNLOAD),
    _row(manager, _a.modify, LOCALE.MODIFY)
    // Skeletons.Button.Label({
    //   ico           : "account_check"
    //   uiHandler         : manager
    //   radio         : channel
    //   initialState  : toggleState(perm&_K.permission.view)# viewInitial
    //   label         : LOCALE.VIEW
    //   name          : _a.view
    //   reference     : _a.state # use state instead of value
    //   service       : _e.update
    //   #className     : "option__checkbox option__text my-5 u-fd-row"
    //   className     : "#{manager.fig.family}__checkbox my-5 u-fd-row"
    // })
    // Skeletons.Button.Label({
    //   ico           : "account_check"
    //   uiHandler         : manager
    //   radio         : channel
    //   initialState  : toggleState(perm&_K.permission.download) #downloadInitial
    //   label         : LOCALE.DOWNLOAD
    //   labelClass    : "text"
    //   reference     : _a.state
    //   service       : _e.update
    //   name          : _a.download
    //   #className : "option__checkbox option__text my-5 zzz u-fd-row"
    //   className : "#{manager.fig.family}__checkbox my-5 u-fd-row"
    // })
    // Skeletons.Button.Label({
    //   ico           : "account_check"
    //   uiHandler         : manager
    //   radio         : channel
    //   initialState  : toggleState(perm&_K.permission.modify) #modifyInitial
    //   label         : LOCALE.MODIFY
    //   reference     : _a.state # use state instead of value
    //   service       : _e.update
    //   name          : _a.modify
    //   #className     : "option__checkbox option__text my-5 u-fd-row" #option__disabled-modify
    //   className     : "#{manager.fig.family}__checkbox my-5 u-fd-row" #option__disabled-modify
    // })
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __invitation_permission;
