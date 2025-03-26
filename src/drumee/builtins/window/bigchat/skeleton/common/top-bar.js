// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/common/top-bar
//   TYPE : Skeleton
// ==================================================================== *

const __skl_bigchat_common_topBar = function(_ui_) {
  const mode = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup = `${_ui_.fig.group}-topbar`;
  
  const a = Skeletons.Box.X({
    className : `${figFamily}__container ${figGroup}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    dataset   : {
      view    : mode
    },
    debug     : __filename,
    kids      : [

      !Visitor.isMimicActiveUser() ?
        Skeletons.Box.X({
          className : `${figFamily}__menu ${figGroup}__menu topbar-menu`,
          kids      : [
            Skeletons.Button.Svg({
              ico       : 'drumee-contact_add',//'contact_add'
              className : `${figFamily}__icon ${figFamily}__trigger dropdown-toggle-icon contact_add`,
              service   : 'open-contact',
              type      : _a.invite,
              uiHandler : _ui_
            })
          ]}) : undefined,

      require('./search')(_ui_),

      Skeletons.Box.X({
        className : `${figFamily}__content ${figGroup}__content topbar-content`,
        kids      : [
          Skeletons.Note({
            sys_pn      : "ref-window-name",
            uiHandler   : _ui_, 
            partHandler : _ui_,
            className   : "title",
            content     : LOCALE.CHAT
          }) //'Chat'
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'msc')
    ]});

  return a;
};

module.exports = __skl_bigchat_common_topBar;
