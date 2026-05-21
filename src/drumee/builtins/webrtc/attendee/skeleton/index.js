/**
 *
 * @param {*} _ui_
 * @returns
 */
const __skl_conference_attendee = function(_ui_) {
  const fullname  = _ui_.mget(_a.fullname) || _ui_.mget(_a.username) || _ui_.mget('display');
  const { family } = _ui_.fig;

  // Optional — only window_meeting passes _meetingUi (see
  // window/meeting/skeleton/attendees.js). Other consumers (schedule,
  // connect, generic webrtc) leave it unset and we skip badges.
  const meetingUi =
    (_ui_.getOption && _ui_.getOption("_meetingUi")) || _ui_.mget("_meetingUi");
  const memberId = _ui_.mget(_a.user_id) || _ui_.mget('drumate_id');
  const memberKey = memberId != null ? String(memberId) : null;
  const handRaised =
    meetingUi && meetingUi._memberHandRaised && memberKey != null
      ? !!meetingUi._memberHandRaised.get(memberKey)
      : false;
  const presenting =
    meetingUi && meetingUi._memberPresenting && memberKey != null
      ? !!meetingUi._memberPresenting.get(memberKey)
      : false;

  const contact = Skeletons.UserProfile({
    className   : `${family}__profile`,
    id          : memberId,
    fullname,
    online      : _ui_.mget(_a.online),
    live_status : 1,
    sys_pn      : _a.profile
  });

  const badges = [];
  if (handRaised) {
    badges.push(Skeletons.Button.Svg({
      ico       : "hand-raise",
      className : `${family}__badge ${family}__badge--hand`,
      tooltips  : LOCALE.HAND_RAISED || "Hand raised",
      active    : 0,
    }));
  }
  if (presenting) {
    badges.push(Skeletons.Button.Svg({
      ico       : "presentation",
      className : `${family}__badge ${family}__badge--share`,
      tooltips  : LOCALE.SHARING_SCREEN || "Sharing screen",
      active    : 0,
    }));
  }

  const a = Skeletons.Box.X({
    className : `${family}__main`,
    debug     : __filename,
    service   : _a.invite,
    dataset   : {
      "hand-raised": handRaised ? 1 : 0,
      presenting   : presenting ? 1 : 0,
    },
    kids: [
      contact,
      Skeletons.Note({
        className : `${family}__name`,
        content   : fullname,
      }),
      ...badges,
      Skeletons.Button.Label({
        ico       : "desktop_confcalls",
        label     : LOCALE.CALL,
        className : `${family}__ctrl-btn`,
        sys_pn    : "ctrl-line",
      }),
    ],
  });

  return a;
};
module.exports = __skl_conference_attendee;
