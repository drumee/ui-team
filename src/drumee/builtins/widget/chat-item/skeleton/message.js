
const { Autolinker } = require("autolinker");

const __skl_widget_message = function (_ui_) {
  let message;
  const chatItemFig = _ui_.fig.family;
  const author = _ui_.mget(_a.author) || "";
  const metadata = _ui_.mget('metadata');
  const isTicket = _ui_.mget('is_ticket');
  const messageType = _ui_.mget('message_type');
  const callStatus = _ui_.mget('call_status');
  const callDuration = _ui_.mget('call_duration');

  let messageContent = Autolinker.link(_ui_.mget(_a.message));

  if (isTicket) {
    let category;
    messageContent = `#${_ui_.mget('ticket_id')} `;
    if (_.isArray(metadata.category) && metadata.category.length) {
      category = metadata.category.join(', ');
      messageContent = messageContent + `<br> ${metadata.category_display.join(', ')}`;
    }

    if (_.isArray(metadata.where) && metadata.where.length) {
      category = metadata.where.join(', ');
      messageContent = messageContent + `<br> ${metadata.where_display.join(', ')}`;
    }

    if (metadata.alltime) {
      messageContent = messageContent + "<br> All the time";
    }

    messageContent = messageContent + "<br>" + Autolinker.link(_ui_.mget(_a.message));
  }

  if (messageType === _a.call) {
    let formattedTime;
    let icon = 'raw-phone-up';
    switch (callStatus) {
      case _a.cancel:
        icon = 'raw-phone';
        messageContent = LOCALE.MISSED_CALL;
        break;

      case 'reject':
        icon = 'raw-phone';
        messageContent = LOCALE.CALL_DECLINED;
        break;

      case 'call_accepted': case 'leave':
        icon = 'raw-phone-up';

        var total_seconds = parseInt(Math.floor(callDuration / 1000));
        var total_minutes = parseInt(Math.floor(total_seconds / 60));
        var seconds = parseInt(total_seconds % 60);

        formattedTime =
          (total_seconds === 0) ?
            ''
            : (total_minutes < 1) ?
              seconds + '&nbsp' + 'secs'
              : (total_minutes === 1) ?
                '1 min'
                :
                total_minutes + '&nbsp' + 'mins';

        messageContent = LOCALE.INCOMING_CALL;
        if (author === 'me') {
          messageContent = LOCALE.OUTGOING_CALL;
        }
        break;
    }

    message = Skeletons.Box.X({
      className: `${chatItemFig}__conversation ${author} ${messageType}-type`,
      kids: [
        Skeletons.Button.Svg({
          ico: icon,
          className: `${chatItemFig}__icon_phone icon`
        }),
        Skeletons.Note({
          className: `${chatItemFig}__call_text ${author}`,
          escapeContextmenu: true,
          content: messageContent || ' ',
          formItem: _a.author,
          name: _a.author,
          value: _ui_.mget(_a.author)
        }),

        Skeletons.Note({
          className: `${chatItemFig}__call-duration ${author}`,
          content: formattedTime
        })
      ]
    });
  } else {
    message = Skeletons.Note({
      className: `${chatItemFig}__conversation selectable-text ${author}`,
      content: messageContent.nl2br() || ' ',
      formItem: _a.author,
      name: _a.author,
      escapeContextmenu: true,
      value: _ui_.mget(_a.author),
      escapeContextmenu: true
    });
  }


  return message;
};

module.exports = __skl_widget_message;