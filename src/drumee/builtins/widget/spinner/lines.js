class __spinner_lines extends Marionette.View {

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "margin-auto";
  }
// ============================
//
// ============================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    //_dbg "LightSpinner", @$el.parent()
    const color = this.getOption(_a.color) || _K.color.blue;
    const size  = this.getOption(_a.size)  || _a.small;
    this._opt = require('./options/spin')(size, color);
    if (_.isObject(opt)) {
      return _.extend(this._opt, opt);
    }
  }
// ============================
//
// ============================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const spin  = require("spin");
    return this._spin = new spin(this._opt).spin(this.el);
  }
}
__spinner_lines.initClass();
module.exports = __spinner_lines;
