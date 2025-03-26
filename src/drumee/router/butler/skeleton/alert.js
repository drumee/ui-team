
const _alert = function(_ui_, content, opt) {
  let body;
  if (opt == null) { opt = {}; }
  const yes_opt = { 
    contentClass : _C.margin.auto,
    className    : 'popup__btn popup__btn--remove-page popup__btn--success',
    service      : _e.close
  };
  if (_.isString(content)) {
    body = Skeletons.Note({
      className : `${_ui_.fig.family}__message info my-30`,
      content,
      service   : _e.close
    });
  } else { 
    body = content;
  }
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug     : __filename, 
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title mb-20`,
        content   : opt.title || LOCALE.UNKNOWN_ERROR
      }),
      body, 
      Skeletons.Box.X({
        kids:[
          Skeletons.Note({
            className : `${_ui_.fig.family}__button u-jc-center overflow-text go`,
            content   :  opt.button || 'OK', //LOCALE.CLOSE
            service   : _e.close 
            // ui        : _ui_
          })
        ]
      })
    ]});
  return a;
};
module.exports = _alert;
