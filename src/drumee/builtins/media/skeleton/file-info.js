const { filesize } = require("core/utils")

const _row = function (_ui_, c1, c2) {
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

const _time = function (_ui_, name) {
  const {
    stats
  } = _ui_.info;

  let t = stats[name];
  if (t != null) {
    t = Dayjs.unix(t).fromNow() || '---';
  } else {
    t = '---';
  }
  return t;
};

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const __player_fileinfo = function (_ui_) {
  const {
    stats
  } = _ui_.info;
  let infoStatus = null;
  if (_ui_.mget(_a.status) === _a.locked) {
    infoStatus = Skeletons.Box.X({
      className: "info-status",
      kids: [
        Skeletons.Button.Svg({ className: "icon", ico: "protected-lock" }),
        Skeletons.Note({ content: LOCALE.NON_ERASABLE, className: "text" })
      ]
    })
  }
  let pageInfo = null;
  if (_ui_.mget(_a.filetype) === _a.document) {
    pageInfo = _row(_ui_, LOCALE.NO_PAGES, _ui_.info.pages.toString());
  }
  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.group}__info-container`,
    volatility: 2,
    kids: [
      infoStatus,
      _row(_ui_, LOCALE.SIZE, filesize(stats.filesize)),
      pageInfo,
      _row(_ui_, LOCALE.CREATE_AT, _time(_ui_, _a.ctime)),
      _row(_ui_, LOCALE.LAST_ACCESS, _time(_ui_, _a.atime)),
      _row(_ui_, LOCALE.LAST_CHANGE, _time(_ui_, _a.mtime))
    ]
  });

  return a;
};

module.exports = __player_fileinfo;
