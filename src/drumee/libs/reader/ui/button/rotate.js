class __btn_rotate extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onUpdate = this.onUpdate.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.button.rotate;
    this.prototype.className  = "button-rotate";
    this.prototype.ui = {
      picto          : '.picto',
      label          : '.label'
    };
  }
// ============================================
//
// ============================================

// ===========================================================
// initialize
//
// @param [Object] e
//
// ===========================================================
  initialize(e) {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    this.model.set(this.getOption(_a.modelArgs));
    return this.model.atLeast({
      label     : _K.char.empty,
      picto     : _p.refresh,
      justify   : _a.center,
      active    : true
    });
  }
    // require.ensure [], ()=>
    //   @draggable = require("gsap/Draggable")
    //_dbg ">123userAttributes= QQQ ",  @model.attributes, @
// ============================================
//
// ============================================

// ===========================================================
// onUpdate
//
// @param [Object] rotate
//
// ===========================================================
  onUpdate(rotate) {
    _dbg("onClick= QQQ ",  this, rotate);
    const signal = this.get(_a.signal) || _e.ui.event;
    this.rotate = rotate;
    this.trigger(signal);
    if (this.get(_a.source) != null) {
      return this.get(_a.source).triggerMethod(signal, this);
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const me = this;

// ===========================================================
// _onDrag
//
// @param [Object] ui
//
// ===========================================================
    const _onDrag = function(ui) {
      return me.onUpdate(this, ui);
    };
    const opt = {
      type:"rotation",
      throwProps:true,
      dragResistance : 0,
      edgeResistance : 1,
      onDrag: _onDrag,
      bounds:{minRotation:-180, maxRotation:180}
    };
    //Draggable.create @$el, opt
    return this.draggable.create(this.$el, opt);
  }
}
__btn_rotate.initClass();
module.exports = __btn_rotate;
