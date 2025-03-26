// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __pass_phrase_tooltips = function(_ui_){
  let skl;
  switch (Visitor.language()) {
    case 'en':
      skl = require(("./locale/en"));
      break;
    case 'fr':
      skl = require(("./locale/fr"));
      break;
    case 'ru':
      skl = require(("./locale/en"));
      break;
    case 'zh':
      skl = require(("./locale/en"));
      break;
    default:
      skl = require(("./locale/en"));
  }

  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__tooltips ${_ui_.fig.group}__tooltips --large box-shadow-13 px-20 py-8`,
    debug       : __filename,
    kids        : skl(_ui_)
  }); //.push Preset.Button.Close(_ui_, "close-tooltips")
  a.kids.unshift(Preset.Button.Close(_ui_, "close-tooltips"));
  return a;
};

module.exports = __pass_phrase_tooltips;
