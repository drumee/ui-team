// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/shareroom-userdetails/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_shareroomUserdetails = function(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          Skeletons.List.Smart({
            className   : `${_ui_.fig.family}__item list`,
            timer       : 50,
            itemsOpt    : { 
              kind      : 'widget_shareroom_user_item',
              uiHandler : [_ui_]
            },
            sys_pn      : 'shareroom-user-list',
            api         : _ui_.getAllShareRoomMembers
          })
        
        ]})
    ]});

  return a;
};
module.exports = __skl_widget_shareroomUserdetails;