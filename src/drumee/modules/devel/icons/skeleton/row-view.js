/**
 * 
 * @param {*} _ui_ 
 * @param {*} data 
 * @returns 
 */
const __log_row = function (_ui_, data) {
  const a = [];
  for (var d of Array.from(data)) {
    a.push(Skeletons.Box.X({
      className: `${_ui_.fig.family}__row`,
      debug: __filename,
      state: 1,
      name: d,
      service: _e.copy,
      code: d,
      uiHandler: [_ui_],
      kids: [
        Skeletons.Note({
          content: d,
          active: 0,
          className: `${_ui_.fig.family}__text`
        }),
        Skeletons.Button.Svg({
          ico: d,
          className: `${_ui_.fig.family}__icon`,
          active: 0
        })
      ]
    }));
  }
  return a;
};
module.exports = __log_row;
