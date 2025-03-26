/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/skeleton/social/connect
//   TYPE :
// ==================================================================== *

// ==================================
// Inputs definition for signup pad
// ==================================

// ===========================================================
// __skl_social_connect
//
// ===========================================================
const __skl_social_connect = function(_ui_) {
  let fig;
  if (_ui_.fig != null) {
    fig = _ui_.fig.family;
  } else { 
    fig = "entry-form";
  }
  // social_icon_options = 
  //   width   : 16
  //   height  : 16
  //   padding : 0
  const genesis = { 
    kind      : KIND.image.svg,
    className : `mx-7 ${fig}__icon social-icon`,
    uiHandler :_ui_, 
    service   : "social-connect"
  };

  const a = SKL_Box_H(_ui_, {
    debug    : __filename,
    sys_pn   : "social-connect",
    className: `${fig}__container-social social`,
    kids     : [
      Skeletons.Note(LOCALE.OR_SIGN_IN_BY, `${fig}__label social-label mx-7`),
      Skeletons.Box.X({
        className: `${fig}__container u-ai-center`,
        populate :[
          genesis,
          {name : 'facebook', chartId : "login_facebook"},
          {name : 'google',   chartId : "login_google"},
          {name : 'twitter',  chartId : "login_twitter"}
        ]
      })
          // Skeletons.Button.Svg({
          //   ico       : "login_facebook"
          //   provider  : 'facebook'
          //   className : "mx-7 #{fig}__icon social-icon"
          //   service   : "social-connect"
          //   ui        
          // }) 
          // Skeletons.Button.Svg({
          //   ico       : "login_google"
          //   provider  : 'google'
          //   className : "mx-7 #{fig}__icon social-icon"
          //   service   : "social-connect"
          // }) 
          // Skeletons.Button.Svg({
          //   ico       : "login_twitter"
          //   provider  : 'twitter'
          //   className : "mx-7 #{fig}__icon social-icon"
          //   service   : "social-connect"
          // }) 
        // ]
      //})
    ]
  });

  return a;
};
module.exports = __skl_social_connect;
