// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __correct = function(_ui_) {
  const a = Skeletons.Button.Svg({
    ico       : "available",//"account_check"
    src: `${protocol}://${bootstrap().main_domain}/_/static/images/icons/available.svg`, 
    className : `${_ui_.fig.family}__correct`,
    uiHandler : [_ui_]}); 

  return a;
};
module.exports = __correct;
