// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/media/notifications/origin/message/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_notification_message = function(_ui_) {
  const hub_id = _ui_.mget(_a.hub_id);
  const nid = _ui_.mget(_a.nid);
  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    service    : "new-messages",
    kids       : [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__hubname`,
        content    : `${_ui_.mget(_a.name)}:`,
        active     : 0
      }),
      Skeletons.Note({
        className  : `${_ui_.fig.family}__count`,
        content    : `${_ui_.mget(_a.count)} msg`,
        active     : 0
      })
    ]});

  return a;
};
module.exports = __skl_notification_message;