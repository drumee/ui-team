
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
  if (ui.mget('flag') === 'contact') {
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

  const md = ui.mget(_a.metadata);
  if (md && (md.message_type === 'call')) {
    switch (md.call_status) {
      case _e.leave:
        if (md.role === _a.caller) {
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
    msg = msg.replace(/\[@([^\]]+)\]\((?:user|mention)[^)]*\)/g, '@$1');
  }

  const chatMessage = Skeletons.Note({
    className: `${contentFig}__note message`,
    sys_pn: _a.message,
    content: msg,
    escapeContextmenu: true
  });

  const chatTime = Skeletons.Note({
    className: `${contentFig}__note time`,
    sys_pn: 'msg-time',
    content: Dayjs.unix(ui.mget(_a.ctime)).locale(Visitor.language()).format("HH:mm")
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