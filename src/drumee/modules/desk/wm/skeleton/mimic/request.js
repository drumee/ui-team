// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/icons
//   TYPE :
// ==================================================================== *


// ----------------------------------------
//
// ----------------------------------------
const __request_mimic = function(_ui_,data){
  const a = {
    title: "Request Desk Access",
    message: data.mimicker_fullname + " is request to see your desk",
    confirm: 'Accept',
    confirm_type: 'primary',
    cancel: 'Reject',
    cancel_type: 'secondary',
    mode: 'hbf'
  };

  return a; 
};
module.exports = __request_mimic;
