// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __sharees_admin = function(_ui_, txt) {
  _dbg("aaaa 22", _ui_);
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className : `${_ui_.fig.group} ${_ui_.fig.group}__main sharees-roll`,
    kids: [
      Skeletons.Note(LOCALE.ACCESS_LIST, `${_ui_.fig.family}__title--access`),
      require("./list")(_ui_)
    ]
  });
  if (_.isEmpty(_ui_.mget(_a.sharees))) {
    a.unshif(Skeletons.Box.X({
      className : `${_ui_.fig.family}__label`,
      kids: [
        Skeletons.Note({
          className : " mb-15",
          content   : txt || LOCALE.ADD_ADMINISTRATORS
        })
      ]
    })
    );
  }
  return a;
};
module.exports = __sharees_admin;
