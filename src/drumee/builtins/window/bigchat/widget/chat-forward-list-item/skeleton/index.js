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
  const disabled = _ui_.isChatDisabled();

  // _a.privateRoom/_a.shareRoom come from createSafeObject proxy and resolve
  // to the camelCase keys 'privateRoom'/'shareRoom' — NOT 'private-room'.
  // The previous string-literal compare never matched so both branches were
  // skipped and rows rendered with only the checkbox visible.
  if (type === _a.privateRoom) {
    const fname = _ui_.mget(_a.firstname)  || '';
    const lname = _ui_.mget(_a.lastname)  || '';
    const fullname = _ui_.mget(_a.fullname) || `${fname} ${lname}`.trim();
    displayName = fullname
      || _ui_.mget(_a.name)
      || _ui_.mget(_a.email)
      || LOCALE.NAME_CONTACT;

    displayIcon = Skeletons.UserProfile({
      className  : `${chatFrwdListFig}__profile ${type}`,
      id         : _ui_.mget(_a.id),
      firstname  : fname,
      lastname   : lname,
      fullname,
      online     : _ui_.mget(_a.online),
      live_status: 1
    });

  } else if (type === _a.shareRoom) {
    displayName = _ui_.mget('group_name') || _ui_.mget(_a.name) || '';

    displayIcon = Skeletons.Button.Svg({
      ico       : "raw-drumee_projectroom",
      className : `${chatFrwdListFig}__icon display-icon ${type} raw-drumee_projectroom`
    });
  }
  
  const name = Skeletons.Note({
    className : `${chatFrwdListFig}__name room-name`,
    content   : displayName
  });

  // Name + presence stacked (Figma 2307-52459). The presence line is appended
  // only when there's a real status to show — getPresenceText returns '' for
  // team rooms and for contacts without a status field, so no empty row.
  const infoKids = [name];
  const presenceText = _ui_.getPresenceText();
  if (presenceText) {
    infoKids.push(Skeletons.Note({
      className : `${chatFrwdListFig}__presence`,
      content   : presenceText
    }));
  }

  const _state = _ui_.getUserState();
  const checkBox = Skeletons.Button.Svg({
    className   : `${chatFrwdListFig}__icon checkbox ${type}`,
    icons       : ["editbox_shapes-roundsquare", "available"],//box-tags", "backoffice_checkboxfill
    sys_pn      : 'room-item-checkbox',
    state       : _state,
    value       : _ui_.mget(_a.id),
    formItem    : 'selector',
    service     : disabled ? null : (_ui_.mget(_a.service) || 'trigger-room-select'),
    uiHandler   : disabled ? [] : [_ui_],
    type        : _ui_.mget(_a.type)
  });

  const a = Skeletons.Box.Y({
    className  : `${chatFrwdListFig}__main ${type}`,
    debug      : __filename,
    dataset    : { disabled: disabled ? 1 : 0 },
    // className is required, not cosmetic: the framework `tooltips` prop
    // (letc.js __addTooltips) only injects the node — every position/background
    // rule comes from the skin. Without a class the card renders unstyled and
    // is effectively invisible, so the disabled row would explain nothing.
    tooltips   : disabled
      ? {
        content   : _ui_.disabledReason(),
        className : `${chatFrwdListFig}__tooltip`
      }
      : undefined,
    uiHandler  : disabled ? [] : undefined,
    kids       : [
      Skeletons.Box.Y({
        className  : `${chatFrwdListFig}__container ${type}`,
        kids : [
          Skeletons.Box.X({
            className   : `${chatFrwdListFig}__list ${type}`,
            kids        : [
              displayIcon,
              Skeletons.Box.Y({
                className : `${chatFrwdListFig}__info ${type}`,
                kids      : infoKids
              }),
              checkBox
            ]})
        ]})
    ]});

  return a;
};
module.exports = __skl_chat_forward_list_item;
