// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/window/project-room/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __skl_change_owner
//
// @param [Object] _ui_
// @param [Object] size
// @param [Object] icon
//
// @return [Object] 
//
// ===========================================================
const __skl_change_owner = function(_ui_, data) {
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.group}__change-owner`, 
    kids : [
      Skeletons.Note({
        className : "title",
        content   : LOCALE.CHANGE_OWNER
      }),
      Skeletons.Note({
        className : "information",
        content   : (LOCALE.TEAM_ROOM.printf(LOCALE.INFO_OWNERSHIP_TRANSFERT))
      }),
      Skeletons.Note({
        className : "name",
        content   : `${data.name}`
      })
    ]});
  return a;
};
module.exports = __skl_change_owner;

