// ==================================================================== *
const __chat_item_username = function (m) {
  let fullname = m.fullname || '??';
  let md = {};
  if (m.metadata) md = JSON.parse(m.metadata)
  let icon = 'raw-phone-up';
  let text = LOCALE.OUTGOING_CALL;
  let duration = '';
  switch (m.call_status) {
    case _a.cancel:
      text = LOCALE.MISSED_CALL;
      break;
    case 'reject':
      icon = 'raw-phone'
      text = LOCALE.CALL_DECLINED;
      break;
    case 'accepted':
    case 'leave':
      text = LOCALE.INCOMING_CALL;
      let total_seconds = parseInt(Math.floor(m.call_duration / 1000));
      let total_minutes = parseInt(Math.floor(total_seconds / 60));
      let seconds = parseInt(total_seconds % 60);
      if (md.role == _a.caller) {
        text = LOCALE.OUTGOING_CALL;
      }
      if (total_seconds == 0) {
        duration = '';
      } else if (total_minutes < 1) {
        duration = seconds + '&nbsp' + 'secs';
      } else if (total_minutes == 1) {
        duration = '1 min';
      } else {
        duration = total_minutes + '&nbsp' + 'mins';
      }

  }
  html = `<div class="${m.fig}__conversation ${m.author} call-type">
    <div class="${m.fig}__conversation-icon ${m.author}" data-is_readed="${m.is_readed}" data-is_seen="${m.is_seen}" >
      <svg class="full inner drumee-picto svg-inner">
        <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-${icon}"></use>
      </svg>
    </div>
    <div class="${m.fig}__conversation-content ${m.author}"> ${text} </div>
    <div class="${m.fig}__call-duration ${m.author}"> ${duration} </div>
  </div>`;

  return html;
};

module.exports = __chat_item_username;
