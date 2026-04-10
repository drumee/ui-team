/**
 * 
 * @param {*} ui 
 * @param {*} data 
 */
function get_event(ui, data) {
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
    case "contact.invite":
      return "{0} invited you to join his/her network".format(ui.mget(_a.firstname))
    case "chat.post":
      return "sent you {0} messages".format(ui.mget("cnt"))
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
    <span id="${eventId}-event" class="${pfx}-event"> ${get_event(ui, data)}</span>
    <span id="${nid}-filename" class="${pfx}-filename"> ${filename}</span>
  `
}

function get_preview(ui, preview, data) {
  const ctime = preview.ctime || new Date().getTime();
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
        service: data.service || ui.mget(_a.service),
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
}

module.exports = function (ui) {
  const data = ui.model.toJSON()
  let preview = {};
  switch (data.type) {
    case "chat":
    case "invitation":
      preview = Skeletons.UserProfile(data.contact)
      return get_preview(ui, preview, data.contact)
    default:
      preview = data.src;
      if (data.dest?.nid) {
        preview = data.dest;
      }
      if(!preview){
        return get_preview(ui, { kind: 'blank' }, data)
      }
      preview.kind = 'media_grid';
      preview.mode = _a.vignette;
      preview.uiHandler = Wm
      preview.service = 'open-node'
      return get_preview(ui, preview, data)
  }
  // return get_preview(ui, { kind: 'blank' }, data)
};

