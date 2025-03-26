const message = function(_ui_, content, type) {
  let body;
  if (_.isString(content)) {
    body = Skeletons.Note({
      className : `${_ui_.fig.family}__message ${type} my-30`,
      content,
      service   : _e.close
    });
  } else { 
    body = content;
  }
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug     : __filename, 
    sys_pn : "container",
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title mb-20`,
        content   : type
      }),
      body, 
      Skeletons.Box.X({
        kids:[
          Skeletons.Note({
            className : `${_ui_.fig.family}__button action u-jc-center overflow-text go`,
            content   : LOCALE.CLOSE,
            service   : _e.close 
            // ui        : _ui_
          })
        ]
      })
    ]});
  return a;
};
module.exports = message;
