// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_step = function(_ui_, step, label){
  let state;
  const pfx = `${_ui_.fig.family}-deletion`;
  if (step === _ui_._step) {
    state = 1;
  } else {
    state = 0;
  }
  const a = Skeletons.Box.Y({
    className : `${pfx}__step`,
    state,
    kids:[
      Skeletons.Note({
        className  : "step",
        innerClass : "step-number",
        content : step,
        state
      }),
      Skeletons.Note({
        className: "step-label",
        content : label
      })
    ]});
  return a; 
};

module.exports = __account_data_step;
