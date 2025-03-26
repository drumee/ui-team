const _state = {
  0         : 0,
  1         : 1,
  false     : 0,
  true      : 1,
  no        : 0,
  yes       : 1,
  undefined : 0
};
//-------------------------------------
//
// UI.Button.Trigger
//-------------------------------------
class __btn_toggle extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.toggle = this.toggle.bind(this);
    this.getState = this.getState.bind(this);
    this.getData = this.getData.bind(this);
    this.setCount = this.setCount.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.button.toggle;
    this.prototype.className  = "widget button-toggle";
    this.prototype.events = {
      mousemove  : '_hover',
      mouseleave : '_leave'
    };
      //click      : '_click'
    this.prototype.ui = {
      label      : '.label',
      picto      : '.picto',
      value      : '.value',
      count      : '.count'
    };
  }


// ===========================================================
// #  _channelEvent
//
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  initialize(opt){
    super.initialize(opt);
    this.model.atLeast({
      state     : 0,
      value     : 0,
      content   : _K.char.empty,
      label     : _K.char.empty,
      justify   : this.get(_a.justify) || _a.left,
      countClass : _K.char.empty,
      innerClass : _K.char.empty,
      pictos    : {
        0       : _K.char.empty, //_p.circle_o
        1       : _K.char.empty
      }
    }); //_p.dot_circle_o
    const state = this.model.get(_a.state);
    this.model.set(_a.picto, this.get(_a.pictos)[state]);
    this.model.set(_a.state, _state[state]);
    return this.model.set(_a.widgetId, _.uniqueId('toggle-'));
  }
//    @_channel = @model.get(_a.channel)
// ========================
//
// ========================

// ===========================================================
// onClick
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
//  _channelEvent:(data)=>
//    switch @_channel.action
//      when _a.setData
//        if _.isArray @_channel.fields
//          for k in @_channel.fields
//            @model.set k, data[k]
//      when _a.regexp
//        state = data[@_channel.name].match @_channel.expect
//      else
//        state = data[@_channel.name] is @_channel.expect
//    if @_channel.refresh
//      @render()
//
//    return
//
//
//    #@debug "EAEAEAAEAE 333", render, @, @model.get(_a.channel), value
//    if @model.get('expected')?
//      if value.match(@model.get('expected'))
//        state = 1
//      else
//        state = 0
//      @model.set
//        state: state
//      @$el.attr _a.data.state, state
//      @debug "EAEAEAAEAE 888", value, @model.get('expected'), state
//      return
//
//    if _.isObject value
//      @model.set value
//    else if _.isBoolean value
//      state = _state[value]
//      #@debug "EAEAEAAEAE 4444", @model.get(_a.channel), state
//      @model.set
//        state: state
//      @$el.attr _a.data.state, state
//    else
//      @model.set _a.content, value
//
//    if not render
//      return
//    @render()
// ========================
//
// ========================

// ===========================================================
// onRender
//
// ===========================================================
  onClick(e){
//    e.stopImmediatePropagation()
//    e.stopPropagation()
    _dbg("Toggle _click", this);
    const prev = parseInt(this.model.get(_a.state));
    const cur  = 1^prev;
    this.model.set({
      value: cur,
      state: cur
    });
    this.$el.attr(_a.data.state, cur);
    try {
      this.ui.picto.removeClass(this.get(_a.pictos)[prev]);
      this.ui.picto.addClass(this.get(_a.pictos)[cur]);
      this.ui.picto.attr(_a.data.state, cur);
    } catch (error) {}
    this.trigger(_e.callback);
    const signal = this.get(_a.signal) || _e.update;
    const ui = this._handler.ui || this.parent._handler.ui;
    if ((ui != null) && signal) {
      this.debug(">>MM QQQ post Button.Toggle handler 1", signal, ui);
      ui.triggerMethod(signal, this);
    }
    if (this.model.get(_a.radio) === _a.on) {
      this.trigger(_a.radio);
    }
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onRender(){
    let state = this.model.get(_a.state);
    this.model.set(_a.picto, this.get(_a.pictos)[state]);
    if (!this.model.get(_a.value)) {
      this.ui.count.attr(_a.data.hide, _a.yes);
    }
    state = this.model.get(_a.state);
    return this.$el.attr(_a.data.state, state);
  }
// ========================
//
// ========================

// ===========================================================
// toggle
//
// @param [Object] refresh=no
//
// ===========================================================
  onDomRefresh(){
    return this.declareHandlers(); //s()
  }
//    state = @model.get _a.state
//    @$el.attr _a.data.state, state
//    @$el.attr "data-spin", state
// ========================
//
// ========================

// ===========================================================
// getState
//
// @return [Object] 
//
// ===========================================================
  toggle(refresh){
    if (refresh == null) { refresh = false; }
    const prev = parseInt(this.model.get(_a.state));
    const cur  = 1^prev;
    this.model.set({
      value: cur,
      state: cur
    });
    if (refresh) {
      this.render();
      this.$el.attr(_a.data.state, cur);
      try {
        this.ui.picto.removeClass(this.get(_a.pictos)[prev]);
        this.ui.picto.addClass(this.get(_a.pictos)[cur]);
        return this.ui.picto.attr(_a.data.state, cur);
      } catch (error) {}
    }
  }
// ========================
//
// ========================

// ===========================================================
// getData
//
// @return [Object] 
//
// ===========================================================
  getState(){
    const state = this.model.get(_a.state);
    if (_state[state] != null) {
      return _state[state];
    }
    return 0;
  }
// ============================
//
// ============================

// ===========================================================
// setCount
//
// @param [Object] val
//
// ===========================================================
  getData(){
    this.debug("getData", this);
    return {name:this.model.get(_a.name), value:this.model.get(_a.state)};
  }
// ========================
//
// ========================
// ===========================================================
  setCount(val){
    this.ui.value.text(val);
    const state = this.model.set(_a.value, val);
    if (val) {
      return this.ui.count.attr(_a.data.hide, _a.no);
    } else {
      return this.ui.count.attr(_a.data.hide, _a.yes);
    }
  }
}
__btn_toggle.initClass();
module.exports = __btn_toggle;
