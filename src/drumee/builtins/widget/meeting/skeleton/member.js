module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;
  const firstname = _ui_.mget(_a.firstname) || "";
  const lastname = _ui_.mget(_a.lastname) || "";
  // `fullname` arrives from hub_get_members_by_type as CONCAT(firstname,' ',
  // lastname), so when the contact-book override blanked both parts it is a
  // lone space — truthy, and enough to shadow every fallback below it. Trim
  // first, then fall back to surname (which that proc DOES guard with IFNULL,
  // down to the email) so the row keeps a readable name.
  const fullname =
    String(_ui_.mget(_a.fullname) || "").trim()
    || `${firstname} ${lastname}`.trim()
    || String(_ui_.mget(_a.surname) || "").trim()
    || String(_ui_.mget(_a.email) || "").trim();
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
    // Ring states come from the meeting window (window/meeting/member-call.js).
    // "calling" and "joined" are inert; a ring's outcome (declined / no answer
    // / offline) shows for a few seconds and stays clickable to call again.
    const CALL_LABELS = {
      calling: LOCALE.CALLING,
      joined: LOCALE.JOINED,
      declined: LOCALE.DECLINED,
      no_answer: LOCALE.CALL_NO_ANSWER,
      offline: LOCALE.OFFLINE,
    };
    const known = Object.prototype.hasOwnProperty.call(CALL_LABELS, callState);
    const busy = callState === "calling" || callState === "joined";
    // data-call, not data-state: the button's own toggle state owns data-state.
    // attrOpt, because a bare dataset is dropped at render.
    const callAttr = known ? { "data-call": callState } : undefined;
    actionBtn = Skeletons.Button.Label({
      className: `${pfx}__member-call-btn`,
      ico: "meet-camera",
      label: known ? CALL_LABELS[callState] : LOCALE.CALL,
      service: busy ? null : "call-member",
      attrOpt: callAttr,
      dataset: known ? { call: callState } : undefined,
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
        // The parts above are routinely empty on this row while the row still
        // knows who the person is: hub_get_members_by_type overwrites
        // firstname/lastname from the REQUESTING user's own contact book, and a
        // contact created from an email invitation has both NULL. Hand the
        // profile the whole name as well so it can still derive initials — that
        // is the difference between "VL" and a blank circle for the same member
        // on two different participants' screens.
        fullname,
        surname: _ui_.mget(_a.surname) || fullname,
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
