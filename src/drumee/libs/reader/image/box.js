const _canvas = function(id, w, h){
  const ht = `<canvas class\"absolute\" id=\"canvas-${id}\" width=\"${w}\" height=\"${h}\"></canvas>`;
  return ht;
};

class __img_box extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUploadStart = this.onUploadStart.bind(this);
    this.onUploadEnd = this.onUploadEnd.bind(this);
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
    super.initialize(opt);
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
  }



// ===========================================================
// onDomRefresh
//
// @return [Object]
//
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    const image = this.model.get(_a.image);
    if (!image) {
      this.warn("Image model is required");
      return image;
    }
    const f =()=> {
      return this.$append(_canvas(this._id, this.$el.width(), this.$el.height()));
    };
    return this.waitElement(this.el, f);
  }

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    return this.debug(">>2233 CHILD READY WIDGET", pn, child, this);
  }




// ===========================================================
// onUploadStart
//
// @param [Object] socket
//
// ===========================================================
  onUploadStart(socket) {
    this.trigger("upload:start", socket);
    return this.feed(SKL_UploadProgress(this, socket));
  }

// ===========================================================
// onUploadEnd
//
// @param [Object] data
//
// ===========================================================
  onUploadEnd(data) {
    this.model.unset(_a.files);
    this.model.set(data);
    //@debug "UploadEnd", @, data
    this.initCore();
    return this.trigger("upload:end", data);
  }
}
__img_box.initClass();

module.exports = __img_box;
