// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __pass_phrase_tooltips = function(_ui_, txt){

  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__tooltips ${_ui_.fig.group}__tooltips --small box-shadow-13 px-20 py-8`,
    debug       : __filename,
    kids        : [
      Preset.Button.Close(_ui_, "close-tooltips"),
      Skeletons.Note(txt)
    ]});
  a.kids;
  return a;
};

module.exports = __pass_phrase_tooltips;
