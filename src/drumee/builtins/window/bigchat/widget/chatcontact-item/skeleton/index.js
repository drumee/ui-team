
const { supportAvatar, isSupportEntity } = require("libs/support");

const __skl_widget_chatcontactItem = function (ui) {
  let chat_icon, msg, state;
  const contentFig = ui.fig.family;
  // Hoisted out of the `flag === 'contact'` branch so the name Note below can
  // fall back the same way the chat header does (chat-header.js): a contact
  // whose server-computed `display` is empty/blank would otherwise render a
  // BLANK name in the inbox list while the header + avatar still show one.
  const fname = ui.mget(_a.firstname) || '';
  const lname = ui.mget(_a.lastname) || '';
  const fullname = ui.mget(_a.fullname) || `${fname} ${lname}`.trim();
  const displayName = (ui.mget('display') || '').trim() || fullname || fname || lname;
  // The row whose PEER is the support account — the user's side of the
  // conversation. The account that answers support can never match: its own
  // id is not among its rows' peers.
  const supportPeer = isSupportEntity(ui.mget('entity_id'));

  if (supportPeer) {
    // Product mark rather than auto-coloured initials, so support does not
    // read as one more contact in the list. See libs/support.supportAvatar.
    chat_icon = supportAvatar(`${contentFig}__support-avatar`);
  } else if (ui.mget('flag') === 'contact') {
    chat_icon = Skeletons.UserProfile({
      className: `${contentFig}__profile`,
      id: ui.mget('entity_id'),
      firstname: fname || ui.mget('display'),
      lastname: lname,
      fullname,
      online: ui.mget(_a.online),
      live_status: 1,
      auto_color: 1,
      sys_pn: _a.profile
    });
  } else {
    chat_icon = Skeletons.Button.Svg({
      ico: "raw-drumee_projectroom",
      className: `${contentFig}__icon raw-drumee_projectroom`
    });
  }

  const name = Skeletons.Note({
    className: `${contentFig}__note name`,
    content: displayName,
    escapeContextmenu: true
  });

  // Support conversations are marked in both inboxes: as a user, so the
  // support thread is findable among ordinary chats; as the admin who answers
  // support, so a request from a stranger is not mistaken for a colleague.
  // The owning chat_p2p panel decides — it is the one that knows which
  // account answers support. Rows in window_bigchat have no such parent and
  // simply never carry the pill.
  const panel = _.isFunction(ui.getParentByKind)
    ? ui.getParentByKind('chat_p2p')
    : null;
  // Not on the user's own support row: the Drumee mark and the name already
  // say what it is, and the badge only repeats them. It stays on the agent's
  // side, where it is what marks a stranger's row as a request for help.
  const supportPill =
    !supportPeer && panel && _.isFunction(panel._isSupportRow) && panel._isSupportRow(ui)
      ? Skeletons.Note({
          className: `${contentFig}__support-pill`,
          content: LOCALE.SUPPORT_LABEL
        })
      : null;

  const md = ui.mget(_a.metadata);
  if (md && (md.message_type === 'call')) {
    switch (md.call_status) {
      case _e.leave:
        // This row comes from p2p_time.metadata, which is a single shared
        // record for both parties — its `role` is always the writer's
        // ("caller"). caller_id is the side-independent field; fall back to
        // role for conversations whose last event predates it.
        if (md.caller_id ? md.caller_id === Visitor.id : md.role === _a.caller) {
          msg = LOCALE.OUTGOING_CALL;
        } else {
          msg = LOCALE.INCOMING_CALL;
        }
        break;
      case 'reject':
        msg = LOCALE.CALL_DECLINED;
        break;
      case _a.cancel:
        msg = LOCALE.MISSED_CALL;
        break;
      default:
        msg = ui.mget(_a.message);
    }
  } else {
    msg = ui.mget(_a.message);
  }

  if (_.isEmpty(msg) && (ui.mget('is_attachment') === 1)) {
    msg = LOCALE.ATTACHMENT;
  }

  if (msg && typeof msg === 'string') {
    // Lazy label (.+?) so a filename containing "]" still strips to @name.
    msg = msg.replace(/\[@(.+?)\]\((?:user|mention)[^)]*\)/g, '@$1');
  }

  const chatMessage = Skeletons.Note({
    className: `${contentFig}__note message`,
    sys_pn: _a.message,
    content: msg,
    escapeContextmenu: true
  });

  // A conversation with no messages yet has no ctime — Dayjs.unix(undefined)
  // formats as "Invalid Date", so render nothing instead.
  // Support with nothing said yet reads "Always" rather than blank — the row
  // is pinned and permanent, and an empty slot makes it look unfinished.
  const ctime = ui.mget(_a.ctime);
  const chatTime = Skeletons.Note({
    className: `${contentFig}__note time`,
    sys_pn: 'msg-time',
    content: ctime
      ? Dayjs.unix(ctime).locale(Visitor.language()).format("HH:mm")
      : (supportPeer ? LOCALE.SUPPORT_ALWAYS : '')
  });

  const value = ui.mget('room_count') || "";

  if (!~~value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }

  const counterNote = Skeletons.Box.X({
    sys_pn: "counter",
    className: `${contentFig}__digit`,
    dataset: {
      state
    }
  });

  const a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${contentFig}__container`,
        kids: [
          Skeletons.Box.X({
            className: `${contentFig}__avatar-wrapper`,
            kids: [
              chat_icon,
              counterNote
            ]
          }),

          Skeletons.Box.Y({
            className: `${contentFig}__info`,
            kids: [
              Skeletons.Box.X({
                className: `${contentFig}__info-top`,
                kids: [
                  name,
                  supportPill,
                  chatTime
                ]
              }),
              chatMessage
            ]
          })
        ]
      })
    ]
  });

  return a;
};
module.exports = __skl_widget_chatcontactItem;