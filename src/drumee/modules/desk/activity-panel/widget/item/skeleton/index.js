/**
 * 
 * @param {*} ui 
 * @param {*} data 
 */
function get_event(data) {
  let preview = data.src;
  if (data.dest?.nid) {
    preview = data.dest;
  }
  switch (data.event) {
    case "media.new":
      if ([_a.folder, _a.hub].includes(preview.ftype)) {
        return LOCALE.CREATED_FOLDER
      }
      return LOCALE.UPLOADED_FILE;
    case "media.remove":
      if ([_a.folder, _a.hub].includes(preview.ftype)) {
        return LOCALE.REMOVED_X.format(LOCALE.FOLDER.toLowerCase())
      }
      return LOCALE.REMOVED_X.format(LOCALE.FILE.toLowerCase());
    case "media.rename":
      return LOCALE.RENAME
    default:
      return data.event;
  }
}

/**
 * 
 * @param {*} ui 
 * @param {*} data 
 * @returns 
 */
function content(ui, data) {
  const pfx = `${ui.fig.family}__summary`;
  const { fullname, src, uid, event, id: eventId } = data;
  let { filename = "", id: nid } = src || {};
  if (filename.length > 30) {
    filename = `...${filename.slice(filename.length - 30)}`
  }
  return `
    <span id="${uid}-username" class="${pfx}-username"> ${fullname}</span>
    <span id="${eventId}-event" class="${pfx}-event"> ${get_event(data)}</span>
    <span id="${nid}-filename" class="${pfx}-filename"> ${filename}</span>
  `
}

module.exports = function (ui) {
  const data = ui.model.toJSON()
  let preview = data.src;
  if (data.dest?.nid) {
    preview = data.dest;
  }
  preview.kind = 'media_grid';
  preview.mode = _a.preview;

  const ctime = preview.ctime || 0;
  const m = Dayjs.unix(ctime);
  const pfx = ui.fig.family;
  return Skeletons.Box.G({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__preview-container`,
        kids: [
          preview,
        ]
      }),
      Skeletons.Box.Y({
        className: `${pfx}__summary`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__event`,
            content: content(ui, data)
          }),
          Skeletons.Note({
            className: `${pfx}__date`,
            content: m.format(Visitor.timeformat())
          }),

        ]
      }),
    ]
  });

  return a;
};

