class __drumee_slide extends Marionette.View {
  constructor(...args) {
    super(...args);
    this._display = this._display.bind(this);
    this.play = this.play.bind(this);
    this._close = this._close.bind(this);
    this._end = this._end.bind(this);
  }

  static initClass() {
  //   templateName: "#--wrapper-image"
  //   className : "image-slide"
  //   tagName : _K.tag.li
  // 
    this.prototype.templateName = "#--wrapper-image";
    this.prototype.className  = "image-slide";
    this.prototype.tagName  = _K.tag.li;
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    this.model.set(_a.format, _a.slide);
    const l = location;
    const nid = this.model.get(_a.nodeId);
    const oid = this.model.get(_a.ownerId);
    const src = `${l.origin}${l.pathname}?api=media.slide&nid=${nid}`;
    this.model.set(_a.src, src);
    this.image = new window.Image();
    $(this.image).on(_e.load, this._display);
    return $(this.image).attr(_a.src, src);
  }
//      _dbg "Image.Slide", @, src
// =================================== *
//
// =================================== *

// ===========================================================
// _display
//
// ===========================================================
  _display(){
    this.image.removeAttribute(_a.height);
    const width = document.body.clientWidth;
    _dbg("_display", width, this);
    this.$el.css(_a.position , _a.absolute);
    this.$el.innerWidth(width);
    this.trigger("ready");
    return TweenMax.set(this.$el, {x : -document.body.clientWidth, y:0});
  }
// =================================== *
//
// =================================== *

// ===========================================================
// play
//
// ===========================================================
  play(){
    _dbg("play _display",  this);
    const tl = new TimelineMax({
      onComplete: this._end});
    return tl.to(this.$el, 0.5, {x:0});
  }
// ========================
//
// ========================

// ===========================================================
// _close
//
// ===========================================================
  _close() {
    return this.triggerMethod(_e.close);
  }
// ========================
//
// ========================

// ===========================================================
// _end
//
// ===========================================================
  _end() {
    return this.trigger(_e.end);
  }
}
__drumee_slide.initClass();
module.exports = __drumee_slide;
