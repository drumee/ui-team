// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form/skeleton/tags.coffee
//   TYPE : Skelton
// ===================================================================**/

const __window_webinar_inbound = function(_ui_, origin) {
  //@debug "OOOOOOOOOOOOO", origin
  const pfx = `${_ui_.fig.family}-inbound`;
  const avata = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__avatar`,
    kids      : [{
      kind      : KIND.profile,
      id        : origin.uid,
      active    : 0
    }]});

  const message = Skeletons.Box.Y({
    className: `${pfx}__message`,
    kids: [
      Skeletons.Note({
        className : `${pfx}__message`,
        content   : (origin.firstname.printf(LOCALE.X_IS_CALLING_YOU))
      }),
      Skeletons.Note({
        className : `${pfx}__message`,
        content   : LOCALE.INFO_MULTIPLE_INBOUND_CALL
      }),
      avata
    ]});
  

  const body = Skeletons.Box.G({
    className : `${pfx}__body`,
    debug     : __filename,
    kids      : [message]});

  const footer= Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__commands`,
    kids       : [

      Skeletons.Button.Svg({
        className : "ctrl-button accept",
        ico       : "video", //"video-camera"
        signal    : _e.confirm,
        name      : _a.video,
        state     : 1
      }),

      Skeletons.Button.Svg({
        className : "ctrl-button accept",
        ico       : "telephone_handset", 
        signal    : _e.confirm,
        name      : _a.audio,
        state     : 1
      }),

      Skeletons.Button.Svg({
        className : "ctrl-button line",
        ico       : "telephone_handset", 
        signal    : _e.cancel
      })
    ]});

  const a = Skeletons.Box.Y({
    className  : `${pfx}__main`,
    debug      : __filename,
    kids       : [body, footer]});

    
  return a;
};

module.exports = __window_webinar_inbound;
