
const Actions = {
  "file.changed": LOCALE.CHANGED,
  "file.created": LOCALE.UPLOADED,
  "file.deleted": LOCALE.DELETED,
  "file.moved": LOCALE.MOVED,
  "file.renamed": LOCALE.RENAMED,
  "folder.changed": LOCALE.CHANGED,
  "folder.created": LOCALE.CREATED,
  "folder.deleted": LOCALE.DELETED,
  "folder.moved": LOCALE.MOVED,
  "folder.renamed": LOCALE.RENAMED,
  "media.copy": LOCALE.COPIED,
  "media.init": LOCALE.DOWNLOADED,
  "media.make_dir": LOCALE.CREATED,
  "media.move": LOCALE.MOVED,
  "media.new": LOCALE.DOWNLOADED,
  "media.remove": LOCALE.DELETED,
  "media.rename": LOCALE.RENAMED,
  "media.replace": LOCALE.CHANGED,
  "media.rotate": LOCALE.CHANGED,
  "media.trash": LOCALE.DELETED,
  "media.upload": LOCALE.DOWNLOADED,
}

/**
 * 
 * @param {*} ui 
 * @param {*} type 
 * @param {*} target 
 * @param {*} count 
 * @returns 
 */
function changelogItem(ui) {
  let name = ui.mget(_a.name);
  let { dest, src } = ui.mget(_a.args) || {};
  let { filepath } = src || {};
  if (!filepath) {
    filepath = ui.mget(_a.filepath);
  }
  const fig = `${ui.fig.family}`;
  let el = Skeletons.Box.X({
    className: `${fig}__content`,
    nid: ui.mget(_a.nid),
    kids: [
      Skeletons.Button.Svg({
        ico: 'new_sync',
        className: `${fig}__content-icon`,
        service: "accept-sync",
        uiHandler: [ui]
      }),
      Skeletons.Note({
        className: `${fig}__content-action`,
        content: Actions[name] || name,
      }),
      Skeletons.Note({
        className: `${fig}__content-filename`,
        content: `~${filepath}`
      }),
    ]
  });

  if (!dest || !dest.filepath) {
    return el
  }

  let dest_path = dest.filepath;
  if (/\.move/.test(name)) {
    dest_path = dest_path.split(/\/+/);
    dest_path.pop();
    dest_path = `~${dest_path.join('/')}`;
  } else if (/\.rename/.test(name)) {
    dest_path = dest_path.split(/\/+/);
    dest_path = dest_path.pop();
  } else {
    dest_path = `~${dest_path}`;
  }
  el.kids.push(
    Skeletons.Note({
      className: `${fig}__content-filename dest`,
      partHandler: ui,
      content: dest_path
    })
  )
  return el
}

module.exports = changelogItem;