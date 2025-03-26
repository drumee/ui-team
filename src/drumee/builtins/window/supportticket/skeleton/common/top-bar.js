// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/skeleton/common/top-bar.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_support_ticket_common_topBar = function(_ui_) {
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

      require('./search')(_ui_),

      Skeletons.Box.X({
        className : `${figFamily}__content ${figGroup}__content topbar-content`,
        kids      : [
          Skeletons.Note({
            sys_pn      : "ref-window-name",
            uiHandler   : _ui_, 
            partHandler : _ui_,
            className   : "title",
            content     : LOCALE.SUPPORT_TICKET
          })
          
          // Skeletons.Box.X
          //   className : "#{figFamily}__menu #{figGroup}__menu topbar-menu"
          //   kids      : [
          //     if not Visitor.isMimicActiveUser()
          //       require('./menu')(_ui_)
          //   ]
        ]}),

      require('window/skeleton/topbar/control')(_ui_, 'msc')
    ]});

  return a;
};

module.exports = __skl_support_ticket_common_topBar;
