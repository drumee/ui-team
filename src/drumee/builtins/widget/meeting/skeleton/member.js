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

  const memberKey = memberId != null ? String(memberId) : null;
  const callState =
    meetingUi && meetingUi._memberCallStates && memberKey != null
      ? meetingUi._memberCallStates.get(memberKey)
      : null;
  const handRaised =
    meetingUi && meetingUi._memberHandRaised && memberKey != null
      ? !!meetingUi._memberHandRaised.get(memberKey)
      : false;
  const presenting =
    meetingUi && meetingUi._memberPresenting && memberKey != null
      ? !!meetingUi._memberPresenting.get(memberKey)
      : false;

  // Status badges shown to the right of the name (read-only for everyone,
  // including self — the actionable controls are the buttons below).
  const badges = [];
  if (handRaised) {
    badges.push(
      Skeletons.Button.Svg({
        ico: "meet-hand",
        className: `${pfx}__member-badge ${pfx}__member-badge--hand`,
        tooltips: LOCALE.HAND_RAISED || "Hand raised",
        active: 0,
      }),
    );
  }
  if (presenting) {
    badges.push(
      Skeletons.Button.Svg({
        ico: "meet-screen",
        className: `${pfx}__member-badge ${pfx}__member-badge--share`,
        tooltips: LOCALE.SHARING_SCREEN || "Sharing screen",
        active: 0,
      }),
    );
  }

  // Action button. For non-self users we keep the original Call/Calling…/
  // Joined flow. For self, swap to "Lower hand" / "Stop sharing" when the
  // corresponding state is active — these are the only actions the local
  // user can take from a member card. Otherwise self has no trailing button.
  let actionBtn = null;
  if (isSelf) {
    if (handRaised) {
      actionBtn = Skeletons.Button.Label({
        className: `${pfx}__member-call-btn`,
        ico: "meet-hand",
        label: LOCALE.LOWER_HAND || "Lower hand",
        service: "lower-hand-self",
        dataset: { state: "lower-hand" },
        uiHandler: [_ui_],
      });
    } else if (presenting) {
      actionBtn = Skeletons.Button.Label({
        className: `${pfx}__member-call-btn`,
        ico: "meet-screen",
        label: LOCALE.STOP_SHARING || "Stop sharing",
        service: "stop-share-self",
        dataset: { state: "stop-share" },
        uiHandler: [_ui_],
      });
    }
  } else {
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
    actionBtn = Skeletons.Button.Label({
      className: `${pfx}__member-call-btn`,
      ico: "meet-camera",
      label: callLabel,
      service: callService,
      dataset: btnDataset,
      uiHandler: [_ui_],
    });
  }

  return Skeletons.Box.X({
    className: `${pfx}__member-row`,
    dataset: {
      "hand-raised": handRaised ? 1 : 0,
      presenting: presenting ? 1 : 0,
      self: isSelf ? 1 : 0,
    },
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
          Skeletons.Box.X({
            className: `${pfx}__member-name-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__member-name`,
                content: fullname,
              }),
              ...badges,
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__member-email`,
            content: _ui_.mget(_a.email) || "",
          }),
        ],
      }),

      actionBtn,
    ].filter(Boolean),
  });
};
