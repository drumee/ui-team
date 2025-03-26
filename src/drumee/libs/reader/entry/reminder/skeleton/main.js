/**
 * The maximum number of characters allowed 
 * in the <input> element. Default value is 524288
 */
const max_leng = 524288;
const __entry_reminder = function (_ui_) {
  let label, reminder;
  const ph = _ui_.mget(_a.placeholder) || LOCALE.ENTER_TEXT;
  let entry = Skeletons.Entry({
    name: _a.email,
    className: `${_ui_.fig.family}__component`,
    placeholder: ph,
    inputClass: "entry-area",
    sys_pn: "ref-entry",
    mode: _ui_.mget(_a.mode) || _a.commit,
    require: _ui_.mget(_a.require),
    type: _ui_.mget(_a.type),
    name: _ui_.mget(_a.name) || _a.string,
    minlength: _ui_.mget(_a.minlength) || 0,
    maxlength: _ui_.mget(_a.maxlength) || max_leng,
    preselect: _ui_.mget(_a.preselect),
    error_box: _ui_.mget(_a.error_box) || require("./error-box")(_ui_),
    autocomplete: _ui_.mget('autocomplete'),
    formcomplete: _ui_.mget('formcomplete'),
    interactive: _ui_.mget('interactive') || 0,
    uiHandler: [_ui_],
    value: _ui_.mget(_a.value),
    validators: _ui_.mget("validators"),
    min: _ui_.mget(_a.min) || '',
    max: _ui_.mget(_a.max) || '',
    api: _ui_.mget(_a.api),
    hidden: _ui_.mget(_a.hidden),
    onlyKeyboard: 1,
    readonly: _ui_.mget("readonly")
  });

  if (_ui_.mget(_a.label)) {
    label = Skeletons.Note({
      content: _ui_.mget(_a.label),
      className: `${_ui_.fig.family}__label`,
      sys_pn: "ref-label"
    });
  }

  if (_ui_.mget('reminder')) {
    reminder = Skeletons.Note({
      content: _ui_.mget(_a.placeholder),
      className: `${_ui_.fig.family}_reminde`,
      sys_pn: "ref-label"
    });
  }


  if (_ui_.mget(_a.vendorOpt) != null) {
    entry = _.merge(entry, _ui_.mget(_a.vendorOpt));
  }

  let mainClass = "";
  if (_ui_.mget('showError')) {
    mainClass = " showerror";
  }

  let inputWrap = entry;
  if (_ui_.mget('prefix') || _ui_.mget('suffix')) {
    inputWrap = Skeletons.Box.X({
      className: `${_ui_.fig.family}__input-wrap`,
      kids: [entry]
    });
    if (_ui_.mget('prefix')) {
      inputWrap.kids.unshift(_ui_.mget('prefix'));
    }
    if (_ui_.mget('suffix')) {
      inputWrap.kids.push(_ui_.mget('suffix'));
    }
  }


  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__main ${mainClass}`,
    kids: [inputWrap]
  });

  if (label != null) {
    a.kids.unshift(label);
  }

  if (reminder != null) {
    a.kids.push(placeholder);
  }

  if (_ui_.mget('showError')) {
    const showError = Skeletons.Note({
      content: '',
      className: `${_ui_.fig.family}_error`,
      sys_pn: "ref-error"
    });
    a.kids.push(showError);
  }

  if (_ui_.mget(_a.shower)) {
    const icon = Skeletons.Button.Svg({
      ico: "desktop_hidepassword",
      sys_pn: "ref-shower",
      className: `${_ui_.fig.family}__icon pw-shower`,
      service: _e.show,
      state: 1
    });

    a.kids.push(icon);
  }

  return a;
};
module.exports = __entry_reminder;
