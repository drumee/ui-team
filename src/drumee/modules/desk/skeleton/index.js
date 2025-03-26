const _desk_main = function(_ui_) {

  let profile_type = 'pro';
  if (Visitor.isHubUser()) {
    profile_type = _a.hub;
  }
  
  let shareBarClass = '';
  if (Visitor.get('mimic_type')) {
    shareBarClass = `share-${Visitor.get('mimic_type')}`;
  }
  const a = Skeletons.Box.Y({
    className : `desk desk--main ${shareBarClass} ${_ui_.fig.family}__main ${profile_type}`,
    debug     : __filename,
    dataset   : {
      share     : Visitor.get('mimic_type'),
    },

    kids: [
      Skeletons.Wrapper.Y({ 
        name      : "popup",
        className : `${_ui_.fig.family}__wrapper --modal`, 
        flow      :  _a.none,
        wrapper   : 1,
        uiHandler : _ui_
      }),

      Visitor.isMimicSession() ?
        require('./topbar/share-bar')(_ui_) : undefined,

      Skeletons.Box.Y({
        uiHandler   : _ui_, 
        className   : `${_ui_.fig.family}__logo-container`,
        service     : 'toggle-fullscreen',
        kids        : [
          Skeletons.Box.X({
            active    : 0,
            sys_pn    : "logo-block",
            className : `${_ui_.fig.family}__logo-item ${profile_type}`
          })
        ]}),

      Skeletons.Box.Y({
        sys_pn    : "top-bar",
        className : `${_ui_.fig.family}__topbar`,
        kids      : [require('./topbar')(_ui_)]}),

      Skeletons.Box.Y({
        sys_pn    : "user-container",
        className : `${_ui_.fig.family}__topbar-user-container`,
        kids      : [require('desk/skeleton/common/topbar/user')(_ui_)],
        uiHandler : _ui_,
        partHandler : [_ui_]
      }),
      
      Skeletons.Box.Y({
        sys_pn    : "notification-container",
        className : `${_ui_.fig.family}__topbar-notification-container`,
        kids      : [
          {
            kind:'notification_panel',
          }
        ],
        uiHandler : _ui_,
        partHandler : [_ui_]}),

      Skeletons.Wrapper.Y({
        name      : "module",
        uiHandler : _ui_,
        className : `u-jc-center absolute ${_ui_.fig.family}__wrapper --module am-wrapper desk-account`
      }),

      Skeletons.Wrapper.Y({
        name      : "chat",
        uiHandler : _ui_,
        className : "desk-chat"
      }),

      Skeletons.Box.X({
        sys_pn    : "desk-wrapper",
        className : "u-jc-center desk-wrapper wm",
        kids: [{
          kind       : 'window_manager',
          sys_pn     : "desk-content",
          className  : `${_ui_.fig.family}__main-content desk-content` //"mt-20"
        }]}),

      Skeletons.Box.Y({
        className  : "desk__tooltip",
        sys_pn     : "desk-tooltip",
        wrapper    : 1
      })
    ]});


  return a;
};
module.exports = _desk_main;
