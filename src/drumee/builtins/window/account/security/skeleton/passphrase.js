const __pass_phrase = function(_ui_) {
  const pfx = 'modal__tiny';

  const new_pw = { 
    kind        : KIND.entry_reminder,
    className   : `${_ui_.fig.group}-${pfx}__entry`,
    uiHandler       : _ui_,
    service     : "set-pass",
    type        : _a.pass,
    placeholder : LOCALE.PASS_PHRASE,
    require     : "any",
    sys_pn      : "ref-new-pass",
    shower      : 1
  };

  const ok =  Skeletons.Note({
    className :`${_ui_.fig.group}-${pfx}__button ml-20 btn--go`,
    content   : "Ok",
    flow      : _a.y, 
    service   : "set-pass",
    uiHandler     : _ui_
  });

  const entries = Skeletons.Box.X({
    className: `${_ui_.fig.family}__entry w-100 mt-40`,
    kids: [new_pw, ok]});

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.group}-${pfx}__main u-jc-sb`,
    sys_pn    : "ref-pass-pad",
    kids      : [
      Preset.Button.Close(_ui_, "close-pass"),
      entries
    ]});


  return a;
};

module.exports = __pass_phrase;
