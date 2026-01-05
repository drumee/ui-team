
const __recipients_roll = function (ui) {
  const o = { ...Preset.List.Orange_e };
  o.start = _a.bottom;
  // const label = Skeletons.Box.X({
  //   className: `${ui.fig.family}__label`,
  //   kids: [
  //     Skeletons.Note({
  //       className: "content",
  //       content: LOCALE.ACCESS_LIST
  //     })
  //   ]
  // });

  const searchbox = {
    kind: 'invitation_search',
    contactItem: ui.resultItem,
    debug: __filename,
    signal: _e.ui.event,
    sys_pn: 'invitation-search',
    service: _e.update,
    className: "inline",
    api: ui.mget(_a.api),
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
