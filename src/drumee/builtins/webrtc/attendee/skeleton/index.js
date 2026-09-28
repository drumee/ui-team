/**
 *
 * @param {*} _ui_
 * @returns
 */
const __skl_conference_attendee = function(_ui_) {
  // Trim before falling through: hub_get_members_by_type builds `fullname` as
  // CONCAT(firstname,' ',lastname), which is a lone space — truthy — for a
  // member whose name parts it blanked from the viewer's contact book. `surname`
  // is the one field that proc guards with IFNULL, all the way down to the email.
  const fullname  = String(_ui_.mget(_a.fullname) || '').trim()
    || _ui_.mget(_a.username) || _ui_.mget('display')
    || String(_ui_.mget(_a.surname) || '').trim()
    || String(_ui_.mget(_a.email) || '').trim();
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
    // Parts first (same source the roster card uses, so both surfaces produce
    // the same initials and the same auto colour for one person), whole name as
    // the fallback when the row carries no parts.
    firstname   : _ui_.mget(_a.firstname),
    lastname    : _ui_.mget(_a.lastname),
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
