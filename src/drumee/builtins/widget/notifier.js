
class __utils_notifier extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._poke = this._poke.bind(this);
  }

  static initClass() {
    // this.prototype.templateName = _T.wrapper.content;
    this.prototype.events = { 'click': '_click' };
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    let value;
    if (_.isString(opt)) {
      value = opt;
    }
    this.model = new Backbone.Model(opt);
    this.model.atLeast({
      content: value || this.model.get(_a.value) || _K.char.empty,
      picto: _K.char.empty
    });
    return this.model.on(_e.change, this._poke);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _click(e) {
    e.stopPropagation();
    return this.fireEvent(_e.msgbox.click);
  }


  _anim() {
    this.el.style.transformStyle = "preserve-3d";
    anime.set(this.el, { perspective: 800 });
    anime.set(this.el, { rotateX: -180 });
    this.el.style.backgroundColor = "#FCFF1D";
    return anime({ targets: this.el, rotateX: 0, backgroundColor: "#9DCDEF", duration: 2000 });
  }


  onDomRefresh() {
    if (this.getOption(_a.anim)) {
      return this._anim();
    }
  }
  _poke() {
    this.render();
    this._anim();
  }
}
__utils_notifier.initClass();
module.exports = __utils_notifier;
