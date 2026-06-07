// Members roster for the People tab — every hub member with avatar, name, live
// status (mic / hand-raise / presenting) and a Call button for those not yet
// in the room. Individual rows are re-rendered in place by _refreshMember() on
// state changes (no full-list reload). Shown when no one is sharing; while
// sharing, the live tiles take over the tab instead.
module.exports = function membersList(_ui_) {
  const pfx = `${_ui_.fig.family}__roster`;
  const api = (typeof _ui_.membersListApi === "function")
    ? _ui_.membersListApi()
    : null;

  if (!api) {
    return Skeletons.Note({
      className: `${pfx}-empty`,
      content: LOCALE.NO_MEMBER || "No participants",
    });
  }

  return Skeletons.List.Smart({
    className: `${pfx}-list`,
    sys_pn: "roster-list",
    partHandler: [_ui_],
    api,
    itemsOpt: {
      kind: "widget_meeting_member",
      uiHandler: [_ui_],
      _meetingUi: _ui_,
    },
    vendorOpt: Preset.List.Orange_e,
    evArgs: Skeletons.Note(LOCALE.NO_MEMBER || "No participants", "no-content"),
  });
};
