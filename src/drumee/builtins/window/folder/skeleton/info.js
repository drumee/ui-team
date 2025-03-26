const { filesize } = require('core/utils');
const _row = function (_ui_, c1, c2) {
  if (c2 == null) { c2 = ""; }
  const cn = "info-item";
  const x1 = Skeletons.Note({ content: c1, className: cn });
  const x2 = Skeletons.Note({ content: c2, className: `${cn} value` });

  const a = Skeletons.Box.X({
    className: "u-jc-sb",
    kids: [x1, x2]
  });
  return a;
};

/**
 * 
 * @param {*} _ui_ 
 * @param {*} data 
 * @returns 
 */
const __folder_info = function (_ui_, data) {
  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__info-container`,
    volatility: 2,
    kids: [
      _row(_ui_, LOCALE.TOTAL_SIZE, filesize(data[0].total_size))
    ]
  });
  if (_ui_.mget(_a.status) === _a.locked) {
    a.kids.unshift(Skeletons.Box.X({
      className: "info-status",
      kids: [
        Skeletons.Button.Svg({ className: "icon", ico: "protected-lock" }),
        Skeletons.Note({ content: LOCALE.NON_ERASABLE, className: "text" })
      ]
    }));
  }
  const details = data[2] || [];
  for (var s of Array.from(details)) {
    if (!([_a.hub, _a.folder].includes(s.category))) {
      var label = LOCALE[s.category.toUpperCase()] || s.category;
      a.kids.push(_row(_ui_, label, filesize(s.size_per_type)));
    }
  }

  return a;
};

module.exports = __folder_info;
