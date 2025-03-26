// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/skeleton/common/top-bar.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_addressbook_common_topBar = function(_ui_) {
  
  const mode = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup = `${_ui_.fig.group}-topbar`;
    
  const notifier = { 
    kind      : 'addressbook_widget_notification',
    service   : 'invite-notifications',
    uiHanlder : _ui_
  };
  
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
            require('./menu')(_ui_)
          ]}) : undefined,
      
      // breadcrumb
      require('./search')(_ui_),
      
      Skeletons.Box.X({
        className : `${figFamily}__content ${figGroup}__content topbar-content`,
        kids      : [

          Skeletons.FileSelector({
            partHandler : _ui_}),

          Skeletons.Box.X({
            className   : "notifier",
            kids        : [
              notifier
            ]}),
      
          Skeletons.Note({
            sys_pn      : "ref-window-name",
            uiHandler   : _ui_,
            partHandler : _ui_,
            className   : "title",
            content     : LOCALE.CONTACT_MANAGER
          }) //'Contact manager'
        ]}),
      
      require('window/skeleton/topbar/control')(_ui_, 'msc')
    ]});

  return a;
};

module.exports = __skl_addressbook_common_topBar;
