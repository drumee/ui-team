const __security_email = function(_ui_) {

  const pfx = 'entry';

  const input = { 
    kind         : KIND.entry_reminder,
    className    : `${_ui_.fig.group}-${pfx}__entry`,
    uiHandler        : _ui_,
    service      : _e.set,
    placeholder  : LOCALE.NEW_PHONE,
    //require      : _a.phone
    preselect    : 1,
    sys_pn       : "ref-input",
    autocomplete : _a.off
  };
    //shower      : 1

  const ok =  Skeletons.Note({
    className :`${_ui_.fig.group}-${pfx}__button btn--go`,
    content   : "Ok",
    flow      : _a.y, 
    service   : _e.set,
    uiHandler     : _ui_
  });

  const entries = Skeletons.Box.X({
    className: `${_ui_.fig.group}-${pfx}__input`,
    kids: [input, ok]});

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.group}-${pfx}__main u-jc-sb`,
    //sys_pn    : "ref-input"
    kids      : [
      Preset.Button.Close(_ui_),
      entries
    ]});


  return a;
};

module.exports = __security_email;
