class __btn_rotate extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onUpdate = this.onUpdate.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.button.rotate;
    this.prototype.className = "button-rotate";
    this.prototype.ui = {
      picto: '.picto',
      label: '.label'
    };
  }

  initialize(e) {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    this.model.set(this.getOption(_a.modelArgs));
    return this.model.atLeast({
      label: _K.char.empty,
      picto: _p.refresh,
      justify: _a.center,
      active: true
    });
  }

  /**
   * 
   * @param {*} rotate 
   * @returns 
   */
  onUpdate(rotate) {
    const signal = this.get(_a.signal) || _e.ui.event;
    this.rotate = rotate;
    this.trigger(signal);
    if (this.get(_a.source) != null) {
      return this.get(_a.source).triggerMethod(signal, this);
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    const me = this;
    const _onDrag = function (ui) {
      return me.onUpdate(this, ui);
    };
    const opt = {
      type: "rotation",
      throwProps: true,
      dragResistance: 0,
      edgeResistance: 1,
      onDrag: _onDrag,
      bounds: { minRotation: -180, maxRotation: 180 }
    };
    return this.draggable.create(this.$el, opt);
  }
}
__btn_rotate.initClass();
module.exports = __btn_rotate;
