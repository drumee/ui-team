// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /home/somanos/devel/ui/src/drumee/builtins/window/switchcall/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_window_switchcall = function(_ui_) {
  let name, text, title;
  const data = _ui_.peerData || {};
  const origin = data.origin || data; 
  const pfx = `${_ui_.fig.family}`;
  if(_ui_.mget(_a.type) === _e.connect) {
    name = origin.firstname || origin.lastname || origin.email;
    title = LOCALE.X_IS_CALLING_YOU.format(name);

    //text = LOCALE.INFO_MULTIPLE_INBOUND_CALL
  } else { 
    title = LOCALE.MEETING;
    if (data.details) {
      title = `${LOCALE.MEETING} ${data.details.filename}`;
    }
    text = LOCALE.FIRST_PARTICIPANTS_ARRIVED;
  }


  const message = Skeletons.Box.Y({
    className: `${pfx}__message`,
    kids: [
      Skeletons.Note({
        className : `${pfx}__message__title`,
        content   :  title
      }),
      Skeletons.Note({
        className : `${pfx}__message__name`,
        content   : ''
      }),
      Skeletons.Note({
        className : `${pfx}__message__static`,
        content   : text
      })
      //avata
    ]});
  

  const body = Skeletons.Box.G({
    className : `${pfx}__body`,
    debug     : __filename,
    kids      : [message]});

  const footer= Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__commands ${pfx}__commands `,
    kidsOpt : { 
      uiHandlers : [_ui_]
    },
    kids       : [
      // Skeletons.Button.Svg
      //   className : "ctrl-button accept"
      //   ico       : "video" 
      //   service   : 'accept'
      //   name      : _a.video
      //   state     : 1

      Skeletons.Note({
        className : "ctrl-button accept",
        name      : _a.audio,
        content   : LOCALE.REJOIN,// "Rejoindre"
        state     : 1,
        service   : 'accept'
      }),

      Skeletons.Note({
        className : "ctrl-button cancel",
        service   : 'decline',
        content   : LOCALE.IGNORE
      })//"Ignorer"
    ]});

  // header = Skeletons.Box.X
  //   className : "#{_ui_.fig.family}__header #{_ui_.fig.group}__header" 
  //   kids     : [require('./topbar')(_ui_), 'c']
  //   sys_pn   : _a.header

  const a = Skeletons.Box.Y({
    className  : `${pfx}__main`,
    debug      : __filename,
    kids       : [body, footer]});

  return a;
};
module.exports = __skl_window_switchcall;
