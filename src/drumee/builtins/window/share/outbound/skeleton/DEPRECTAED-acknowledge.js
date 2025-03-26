// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __sb_main_outbound
//
// @param [Object] desk_ui
//
// @return [Object]
//
// ===========================================================
const __sb_main_outbound = function(_ui_) {
  let msg;
  if (_.isEmpty(_ui_.mget(_a.sharees))) {
    msg = LOCALE.MSG_SHARE_ACK;
  } else { 
    msg = LOCALE.ACK_SHARE_NEW_CONTACTS;
  }
  const a = [
    Skeletons.Box.Y({
      debug : __filename,
      className : `${_ui_.fig.group}__container pt-30 u-ai-center`,
      sys_pn: "container-main",
      kids: [
        Skeletons.Box.Y({
          kids: [
            Skeletons.Button.Svg({
              ico          : "desktop_check",
              className    : `${_ui_.fig.family}__icon acknowledge`
            }),

            Skeletons.Note({
              content      : msg,
              className    : `${_ui_.fig.family}__text acknowledge`
            })
          ]})
      ]})
  ];
  
  return a;
};
module.exports = __sb_main_outbound;
