

const _skeleton =function(_ui_){
  let a;
  const opt   = _ui_.mget(_a.vendorOpt);
  const innerClass = _ui_.mget(_a.innerClass) || '';
  let state = 0;
  if (_ui_.mget(_a.initialState) != null) {
    state = _ui_.mget(_a.initialState);
  } else { 
    state = _ui_.mget(_a.state);
  }

  return a = [
    Skeletons.Note({
      content       : opt[0].label,
      className     : `${_ui_.fig.family}__toggle off ${innerClass}`,
      uiHandler     : [_ui_],
      state,
      index         : 0
    }),
    Skeletons.Note({
      className     : `${_ui_.fig.family}__toggle change`,
      state,
      uiHandler     : [_ui_],
      service       : _a.toggle
    }),
    Skeletons.Note({
      content       : opt[1].label,
      className     : `${_ui_.fig.family}__toggle on ${innerClass}`,
      // radio         : radio
      state,
      uiHandler     : [_ui_],
      index         : 1
    })
  ];
};

class __button_switch extends LetcBox {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this._id = _.uniqueId('switch-');
    this.model.set(_a.widgetId, this._id);

    this.model.atLeast({
      innerClass : _K.char.empty,
      label      : _K.char.empty,
      flow       : _a.x,
      values     : [0,1]});
    this.declareHandlers();
  }


  /**
   * 
   * @returns 
   */ 
  onDomRefresh() {
    this.feed(_skeleton(this));  
    const sw = this.children.findByIndex(1);
    sw.setState(this.mget(_a.state));
    return this.setState(this.mget(_a.state));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd){
    let i;
    const values = this.mget(_a.values);
    if (cmd.get(_a.service) === _a.toggle) {
      i = this.mget(_a.state)^1;
    } else {
      i = cmd.mget(_a.index);
    }
    this.setState(i);
    this.model.set({ 
      state : i,
      value : values[i]});
    const sw0 = this.children.findByIndex(0);
    sw0.setState(i);
    const sw2 = this.children.findByIndex(2);
    sw2.setState(i);
    const sw = this.children.findByIndex(1);
    sw.setState(i);
    this.triggerHandlers();
  }
}

module.exports = __button_switch;
