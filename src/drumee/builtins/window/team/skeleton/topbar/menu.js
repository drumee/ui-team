// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/team/skeleton/topbar/menu.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __window_topbar_menu = function(_ui_) {
  const pfx = `${_ui_.fig.family}-topbar`;

  const count = ~~_ui_.mget('new_chat');
  const items = [
      Visitor.canShow('video-call') ?
        Skeletons.Button.Svg({
          ico        : "chat_connect",
          className  : `${pfx}__icon meeting`,
          service    : 'meeting'
        }) : undefined,
        
      Skeletons.Button.Svg({
        ico        : "tchat",
        sys_pn     : "chat-counter",
        className  : `${pfx}__icon`,
        service    : "channel",
        type       : "window_channel"
      }),
      
      Skeletons.Note({ 
        className  : `${pfx}__count`,
        content    : count,
        sys_pn     : "new-message",
        dataset    : { 
          count
        }
      })

      //# postponed and planned to moved to external room later
      // Skeletons.Button.Svg
      //   ico        : "presentation"
      //   className  : "#{pfx}__icon"
      //   service    : 'webinar'
  ];

  const a = Skeletons.Box.X({
    className : `${pfx}__menu`,
    debug     : __filename,
    kids      : items
  });

  return a; 
};

module.exports = __window_topbar_menu;
