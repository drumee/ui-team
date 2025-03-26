const { filesize } = require("core/utils")

const _row = function (ui, c1, c2) {
  let x2;
  if (c2 == null) { c2 = ""; }
  const cn = "info-item";
  const x1 = Skeletons.Note(c1, cn);
  if (_.isObject(c2)) {
    x2 = Skeletons.Note(c2);
    x2.className = cn;
  } else {
    x2 = Skeletons.Note(c2, `${cn} value`);
  }

  const a = Skeletons.Box.X({
    className: "u-jc-sb",
    kids: [x1, x2]
  });
  return a;
};

const _time = function (ui, name) {
  let t = ui.mget(name);
  if (t != null) {
    t = Dayjs.unix(t).fromNow() || '---';
  } else {
    t = '---';
  }
  return t;
};


/**
 * 
 * @param {*} ui 
 * @returns 
 */
const __player_fileinfo = function (ui) {
  let locked = null;
  if (ui.mget(_a.status) === _a.locked) {
    locked = Skeletons.Box.X({
      className: "info-status",
      kids: [
        Skeletons.Button.Svg({ className: "icon", ico: "protected-lock" }),
        Skeletons.Note({ content: LOCALE.NON_ERASABLE, className: "text" })
      ]
    });
  }
  let geometry = null;
  let geo = ui.mget(_a.geometry);
  if(/[1-9]+(.*x.*)[1-9]+/i.test(geo) ){
    geo = geo.replace(/[\"\']+/g, "")
    geometry = _row(ui, LOCALE.SIZE, geo)
  }
  let page_numbers = null;
  if(ui.mget(_a.filetype) === _a.document){
    page_numbers = _row(ui, LOCALE.NO_PAGES, ui.info.pages.toString());
  }
  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__info-container`,
    volatility: 2,
    kids: [
      _row(ui, LOCALE.FILENAME, ui.mget(_a.filename)),
      _row(ui, LOCALE.FILESIZE, filesize(ui.mget(_a.filesize))),
      locked,
      geometry,
      page_numbers,
      _row(ui, LOCALE.CREATE_AT, _time(ui, _a.ctime)),
      _row(ui, LOCALE.LAST_CHANGE, _time(ui, _a.mtime))
    ]
  });

  return a;
};

module.exports = __player_fileinfo;
