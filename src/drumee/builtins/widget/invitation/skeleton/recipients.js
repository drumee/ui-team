
const __recipients_roll = function (ui) {
  const o = { ...Preset.List.Orange_e };
  o.start = _a.bottom;

  const searchbox = {
    kind: 'invitation_search',
    contactItem: ui.resultItem,
    debug: __filename,
    signal: _e.ui.event,
    sys_pn: 'invitation-search',
    service: _e.update,
    className: "inline",
    api: {
      service: SERVICE.drumate.my_contacts,
      hub_id: Visitor.id
    },
    contactbook: ui.mget('contactbook'),
    preselect: ui.mget(_a.preselect),
    uiHandler: ui,
    addGuest: ui.mget('addGuest')
  };

  const list = Skeletons.List.Smart({
    className: `${ui.fig.group}__container-recipients ${ui.fig.family}__list-destination`,
    innerClass: `${ui.fig.family}__access-list`,
    flow: _a.y,
    radiotoggle: _a.parent,
    sys_pn: "roll-recipients",
    kids: ui.getPending(),
    vendorOpt: o
  });
  const a = Skeletons.Box.Y({
    state: ui.getState() ^ 1,
    debug: __filename,
    name: "recipients",
    className: `${ui.fig.group}__container-recipients-roll`,
    kids: [list, searchbox]
  });
  return a;
};

module.exports = __recipients_roll;
