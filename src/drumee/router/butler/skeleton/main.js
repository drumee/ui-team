
const __skl_login = function(_ui_) {
  let a;
  const cross_options = {
    height  : 48,
    width   : 48,
    padding : 16
  };

  const top_bar = {
    kind: KIND.box,
    flow: _a.vertical, 
    className: "u-ai-center",
    kids: [
      Skeletons.Note(LOCALE.LOG_IN, `${_ui_.fig.family}__title mb-14`)
    ]
  };

  return a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__main`,
    debug       : __filename,
    kids        : [
      top_bar,
      Skeletons.Box.Y({
        className : "u-ai-center",
        styleOpt  : {
          width   : 300,
          height  : _a.auto
        },
        kids      : require('./entries')(_ui_) 
      }),
      Skeletons.Box.Y({
        className : "u-ai-center",
        justify   : _a.right,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__button btn u-jc-center go`,
            //ui        : _ui_ 
            service   : "log-in",
            content   : LOCALE.GO
          })
        ]
      }),
      Skeletons.Box.X({
        className : "u-jc-sb",
        styleOpt  : {
          width   : 220
        },
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__button link forgot-pw`,
            //ui        : _ui_ 
            href      : "#/welcome/reset", 
            content   : LOCALE.Q_FORGOT_PASS_PHRASE
          }),
          Skeletons.Note({
            className : `${_ui_.fig.family}__button link no-account`,
            href      : "#/welcome/signup", 
            content   : LOCALE.Q_NO_ACCOUNT
          })
        ]
      })
    ]});
};
module.exports = __skl_login;
