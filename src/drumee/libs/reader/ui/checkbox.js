class __checkbox extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.getData = this.getData.bind(this);
    this._click = this._click.bind(this);
  }

  static initClass() { // Marionette.View
    this.prototype.templateName = "#--checkbox";
    this.prototype.className  = "widget checkbox";
    this.prototype.behaviorSet =
      {socket   :1};
    this.prototype.events =
      {click   : '_click'};
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    return this.model.atLeast({
      state    : 0,
      justify  : _a.center,
      innerClass : _C.margin.auto,
      errorClass : _K.char.empty
    });
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.debug(`STATE = ${this.model.get(_a.state)}`);
    return this.$el.attr(_a.data.state, this.model.get(_a.state));
  }
// ============================
//
// ============================

// ===========================================================
// getData
//
// @return [Object] 
//
// ===========================================================
  getData(){
    if (this.get(_a.require) != null) {
      this.$el.attr(_a.data.status, _a.error);
      const msg = _I.PLEASE_CONFIRM;
      if (this.model.get(_a.state) !== parseInt(this.get(_a.require))) {
        const err = new WPP.Note({content : LOCALE[msg], className : _a.error + " " + this.get('errorClass')});
        this.regionStatus.show(err);
        __guard__(this._handler != null ? this._handler.ui : undefined, x => x.triggerMethod(_e.reject, LOCALE[msg]));
        this.trigger(_e.error);
      }
    }
    return {name:this.model.get(_a.name), value:this.model.get(_a.state)};
  }

// ===========================================================
// _click
//
// @param [Object] e
//
// ===========================================================
  _click(e) {
    const state = this.model.get(_a.state) ^ 1;
    this.model.set(_a.state, state);
    this.$el.attr(_a.data.state, state);
    this.regionStatus.empty();
    const signal = this.get(_a.signal) || _e.reset;
    return __guard__(this._handler != null ? this._handler.ui : undefined, x => x.triggerMethod(signal, this));
  }
}
__checkbox.initClass();
module.exports = __checkbox;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
