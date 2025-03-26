class __img_box extends LetcBox {
  constructor(...args) {
    super(...args);
    this._initImage = this._initImage.bind(this);
    this.setup = this.setup.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "image-box widget";
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    return super.initialize(opt);
  }
// ===========================================================
// _initImage
//
// ===========================================================
  _initImage() {
    if (this.get(_a.kids)) {
      this.feed(this.get(_a.kids));
    } else {
      const image = {
        kind      : KIND.image.core,
        sys_pn    : _a.image,
        nid       : this.model.get(_a.nodeId),
        oid       : this.model.get(_a.ownerId),
        vhost     : this.model.get(_a.vhost),
        className : _C.full,
        format    :  this.get(_a.format) || _a.slide
      };
      this.feed(image);
    }
    return this.core = this.children.findByIndex(0);
  }
// ========================
//
// ========================

// ===========================================================
// setup
//
// @param [Object] refresh
//
// ===========================================================
  setup(refresh) {
    const t = this.get(_a.transform);
    if (t != null) {
      this.core.model.set(_a.transform, t);
    }
    this.core.setup();
    if (refresh) {
      return this.update();
    }
  }
// ========================
//
// ========================

// ===========================================================
// update
//
// ===========================================================
  update() {
    const format = this.get(_a.format) || _a.slide;
    this.model.set({
      url      : require('options/url/link')(this.model, format),
      date     : Dayjs.unix(this.model.get(_a.createTime)).format("DD-MM-YYYY à HH:MM")
    });
    this.core.model.set({
      url      : require('options/url/link')(this.model, format),
      date     : Dayjs.unix(this.model.get(_a.createTime)).format("DD-MM-YYYY à HH:MM")
    });
    return this._initImage();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    this.debug(">>2233 CHILD READY WIDGET", pn, child, this);
    switch (pn) {
      case _a.list:
        if (this.get(_a.kids)) {
          return child.feed(this.get(_a.kids));
        }
        break;
    }
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this.feed(require('./skeleton/main')(this));
  }
}
__img_box.initClass();
module.exports = __img_box;
