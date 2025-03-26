// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chat-forward-list-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_chat_forward_list_item = function(_ui_) {

  let displayIcon, displayName;
  const chatFrwdListFig = _ui_.fig.family;
  const type = _ui_.mget(_a.type);

  if (type === 'private-room') {
    const fname = _ui_.mget(_a.firstname)  || '';
    const lname = _ui_.mget(_a.lastname)  || '';
    const fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);
    displayName = _ui_.mget(_a.surname);

    displayIcon = Skeletons.UserProfile({
      className : `${chatFrwdListFig}__profile ${type}`,
      id        : _ui_.mget(_a.id),
      firstname : fname,
      lastname  : lname,
      fullname
    });
  
  } else if (type === 'share-room') {
    displayName = _ui_.mget('group_name');

    displayIcon = Skeletons.Button.Svg({
      ico       : "raw-drumee_projectroom",
      className : `${chatFrwdListFig}__icon display-icon ${type} raw-drumee_projectroom`
    });
  }
  
  const name = Skeletons.Note({
    className : `${chatFrwdListFig}__name room-name`,
    content   : displayName
  });

  const _state = _ui_.getUserState();
  const checkBox = Skeletons.Button.Svg({
    className   : `${chatFrwdListFig}__icon checkbox ${type}`,
    icons       : ["editbox_shapes-roundsquare", "available"],//box-tags", "backoffice_checkboxfill
    sys_pn      : 'room-item-checkbox',
    state       : _state,
    value       : _ui_.mget(_a.id),
    formItem    : 'selector', 
    service     : _ui_.mget(_a.service) || 'trigger-room-select',
    uiHandler   : _ui_,
    type        : _ui_.mget(_a.type)
  });

  const a = Skeletons.Box.Y({
    className  : `${chatFrwdListFig}__main ${type}`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${chatFrwdListFig}__container ${type}`,
        kids : [
          Skeletons.Box.X({
            className   : `${chatFrwdListFig}__list ${type}`,
            kids        : [
              displayIcon,
              name,
              checkBox
            ]})
        ]})
    ]});

  return a;
};
module.exports = __skl_chat_forward_list_item;