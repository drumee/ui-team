// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *

const __libs_passmeter = function(_ui_) {
  const a = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__main`,
    sys_pn      : "wrapper-pw",
    kids : [

      Skeletons.EntryBox({
        uiHandler   : _ui_,
        type        : _a.password,
        className   : `${_ui_.fig.familyi}__entry`,
        service     : _e.submit, 
        placeholder : LOCALE.PASSWORD,
        mode        : _a.commit,
        sys_pn      : "ref-password",
        require     : _a.password, 
        interactive : 1,
        preselect   : 1,
        shower      : 1
      })
    ]});

  if (_ui_.mget('passmeter')) {
    a.kids.unshift(Skeletons.Box.X({
      className : `${_ui_.fig.familyi}__pw-meter wrapper`,
      kids : [
        Skeletons.Element({
          className : `${_ui_.fig.familyi}__pw-meter strength`,
          sys_pn    : "ref-pwm"
        })
      ]}));
  }

  return a;
};
module.exports = __libs_passmeter;
