// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *

// =========================
// 
// =========================
const __recipients_roll = function (_ui_) {
  const o = { ...Preset.List.Orange_e };
  o.start = _a.bottom;
  const label = Skeletons.Box.X({
    className: `${_ui_.fig.family}__label`,
    kids: [
      Skeletons.Note({
        className: "content",
        content: LOCALE.ACCESS_LIST
      })
    ]
  });

  const searchbox = {
    kind: 'invitation_search',
    contactItem: _ui_.resultItem,
    debug: __filename,
    signal: _e.ui.event,
    sys_pn: 'invitation-search',
    service: _e.update,
    className: "inline",
    api: _ui_.mget(_a.api),
    contactbook: _ui_.mget('contactbook'),
    preselect: _ui_.mget(_a.preselect),
    uiHandler: _ui_,
    addGuest: _ui_.mget('addGuest')
  };

  const list = Skeletons.List.Smart({
    className: `${_ui_.fig.group}__container-recipients ${_ui_.fig.family}__list-destination`,
    innerClass: `${_ui_.fig.family}__access-list`,
    flow: _a.y,
    radiotoggle: _a.parent,
    sys_pn: "roll-recipients",
    kids: _ui_.getPending(),
    vendorOpt: o
  });
  const a = Skeletons.Box.Y({
    state: _ui_.getState() ^ 1,
    debug: __filename,
    name: "recipients",
    className: `${_ui_.fig.group}__container-recipients-roll`,
    kids: [label, list, searchbox]
  });
  return a;
};

module.exports = __recipients_roll;
