// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_deletion = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      require("./header")(_ui_),
      require("./steps")(_ui_),
      Skeletons.Box.X({
        className : `${pfx}__guidelines`,
        kids      : [
          Skeletons.Note({
            className: "items-list",
            content : LOCALE.ACOUNT_DELETION_GUIDELINES
          })
        ]}),
      require("./footer")(_ui_)
    ]});

  return a; 
};

module.exports = __account_data_deletion;
