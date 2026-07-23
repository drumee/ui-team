// ==================================================================== *
const __chat_item_username = function (m) {
  // metadata is no longer read here: the caller/callee side now comes from
  // `m.author` (see below). The old `JSON.parse(m.metadata)` also threw on the
  // live WS push, where metadata arrives already parsed — which killed the
  // whole row's render.
  let icon = 'raw-app-call-end';
  // Badge modifier — empty for the default muted badge, `declined` for the red
  // one. Kept as a class rather than inline style so the skin owns the colours.
  let badgeMod = '';
  let text = LOCALE.OUTGOING_CALL;
  let duration = '';
  switch (m.call_status) {
    case _a.cancel:
      text = LOCALE.MISSED_CALL;
      break;
    case 'reject':
      // NORMALIZED symbol (no `raw-` prefix) on purpose: the raw sprite keeps
      // the source `fill="black"` on the path, and <use> clones into a shadow
      // tree that document CSS cannot reach — so the white fill would never
      // apply. The normalized build strips fill (icons/build.js `cleanup`).
      icon = 'app-call-end'
      badgeMod = 'declined';
      text = LOCALE.CALL_DECLINED;
      break;
    case 'accepted':
    case 'leave':
      text = LOCALE.INCOMING_CALL;
      let total_seconds = parseInt(Math.floor(m.call_duration / 1000));
      let total_minutes = parseInt(Math.floor(total_seconds / 60));
      let seconds = parseInt(total_seconds % 60);
      // A p2p call log is ONE row shared by both parties (author_id = caller),
      // so `role` in the stored metadata always reads "caller" and can't tell
      // the sides apart. `author` is resolved per viewer by chat-item
      // (_resolveAuthor: author_id === Visitor.id ? "me" : "other"), which is
      // correct for the shared row and for the older per-copy rows alike.
      if (m.author === _a.me) {
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
  // Rendered as a muted card matching the ENDED meeting-event card
  // (__meeting-card.end): grey badge + bold title + hairline grey status dot,
  // a secondary subtitle line, and a disabled outcome pill. A logged call is
  // always a past event, so there is no "live" (brand-coloured) variant.
  //
  // Slot mapping against the meeting card:
  //   title  ← call outcome ("Outgoing call" / "Missed call" / ...)
  //   sub    ← call duration (empty for missed / declined / 0s calls)
  const xlink = 'xmlns:xlink="http://www.w3.org/1999/xlink"';

  html = `<div class="${m.fig}__conversation ${m.author} call-type">
    <div class="${m.fig}__call-card ${m.author}">
      <div class="${m.fig}__call-card-head">
        <div class="${m.fig}__call-card-badge ${badgeMod}" data-is_readed="${m.is_readed}" data-is_seen="${m.is_seen}">
          <svg class="${m.fig}__call-card-ico"><use ${xlink} xlink:href="#--icon-${icon}"></use></svg>
        </div>
        <div class="${m.fig}__call-card-text">
          <span class="${m.fig}__call-card-title">${text}</span>
          <span class="${m.fig}__call-card-sub">${duration}</span>
        </div>
      </div>
    </div>
  </div>`;

  return html;
};

module.exports = __chat_item_username;
