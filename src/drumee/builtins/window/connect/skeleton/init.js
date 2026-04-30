/**
 * Pre-call layout: header + caller/callee identity + status + accept/decline.
 * Used for both 'dial' (outbound) and 'ring' (inbound) states.
 */
const __webrtc_init = function (_ui_, peer) {
  const fig = _ui_.fig.family;
  const grp = _ui_.fig.group;
  const mode = _ui_.mget(_a.mode) || "";
  peer = peer || {};

  const header = Skeletons.Box.X({
    className: `${fig}__header ${grp}__header ${mode}`,
    kids: [require('./topbar')(_ui_)],
    sys_pn: _a.header,
    dataset: {
      header: _ui_.mget(_a.header),
      area: _ui_.mget(_a.area),
    },
  });

  const fname = peer.firstname || '';
  const lname = peer.lastname || '';
  const fullname = peer.fullname || `${fname} ${lname}`.trim();
  const display = peer.display || fullname || LOCALE.CONTACT;
  const peerId = peer.uid || peer.drumate_id || peer.entity_id || peer.id;

  const avatar = Skeletons.UserProfile({
    className: `${fig}__avatar ${grp}__avatar`,
    id: peerId,
    firstname: fname,
    lastname: lname,
    fullname,
    auto_color: 1,
  });

  const identity = Skeletons.Box.Y({
    className: `${fig}__identity`,
    kids: [
      avatar,
      Skeletons.Note({
        className: `${fig}__caller-name`,
        content: display,
      }),
    ],
  });

  const body = Skeletons.Box.Y({
    className: `${fig}__body ${grp}__body`,
    sys_pn: _a.content,
    dataset: { header: _ui_.mget(_a.header) },
    kids: [
      identity,
      Skeletons.Wrapper.Y({
        sys_pn: "message-container",
        className: `${grp}__message-container ${fig}__message-container`,
        partHandler: [_ui_],
      }),
      require('./default-commands')(_ui_),
    ],
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__main`,
    kids: [header, body],
  });
};

module.exports = __webrtc_init;
