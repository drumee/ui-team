/**
 * Renders the folder-visible system card for "file.thread" events — posted by
 * channel.file_thread_post when a per-file chat thread is created. The WHOLE
 * card is clickable (data-service="open-file-thread" on the container, so a
 * click anywhere walks up to it — see getService). chat-item hydrates the
 * filename AND the badge preview thumbnail from SERVICE.channel.file_thread_info
 * after render (see _hydrateFileThreadCard), so rename/delete/move show the
 * CURRENT state rather than a historical snapshot.
 *
 * Layout (Figma 2216-170414): [file preview / paperclip badge] [ row1: filename
 * ........ Open thread →  /  row2: chat-icon N replies • time ]
 *
 * Expected fields on the message:
 *   - message_type: "file.thread"
 *   - metadata (JSON): { _file_nid, _file_thread_id, _file_thread_reply_count,
 *                        _file_thread_last_message_id, _file_thread_mtime }
 */
module.exports = function (m) {
  let md = m.metadata || {};
  if (typeof md === 'string') {
    try {
      md = JSON.parse(md);
    } catch (e) {
      md = {};
    }
  }

  const fileNid = md._file_nid || m.file_nid || '';
  const ftId = md._file_thread_id || m.file_thread_id || '';
  const replies = Number(md._file_thread_reply_count || 0);

  let when = '';
  const mtime = Number(md._file_thread_mtime || m.ctime || 0);
  if (mtime) {
    try {
      when = Dayjs.unix(mtime).fromNow();
    } catch (e) {
      when = '';
    }
  }

  const fig = m.fig;
  const openLbl = LOCALE.OPEN_THREAD || 'Open thread';
  // Singular/plural reply label.
  const repliesLbl =
    replies === 1 ? LOCALE.REPLY_ONE || 'reply' : LOCALE.REPLIES || 'replies';
  const xlink = 'xmlns:xlink="http://www.w3.org/1999/xlink"';

  const timePart = when
    ? `<span class="${fig}__ftc-dot">•</span><span class="${fig}__ftc-time">${when}</span>`
    : '';

  // Badge starts as a paperclip; _hydrateFileThreadCard swaps in the file's
  // vignette thumbnail (background-image) for image/vector files.
  // data-ft_available starts at "0": the card is NOT clickable until
  // _hydrateFileThreadCard gets an authoritative file_thread_info confirming the
  // thread exists and this viewer may still read the file. NOT_FOUND,
  // NO_PERMISSION, a failed fetch, and a live revocation all leave it at "0".
  // _openFileThread enforces the flag — this attribute is not a CSS-only hint.
  return `<div class="${fig}__file-thread-card"
        data-service="open-file-thread"
        data-ft_available="0"
        data-file_nid="${fileNid}"
        data-file_thread_id="${ftId}">
    <div class="${fig}__ftc-badge" id="ftc-badge-${m.widgetId}">
      <svg class="${fig}__ftc-badge-ico"><use ${xlink} xlink:href="#--icon-app-attachment"></use></svg>
    </div>
    <div class="${fig}__ftc-info">
      <div class="${fig}__ftc-top">
        <span class="${fig}__ftc-name" id="ftc-name-${m.widgetId}"></span>
        <span class="${fig}__ftc-open">${openLbl} →</span>
      </div>
      <div class="${fig}__ftc-meta">
        <svg class="${fig}__ftc-meta-ico"><use ${xlink} xlink:href="#--icon-chat-teardrop-dots"></use></svg>
        <span class="${fig}__ftc-replies">${replies} ${repliesLbl}</span>
        ${timePart}
      </div>
    </div>
  </div>`;
};
