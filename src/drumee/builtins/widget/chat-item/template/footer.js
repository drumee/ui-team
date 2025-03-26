// ==================================================================== *
const __chat_item_footer = function(m) {
  let date = Dayjs.unix(m.ctime).locale(Visitor.language()).format("HH:mm");
  html = `<div class="${m.fig}__message-footer ${m.author}"  id="${m.widgetId}-footer">
  <div class="${m.fig}__message-date ${m.author}"> ${date} </div>
  <div id="readstatus-${m.widgetId}" class="${m.fig}__icon-read readed-icon ${m.author}" data-is_readed="${m.is_readed}" data-is_seen="${m.is_seen}" >
      <svg class="full inner drumee-picto svg-inner">
        <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-chat_message_status"></use>
      </svg>
    </div>
  </div>`;

  return html;
};

module.exports = __chat_item_footer;
