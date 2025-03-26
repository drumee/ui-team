// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __skl_trash_main = function(manager) {

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${manager.fig.family}__header ${manager.fig.group}__header`, 
    kids : [require('./top-bar')(manager)]
  });
  const a = require('window/skeleton/content/main')(manager, menu);
  return a;
};
module.exports = __skl_trash_main;
