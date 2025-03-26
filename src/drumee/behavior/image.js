class __bhv_image extends Marionette.Behavior {
// ============================
//
// ===========================

// ===========================================================
// onBeforeRender
//
// @param [Object] opt
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this._alternate = this._alternate.bind(this);
    this._loaded = this._loaded.bind(this);
    this.onReady = this.onReady.bind(this);
  }

  onBeforeRender(opt) {
    const m = Dayjs();
    const src = require('options/url/file')(this.view.model, this.view.model.get(_a.format));
    //@debug "IIIIAIAIAIA onBeforeRender", @view.model.get(_a.format), src, @
    this.image = new window.Image();
    $(this.image).on(_e.load, this._loaded);
    $(this.image).on(_e.error, this._alternate);
    $(this.image).attr(_a.src, src);
    return this.triggerMethod(_e.spinner.start);
  }

// ===========================================================
// _alternate
//
// ===========================================================
  _alternate() {
    const alt = location.host.replace(/\.net/, '.com');
    this.view.model.set('alternate', alt);
    const src = require('options/url/file')(this.view.model);
    //#@debug "Image.Base _alternate", alt, src, @
    this.image = new window.Image();
    $(this.image).on(_e.load, this._loaded);
    return $(this.image).attr(_a.src, src);
  }
    //@debug ">> Image.Base 5", src

// ===========================================================
// _loaded
//
// ===========================================================
  _loaded() {
    this.triggerMethod(_e.spinner.stop);
    this.view._width  = this.image.width;
    this.view._height = this.image.height;
    this.view._ratio  = {
      image  : this.image.width/this.image.height,
      widget : this.$el.width()/this.$el.height()
    };
    return this.view.triggerMethod(_e.loaded);
  }

// ========================
//
// ========================

// ===========================================================
// onReady
//
// ===========================================================
  onReady(){}
}
//    @debug "DISABLED"
//    R = @_wdith/@_height
//    ph = @view.parent.$el.height()
//    pw = @view.parent.$el.width()
//    if ph <= pw
//      @$el.outerWidth(R*ph)
//      @$el.outerHeight(ph)
//    else
//      @$el.outerWidth(pw)
//      @$el.outerHeight(pw/R)
//
//    geo =
//      height : @$el.height()
//      width : @$el.width()
//    style = @view.model.get(_a.styleOpt)
//    _.extend style, geo
module.exports = __bhv_image;
