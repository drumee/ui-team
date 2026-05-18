module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const firstname = _ui_.mget(_a.firstname) || "";
  const lastname = _ui_.mget(_a.lastname) || "";
  const fullname = _ui_.mget(_a.fullname) || `${firstname} ${lastname}`.trim();
  const memberId = _ui_.mget(_a.drumate_id) || _ui_.mget(_a.entity_id);
  const isSelf = memberId != null && String(memberId) === String(Visitor.id);

  // Look in both options and model — smart-list itemsOpt can land in either.
  const meetingUi =
    (_ui_.getOption && _ui_.getOption("_meetingUi")) || _ui_.mget("_meetingUi");
  const callState =
    meetingUi && meetingUi._memberCallStates && memberId != null
      ? meetingUi._memberCallStates.get(String(memberId))
      : null;
  let callLabel = LOCALE.CALL || "Call";
  let callService = "call-member";
  let btnDataset;
  if (callState === "calling") {
    callLabel = LOCALE.CALLING || "Calling…";
    callService = null;
    btnDataset = { state: "calling" };
  } else if (callState === "joined") {
    callLabel = LOCALE.JOINED || "Joined";
    callService = null;
    btnDataset = { state: "joined" };
  }

  return Skeletons.Box.X({
    className: `${pfx}__member-row`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__member-avatar`,
        id: memberId,
        firstname,
        lastname,
        live_status: 1,
        auto_color: 1,
      }),

      Skeletons.Box.Y({
        className: `${pfx}__member-info`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__member-name`,
            content: fullname,
          }),
          Skeletons.Note({
            className: `${pfx}__member-email`,
            content: _ui_.mget(_a.email) || "",
          }),
        ],
      }),

      isSelf
        ? null
        : Skeletons.Button.Label({
            className: `${pfx}__member-call-btn`,
            ico: "folder-meeting",
            label: callLabel,
            service: callService,
            dataset: btnDataset,
            uiHandler: [_ui_],
          }),
    ],
  });
};
