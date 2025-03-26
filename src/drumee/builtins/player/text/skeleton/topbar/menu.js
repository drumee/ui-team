const __window_topbar_menu=function(_ui_){
  const pfx = `${_ui_.fig.family}-topbar`;
  const items = [
//      Skeletons.Button.Svg
//        ico        : "presentation"
//        className  : "#{pfx}__icon"
//        service    : 'webinar'

      // Skeletons.Button.Svg
      //   ico        : "drumee_teamroom_enter"#"video-camera" #"video-camera"
      //   className  : "#{pfx}__icon meeting"
      //   service    : 'meeting'
        
      // Skeletons.Button.Svg
      //   ico        : "tchat"
      //   sys_pn     : "chat-counter"
      //   className  : "#{pfx}__icon"
      //   service    : "channel"
      //   type       : "window_channel"
      
      // Skeletons.Note 
      //   className  : "#{pfx}__count"xf
      //   content    : _ui_.mget('new_chat')
      //   sys_pn     : "new-message"
      //   dataset    : 
      //     count    : _ui_.mget('new_chat')

      // Skeletons.Button.Svg
      //   ico        : "presentation"
      //   className  : "#{pfx}__icon"
      //   service    : 'webinar'
  ];
  const a = Skeletons.Box.X({
    className   : `${pfx}__menu`,
    kids : items
  });

  return a; 
};

module.exports = __window_topbar_menu;
