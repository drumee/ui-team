// ============================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/window 
//   TYPE : 
// ============================================================== *

const { copyToClipboard } = require("core/utils")

const __properties = function (_ui_, data) {
  let kids = [];
  const pfx = _ui_.fig.family;
  for (let k in data) {
    kids.push(Skeletons.Box.G({
      className: `${pfx}__properties-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__properties-attr`,
          content: k
        }),
        Skeletons.Note({
          className: `${pfx}__properties-value`,
          content: data[k]
        }),
        Skeletons.Button.Svg({
          className: `${pfx}__properties-icon`,
          ico: "desktop_copy",
          service: _e.copy,
          value: data[k]
        })
      ]
    }))
  }

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__properties-container`,
    kids: [
      Preset.Button.Close(_ui_, 'close-alert'),
      Skeletons.List.Smart({
        className: `${pfx}__properties-content`,
        kids
      }),
      Skeletons.Note({
        className: `${pfx}__properties-attr`,
        content: LOCALE.DOWNLOAD
      }),
    ]
  });

  return a;
};

module.exports = __properties;
