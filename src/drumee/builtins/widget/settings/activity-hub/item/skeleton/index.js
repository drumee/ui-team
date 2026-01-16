/**
 * Get event text from activity data
 */
function get_event(data) {
  let preview = data.src;
  if (data.dest?.nid) {
    preview = data.dest;
  }
  switch (data.event) {
    case "media.new":
      if ([_a.folder, _a.hub].includes(preview.ftype)) {
        return LOCALE.CREATED_FOLDER || "created folder";
      }
      return LOCALE.UPLOADED_FILE || "uploaded file";
    case "media.remove":
      if ([_a.folder, _a.hub].includes(preview.ftype)) {
        return (LOCALE.REMOVED_X || "removed {0}").format(LOCALE.FOLDER?.toLowerCase() || "folder");
      }
      return (LOCALE.REMOVED_X || "removed {0}").format(LOCALE.FILE?.toLowerCase() || "file");
    case "media.rename":
      return LOCALE.RENAME || "renamed";
    case "media.view":
      return "viewed the file";
    case "media.share":
      return "invited you to view the file";
    default:
      return data.event || "";
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(ctime) {
  if (!ctime) return "";
  const m = Dayjs.unix(ctime);
  return m.format(Visitor.timeformat());
}

module.exports = function (ui) {
  const data = ui.model.toJSON();
  const pfx = ui.fig.family;
  
  const { fullname, src, uid, event, id: eventId } = data;
  let preview = data.src;
  if (data.dest?.nid) {
    preview = data.dest;
  }
  
  let { filename = "", id: nid } = src || {};
  if (filename.length > 30) {
    filename = `...${filename.slice(filename.length - 30)}`;
  }
  
  const eventText = get_event(data);
  const ctime = preview.ctime || data.ctime || 0;
  const timestamp = formatTimestamp(ctime);
  
  // Build sender text (name or email)
  const senderText = fullname || data.email || data.uid || "Someone";
  
  // Prepare preview for thumbnail
  const previewData = { ...preview };
  previewData.kind = 'media_grid';
  previewData.mode = _a.vignette;
  previewData.uiHandler = ui.mget(_a.uiHandler) || [ui];
  previewData.service = 'open-node';
  
  // Check if file tag should be shown (for CSV files or specific types)
  const showTag = filename && (filename.includes("CSV") || filename.includes(".numbers"));
  
  return Skeletons.Box.X({
    className: `${pfx}__container`,
    debug: __filename,
    sys_pn: `activity-item-${eventId || nid}`,
    kids: [
      // Avatar/Icon (left side) - Cloud icon
      Skeletons.Box.Y({
        className: `${pfx}__avatar-container`,
        kids: [
          Skeletons.Button.Svg({
            ico: "logo-upload",
            className: `${pfx}__avatar`,
          }),
        ],
      }),
      // Main content (middle)
      Skeletons.Box.Y({
        className: `${pfx}__content`,
        kids: [
          // Sender + Action + File name
          Skeletons.Note({
            className: `${pfx}__text`,
            content: `${senderText} ${eventText} **${filename}**`,
          }),
          // File tag (optional - only if needed)
          showTag ? Skeletons.Box.X({
            className: `${pfx}__tag-wrapper`,
            kids: [
              Skeletons.Button.Svg({
                ico: "tag",
                className: `${pfx}__tag-icon`,
              }),
              Skeletons.Note({
                className: `${pfx}__tag-text`,
                content: filename,
              }),
            ],
          }) : null,
          // Timestamp
          Skeletons.Note({
            className: `${pfx}__timestamp`,
            content: timestamp,
          }),
        ].filter(Boolean),
      }),
      // File thumbnail (right side)
      Skeletons.Box.Y({
        className: `${pfx}__thumbnail-container`,
        kids: [
          previewData,
        ],
      }),
    ],
  });
};

