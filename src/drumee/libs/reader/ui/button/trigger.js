class __btn_trigger extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onClick = this.onClick.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.button.trigger;
    this.prototype.className  = 'button-trigger';
    this.prototype.events   =
      {click : Backbone.View.prototype.triggerHandlers}; //'_click'
    this.prototype.ui = {
      picto          : '.picto',
      label          : '.label'
    };
  }

// ===========================================================
// initialize
//
// @param [Object] e
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      innerClass : _K.char.empty,
      flow       : _a.horizontal,
      label      : _K.char.empty,
      picto      : _K.char.empty,
      justify    : this.get(_a.justify) || _a.left,
      widgetId   : _.uniqueId('trigger-'),
      content    : this.model.get(_a.label) || _K.char.empty
    });
    return this.model.set(_a.active, 1);
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] opt
//
// ===========================================================
  onDomRefresh(opt) {
    return this.declareHandlers(); //s()
  }

// ===========================================================
// onClick
//
// @param [Object] e
//
// @return [Object]
//
// ===========================================================
  onClick(e){
//    e.stopImmediatePropagation()
//    e.stopPropagation()
    _dbg("Trigger _click", this);
    const signal = this.get(_a.signal) || _e.update;
    const ui = this._handler.ui || this.parent._handler.ui;
    if ((ui != null) && signal) {
      _dbg(">>MM QQQ post Button.Toggle handler 1", signal, ui);
      ui.triggerMethod(signal, this);
    }
  }

// ===========================================================
// onHold
//
// @param [Object] model
//
// ===========================================================
  onHold(model) {
    this.model.set(_a.active, false);
    return __guard__(this.ui != null ? this.ui.picto : undefined, x => x.toggleClass("fa-spinner fa-spin"));
  }

// ===========================================================
// onRelease
//
// @param [Object] model
//
// ===========================================================
  onRelease(model) {
    __guard__(__guard__(this.ui != null ? this.ui.picto : undefined, x1 => x1.picto), x => x.toggleClass("fa-spinner fa-spin"));
    return this.model.set(_a.active, 1);
  }
}
__btn_trigger.initClass();
module.exports = __btn_trigger;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
