// Placeholder rows shown in the bubble while the attachment cards are fetched.
//
// The cards are NOT rendered from the message model — the attachment list
// fetches them keyed on message_id (chat-item getAttachments), and for a
// message the viewer just sent that fetch cannot even start until the server
// echo brings the id back. Without something in the gap the bubble renders
// completely empty, which reads as a failed send rather than a pending one.
//
// One row per attachment, laid out to the real card's geometry (44px tile,
// 9px column gap, 6px between rows — see skin/attachment.scss), so the true
// cards replace these without moving anything. `count` is known at append
// time from the message's own attachment array, which is why the bubble can
// be the right size from the first frame.
const __chat_item_attachment_skeleton = function (m) {
  const row =
    `<div class="${m.fig}__attachment-skeleton-row">` +
      `<div class="${m.fig}__attachment-skeleton-tile"></div>` +
      `<div class="${m.fig}__attachment-skeleton-text">` +
        `<div class="${m.fig}__attachment-skeleton-name"></div>` +
        `<div class="${m.fig}__attachment-skeleton-meta"></div>` +
      `</div>` +
    `</div>`;

  // Decorative: it stands in for content that is not there yet, so there is
  // nothing here worth announcing.
  return `<div aria-hidden="true">${row.repeat(m.count)}</div>`;
};

module.exports = __chat_item_attachment_skeleton;
