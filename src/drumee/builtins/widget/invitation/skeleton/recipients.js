
const { lookupApi } = require('libs/contact-lookup');

const __recipients_roll = function (ui) {
  const o = { ...Preset.List.Orange_e };
  o.start = _a.bottom;

  const searchbox = {
    kind: 'invitation_search',
    contactItem: {
      kind: "invitation_contact",
      service: "add-item"
    },
    debug: __filename,
    sys_pn: 'invitation-search',
    service: _e.update,
    className: "inline",
    // Address-book lookup: matches the typed string against every email a
    // contact holds, not just their name (libs/contact-lookup).
    api: lookupApi(),
    contactbook: ui.mget('contactbook'),
    preselect: ui.mget(_a.preselect),
    uiHandler: ui,
    addGuest: ui.mget('addGuest')
  };
  const contact = Skeletons.Box.G({
    className: `${ui.fig.group}__contact-container`,
    kids: [
      searchbox,
      Skeletons.Note({
        className: `${ui.fig.group}__contact-invite`,
        content: "Invite +",
        uiHandler: [ui],
        service: "invite"
      })]
  });

  const list = Skeletons.List.Smart({
    className: `${ui.fig.group}__container-recipients ${ui.fig.family}__list-destination`,
    innerClass: `${ui.fig.family}__access-list`,
    flow: _a.y,
    radiotoggle: _a.parent,
    sys_pn: "roll-recipients",
    kids: ui.getPending(),
    vendorOpt: o
  });
  return Skeletons.Box.Y({
    state: ui.getState() ^ 1,
    debug: __filename,
    name: "recipients",
    className: `${ui.fig.group}__container-recipients-roll`,
    kids: [list, contact]
  });
};

module.exports = __recipients_roll;
