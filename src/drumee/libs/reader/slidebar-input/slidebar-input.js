class __slidebar_input_ui extends LetcBox {
  constructor(...args) {
    super(...args);
    this.on_mousewheel = this.on_mousewheel.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onSlideStart = this.onSlideStart.bind(this);
    this.onSlideEnd = this.onSlideEnd.bind(this);
    this.updateValue = this.updateValue.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "slidebar-input-ui widget";
  }
// =================== *
// Proxied
// =================== *
//__behaviorSet: PROXY_CORE.behaviors

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    let range;
    super.initialize(opt);
    if (this.model.get(_a.vendorOpt) != null) {
      range = this.model.get(_a.vendorOpt).range || {min:0, max:100};
    }
    this.model.set(_a.range, range);
    this.model.atLeast({
      service : this.getOption(_a.service) || _a.styleOpt,
      name    : this.getOption(_a.name)    || _a.color,
      signal  : this.getOption(_a.signal)  || _e.ui.event,
      range   : {min:0, max:100}});

    this._alpha = 1;
    return this.declareHandlers(); //s(null, {recycle:yes, fork:yes})
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.feed(require('./skeleton/horizontal')(this, this.get(_a.vendorOpt), this.get(_a.barOpt)));
    return this.el.onmousewheel = this.on_mousewheel;
  }
    //@debug "__slidebar GHHHHHHH", @, @model.get(_a.value)


// ===========================================================
// on_mousewheel
//
// ===========================================================
  on_mousewheel(e) {
    let p;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    const v = this.model.get(_a.value);
    const opt = this._slidebar.model.get(_a.vendorOpt) || {};
    if (opt.step != null) {
      p   = opt.step;
    } else if (opt.pace != null) {
      p   = opt.pace;
    } else {
      p   = this.model.get(_a.step) || this.model.get(_a.pace) || 1;
    }
    //p = @model.get(_a.pace) || 1
    if (e.deltaY < 0) {
      this.model.set(_a.value, v + p);
    } else {
      this.model.set(_a.value, v - p);
    }
    this._slidebar.triggerUpdate = true;
    this._slidebar.set(this.model.get(_a.value));
    this._slidebar.triggerUpdate = false;
    this.debug(`TICKER TTTT PACE=${p}, value=${v}`, this.model.get(_a.value), opt, this);
    return false;
  }

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    let value = this.model.get(_a.value);
    //@debug "TICKER TTTT", pn, @, value,child,section
    switch (pn) {
      case "slidebar":
        this._slidebar = child;
        child.model.set(_a.allowExceed, this.model.get(_a.allowExceed));
        this._max = child.model.get(_a.max);
        var f = () => child.set(value);
        return _.delay(f, 500);
        //@debug "Slidebar TTTT", child,@,@get(_a.value)
      case "input-entry":
        if ((value == null)) {
          value = 0;
        }
        this._input_entry = child;
        child.set(value);
        //child.ui.field.val(value)
        //child.model.set _a.value, value
        // Let time to set first value
        f =()=> { 
          return child.model.on(_e.change, m=> {
            if (m.changed.value != null) {
              return this._updateFromEntry(m);
            }
          });
        };
        return _.delay(f, Visitor.timeout(1000));

      case "ticker":
        var p = this.model.get(_a.step) || this.model.get(_a.pace);
        child.model.set(_a.value, p);
        return this._ticker = child;
    }
  }
        //@debug "Ticker TTTT", child,@,@get(_a.value)
      // else
      //   #this.warn WARNING.bad_value.format(pn, 'onPartReady'), @
      //   child.onChildBubble = @onChildBubble


// ===========================================================
// onUiEvent
//
// @param [Object] origin
//
// ===========================================================
  onUiEvent(origin){
    const service = origin.model.get(_a.service) || origin.model.get(_a.name);
    const type    = origin.model.get(_a.type);
    let value = origin.model.get(_a.value);
    //@debug "SQSQSQSQQS Slidebar : service=#{service}", type, value , service, origin, @
    switch (service) {
      case "slidebar":
        //Panel.hideQuickMenu()
        //@_input_entry.setValue(value)
        return this.updateValue(parseFloat(value));
        //@debug "SQSQSQSQQS Slidebar Update : ", value , origin
      case "input-entry":        
        this.updateValue(value);
        return this._slidebar.set(parseFloat(value));
        //@debug "SQSQSQSQQS Entry Update : ", value , origin
      case "ticker":
        value = this.model.get(_a.value);
        var pacevalue = origin.model.get(_a.value);
        this.model.set(_a.value, parseFloat(value) + parseFloat(pacevalue));
        value = this.model.get(_a.value);
        //@_input_entry.setValue(value)
        //@debug "SQSQSQSQQS ticker : ", value , origin
        this.updateValue(value);
        return this._slidebar.set(parseFloat(value));
        // #@debug "SQSQSQSQQS Ticker Update : ", value , origin
      default:
        return this.warn("SERVICE undefined",  service);
    }
  }

// ===========================================================
// _updateFromEntry
//
// @param [Object] cmd
//
// ===========================================================
  _updateFromEntry(cmd) {
    const service = cmd.get(_a.service);
    const value = cmd.get(_a.value);
    // if value.match(/\d*\./)
    if (cmd.status === _a.error) {
      this.warn("INVALI");
      return;
    }
    //   value = value.toFixed(2)
    this.debug(`SQSQSQSQQS _updateFromEntry service=${service} val=${value}`, cmd.get(_a.value), cmd);
    //if _.isFinite(value)
    this.updateValue(value);
    return this._slidebar.set(value);
  }
    // if value is @model.get(_a.value)
    //   #@debug "SQSQSQSQQS EEEEE", value, @model.get(_a.value)


// ===========================================================
// onKeypressEnter
//
// @param [Object] cmd
//
// ===========================================================
  onKeypressEnter(cmd) {
    return this._updateFromEntry(cmd);
  }

// ===========================================================
// onKeypressUp
//
// @param [Object] cmd
//
// ===========================================================
  onKeypressUp(cmd) {
    return this._updateFromEntry(cmd);
  }

// ===========================================================
// onChildBubble
//
// @param [Object] child
// @param [Object] origin
//
// @return [Object] 
//
// ===========================================================
  onChildBubble(child, origin){
    //@debug "SQSQSQSQQS onChildBubble"
    return this._updateFromEntry(origin);
  }

// ===========================================================
// onSlideStart
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onSlideStart(child) {
    //@debug "SQSQSQSQQS oonAAAAAA ChildEnd", child, origin
    try {  
      const handler = this.model.get(_a.handler) || this._handler;
      const ui = handler.ui || handler.client;
      return ui.triggerMethod(_e.slideStart, this, child);
    } catch (error) {}
  }

// ===========================================================
// onSlideEnd
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onSlideEnd(child) {
    //@debug "SQSQSQSQQS oonAAAAAA ChildEnd", child, origin
    try {  
      const handler = this.model.get(_a.handler) || this._handler;
      const ui = handler.ui || handler.client;
      return ui.triggerMethod(_e.slideEnd, this, child);
    } catch (error) {}
  }

// ===========================================================
// updateValue
//
// @param [Object] value
//
// ===========================================================
  updateValue(value, dry_run){
    if (dry_run == null) { dry_run = false; }
    this.debug("Slider value updated", value);  
    const name = this.model.get(_a.name);
    if (value > this.model.get(_a.range).max) {
      value = this.model.get(_a.range).max;
    } else if (value < this.model.get(_a.range).min) {
      value = this.model.get(_a.range).min;
    }
    value = parseFloat(value);
    if (["text-indent","font-size"].includes(name)) {
      this._input_entry.setValue(value.toFixed(0));
    } else if (["line-height", "letter-spacing"].includes(name)) {
      this._input_entry.setValue(value.toFixed(2));
    } else {
      this._input_entry.setValue(value);
    }
    this.model.set(_a.value, value);
    //@debug "_JJJHGGG 22222 ", value, @_max, @_slidebar
    if (dry_run) {
      return;
    }
    return this.triggerHandlers();
  }
}
__slidebar_input_ui.initClass();

module.exports = __slidebar_input_ui;
