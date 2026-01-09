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
const __sharees_list = function (ui) {
  let close, label;
  if (ui.mget(_a.label)) {
    label = ui.mget(_a.label);
  } else {
    label = LOCALE.MODIFY_LIST;
  }
  const sharees = {
    kind: 'invitation_shareeroll',
    hub_id: ui.mget(_a.hub_id),
    authority: ui.mget(_a.authority),
    sharees: ui.mget(_a.sharees),
    api: ui.mget(_a.api),
    mode: ui.mget(_a.mode),
    label: ui.mget('topLabel') || "????",
    sys_pn: "sharees-roll",
    shareeItem: {
      kind: 'invitation_sharee',
      authority: ui.mget(_a.authority),
      hub: ui.hub,
      media: ui.media,
      hub: ui.mget(_a.hub),
      uiHandler: ui,
      ...ui.mget('shareeItem')
    }
  };

  if (ui.mget('closeButton')) {
    close = Preset.Button.Close(ui);
  }
  const a = Skeletons.Box.Y({
    debug: __filename,
    name: "sharees",
    className: `${ui.fig.group} ${ui.fig.group}__container-sharee`,
    kids: [sharees]
  });
  if (ui.mget('bottomLabel')) {
    const button = Skeletons.Note({
      className: `${ui.fig.family}__button ${ui.fig.group}__list-title new-invitation `, // dialog__button--submit"
      content: ui.mget('bottomLabel') || label,
      sys_pn: "ref-addbutton",
      service: ui.mget(_a.service) || "new-invitation",
      uiHandler: ui
      // dataset    : 
      //   editable : ui.editable
    });
    a.kids.push(button);
  }

  if (close) {
    a.kids.unshift(close);
  }
  return a;
};
module.exports = __sharees_list;
