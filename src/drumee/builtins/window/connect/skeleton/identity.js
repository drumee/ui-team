/**
 * Peer identity block shared by every non-live 1:1 call screen (Figma: a round
 * 120px avatar above the display name and the peer's email).
 *
 * The email line is rendered only when the peer record actually carries one —
 * contacts opened from chat-p2p do, a caller resolved purely from a signaling
 * payload may not, and an empty line would leave a visible gap under the name.
 */
const __window_connect_identity = function (_ui_, peer) {
  const fig = _ui_.fig.family;
  const grp = _ui_.fig.group;
  peer = peer || {};

  const fname = peer.firstname || "";
  const lname = peer.lastname || "";
  const fullname = peer.fullname || `${fname} ${lname}`.trim();
  const display = peer.display || fullname || LOCALE.CONTACT;
  const peerId = peer.uid || peer.drumate_id || peer.entity_id || peer.id;
  const email = peer.email || peer.mail || "";

  const avatar = Skeletons.UserProfile({
    className: `${fig}__avatar ${grp}__avatar`,
    id: peerId,
    firstname: fname,
    lastname: lname,
    fullname,
    auto_color: 1,
  });

  return Skeletons.Box.Y({
    className: `${fig}__identity`,
    kids: [
      avatar,
      Skeletons.Box.Y({
        className: `${fig}__identity-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__caller-name`,
            content: display,
          }),
          email
            ? Skeletons.Note({
                className: `${fig}__caller-email`,
                content: email,
              })
            : null,
        ].filter(Boolean),
      }),
    ],
  });
};

module.exports = __window_connect_identity;
