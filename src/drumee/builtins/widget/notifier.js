const {
  TweenMax
} = require("gsap/all");

//-------------------------------------
//
// Utils.Notifier
//-------------------------------------
class __utils_notifier extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._poke = this._poke.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.content;
    this.prototype.events =
      {'click': '_click'};
    this.prototype.ui  =
      {spinner  : 'i.fa'};
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    let value;
    if (_.isString(opt)) {
      value  = opt;
    }
    this.model = new Backbone.Model(opt);
    this.model.atLeast({
      content : value || this.model.get(_a.value) || _K.char.empty,
      picto   : _K.char.empty
    });
    return this.model.on(_e.change, this._poke);
  }
// ================== *
// _click
// ================== *

// ===========================================================
// _click
//
// @param [Object] e
//
// ===========================================================
  _click(e) {
    e.stopPropagation();
    return this.fireEvent(_e.msgbox.click);
  }
// ================== *
// _anim
// ================== *

// ===========================================================
// _anim
//
// ===========================================================
  _anim() {
    TweenMax.set(this.$el, {perspective:800, transformStyle:"preserve-3d"});
    return TweenMax.fromTo(this.$el, 2,
      {rotationX:-180, backgroundColor:"#FCFF1D"},
      {rotationX:0, backgroundColor:"#9DCDEF"});
  }
// ============================
//
// ============================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //_dbg ">>WW DQDQDQ", @$el
    if (this.getOption(_a.anim)) {
      return this._anim();
    }
  }
// ============================
//
// ============================

// ===========================================================
// _poke
//
// ===========================================================
  _poke() {
    //_dbg ">>WW DQDQDQ _poke", @
    this.render();
    return this._anim();
  }
}
__utils_notifier.initClass();
module.exports = __utils_notifier;
