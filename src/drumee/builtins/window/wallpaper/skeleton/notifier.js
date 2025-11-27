// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'desk/skeleton/notifier';
}


// ----------------------------------------
//
// ----------------------------------------
const __general_notifier = function(_ui_, data){
  data = data || {};
  const icon_options = {
    width   : 40,
    height  : 40,
    padding : 10
  };
  const count = data.count || "";
  const a = SKL_SVG_LABEL('desktop_sharing', {
    className : 'desk__input-icon desk__input-icon--plus mr-30',
    labelClass: "share-btn-count",
    active    : 0,
    label     : count,
    uiHandler   : _ui_.model.get(_a.handler).ui 
  }, icon_options);

  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __general_notifier;
