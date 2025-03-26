// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/icons
//   TYPE :
// ==================================================================== *


// ----------------------------------------
//
// ----------------------------------------
const __decline_mimic = function(_ui_,data){
  const a = {
    kind:'window_info',
    debug : __filename,
    message :
      Skeletons.Box.Y({
        kids:[          
          {kind:'note', className:"primary-color",content:data.user_fullname},
          {kind:'note', content:"Reject your request"}
        ]})
  };
  return a; 
};
module.exports = __decline_mimic;
