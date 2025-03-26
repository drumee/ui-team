const __security_item = function(_ui_) {
  
  const _status = _ui_.mget(_a.status);
  let _service = '';
  if (_status === _a.enable) {
    _service = _e.unlock;
  }
  
  let _value = _ui_.mget(_a.content) || _ui_.mget(_a.value);

  if (_ui_.mget(_a.type) === _a.mobile) {
    if (_.isEmpty(_value)) {
      _value = '';
    } else {
      const areacode = _ui_.mget('areacode') || '';
      _value = areacode + _value;
    }
  }
  
  const a = [
    Skeletons.Button.Svg({
      ico       : _ui_.mget(_a.icon),
      active    : 0,
      className : `${_ui_.fig.group}-pad__icon ${_ui_.fig.name}`
    }),


    Skeletons.Note({
      content   : _ui_.mget(_a.label),
      active    : 0,
      className : `${_ui_.fig.group}-pad__label`
    }),
    
    Skeletons.Note({
      content   : _value,
      active    : 0,
      className : `${_ui_.fig.group}-pad__value`
    }),

    Skeletons.Note({
      content   : _ui_.mget(_a.button) || LOCALE.CHANGE,
      service   : _service,
      className : `${_ui_.fig.group}-pad__button ${_ui_.fig.name} ${_status}`
    }),

    Skeletons.Wrapper.Y({
      name      : _a.tooltips,
      uiHandler     : _ui_,
      className : `${_ui_.fig.group}__tooltips`
    }) 
  ];
  
  return a; 
};

module.exports = __security_item;
