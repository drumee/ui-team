class __tooltips extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.update = this.update.bind(this);
    this.move = this.move.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.content;
    this.prototype.className = "xia-center tooltip";
  }
// =================== *
//
// =================== *

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    super.initialize();
    if ((this.model.get(_a.content) == null)) {
      const c = this.getOption(_a.content) || _K.string.empty;
      return this.model.set(_a.content, c);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// update
//
// @param [Object] content
//
// ===========================================================
  update(content){
    this.model.set(_a.content, content);
    return this.render();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// move
//
// @param [Object] e
//
// ===========================================================
  move(e){
    const left = e.clientX || e.pageX;
    let top = e.clientY || e.pageY;
    top = top + window.scrollY;
    //_dbg "--PP move", left, top
    return this.$el.css({
      left,
      top
    });
  }
}
__tooltips.initClass();
module.exports = __tooltips;
