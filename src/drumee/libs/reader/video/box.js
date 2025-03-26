class __vdo_box extends LetcBox {

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "vdo-bg-box";
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    if ((this.get(_a.kids) == null)) {
      const vdo = this.model.toJSON();
      vdo.kind = KIND.designer.video.background;
      this.model.set(_a.kids, [vdo]);
    }
    return this.collection.set(this.get(_a.kids));
  }
}
__vdo_box.initClass();
module.exports = __vdo_box;
