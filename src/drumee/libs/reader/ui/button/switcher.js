const _skeleton =function(_ui_){
  let a, state;
  const opt   = _ui_.mget(_a.vendorOpt);
  const radio = `switch:${_ui_.cid}`;
  if (_ui_.mget(_a.initialState) != null) {
    state = _ui_.mget(_a.initialState);
  } else { 
    state = _ui_.mget(_a.state) || 0;
  }
  opt[0].state = state;
  opt[1].state = state^1;

  return a = [
    Skeletons.Note({
      content       : opt[0].label,
      className     : `editbox-toggle editbox-toggle--left ${_ui_.fig.family}__toggle left`,
      radio,
      // initialState  : opt[0].state
      uiHandler     : _ui_,
      index         : 0
    }),
    Skeletons.Note({
      content       : opt[1].label,
      className     : `editbox-toggle editbox-toggle--right ${_ui_.fig.family}__toggle right`,
      // signal        : _e.ui.event
      radio,
      // initialState  : opt[1].state
      uiHandler     : _ui_,
      index         : 1
    })
  ];
};


class __button_switcher extends LetcBox {

  static initClass() {
    this.prototype.fig  = 1;
  }

  initialize(opt) {
    super.initialize(opt);
    this._id = _.uniqueId('switch-');
    this.model.set(_a.widgetId, this._id);

    this.model.atLeast({
      innerClass : _K.char.empty,
      label      : _K.char.empty,
      flow       : _a.x,
      values     : [0,1]});
    return this.declareHandlers();
  }

// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    return this.feed(_skeleton(this));  
  }

// ===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// ===========================================================
  onUiEvent(cmd){
    const values = this.mget(_a.values);
    const i = cmd.mget(_a.index);
    this.model.set({ 
      state : i,
      value : values[i]});
    // @debug "RRRRRZ 59 >>DDD onUiEvent", @, cmd, i, values
    return this.triggerHandlers();
  }
}
__button_switcher.initClass();

module.exports = __button_switcher;
