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
const __sharees_list = function (_ui_) {
  let close, label;
  if (_ui_.mget(_a.label)) {
    label = _ui_.mget(_a.label);
  } else {
    label = LOCALE.MODIFY_LIST;
  }
  const sharees = {
    kind: 'invitation_shareeroll',
    hub_id: _ui_.mget(_a.hub_id),
    authority: _ui_.mget(_a.authority),
    sharees: _ui_.mget(_a.sharees),
    api: _ui_.mget(_a.api),
    mode: _ui_.mget(_a.mode),
    label: _ui_.mget('topLabel') || "????",
    sys_pn: "sharees-roll",
    pipi: "popo",
    shareeItem: {
      kind: 'invitation_sharee',
      authority: _ui_.mget(_a.authority),
      hub: _ui_.hub,
      media: _ui_.media,
      hub: _ui_.mget(_a.hub),
      uiHandler: _ui_,
      ..._ui_.mget('shareeItem')
    }
  };

  if (_ui_.mget('closeButton')) {
    close = Preset.Button.Close(_ui_);
  }
  const a = Skeletons.Box.Y({
    debug: __filename,
    name: "sharees",
    className: `${_ui_.fig.group} ${_ui_.fig.group}__container-sharee`,
    kids: [sharees]
  });
  if (_ui_.mget('bottomLabel')) {
    const button = Skeletons.Note({
      className: `${_ui_.fig.family}__button ${_ui_.fig.group}__list-title new-invitation `, // dialog__button--submit"
      content: _ui_.mget('bottomLabel') || label,
      sys_pn: "ref-addbutton",
      service: _ui_.mget(_a.service) || "new-invitation",
      uiHandler: _ui_
      // dataset    : 
      //   editable : _ui_.editable
    });
    a.kids.push(button);
  }

  if (close) {
    a.kids.unshift(close);
  }
  return a;
};
module.exports = __sharees_list;
