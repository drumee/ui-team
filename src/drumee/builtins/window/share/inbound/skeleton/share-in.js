// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// ===========================================================
const __sb_share_in = function(_ui_) {
  const invitation = { 
    kind        : 'invitation',
    mode        : 'share-in',
    service     : 'share-in',
    //closeButton : 1
    uiHandler   : _ui_,
    action_bar  : 1,
    authority   : _ui_.logicalParent.mget(_a.permission)
  };
  const a = Skeletons.Box.Y({ 
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`,
    sys_pn      : _a.content,
    kids : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__button`,
        kids : [
          Skeletons.Button.Svg({
            className : `${_ui_.fig.family}__button-close`,
            service   : _e.close, 
            ico       : "account_cross"
          })
          //Preset.Button.Close(_ui_, null, "#{_ui_.fig.family}__button-close")
        ]}),
      invitation
    ]});
  return a;
};
module.exports = __sb_share_in;
