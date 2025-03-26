class __tray extends Marionette.View {
  constructor(...args) {
    super(...args);
    this._load = this._load.bind(this);
    this._alternate = this._alternate.bind(this);
    this._loaded = this._loaded.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._flexWidth = this._flexWidth.bind(this);
    this._flexHeight = this._flexHeight.bind(this);
    this.setHeight = this.setHeight.bind(this);
    this.setwidth = this.setwidth.bind(this);
    this._display = this._display.bind(this);
    this.onParentResized = this.onParentResized.bind(this);
  }

  static initClass() {
  //  templateName: _T.wrapper.raw
    this.prototype.className = "media-image";
    this.prototype.ui =
      {loading : '.loading'};
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    //@debug ">> Image.Base", @
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    this.model.set(_a.picto, `${_p.spinner} xia-center loading`);
    const m = Dayjs();
    this.model.atLeast({
      date : m.format("DD-MM-YY")});
    const filetype = this.model.get(_a.filetype);
    switch (filetype) {
      case _a.document: case _a.other:
        if (ext === _a.pdf) {
          this.model.set(_a.extra, _p.pdf);
        }
        break;
      case _a.video:
        this.model.set(_a.extra, _p.film);
        break;
    }
    this.declareHandlers(); //s()
    this.triggerMethod(_e.after.initialize);
    return this._load();
  }
// ========================
//
// ========================

// ===========================================================
// _load
//
// ===========================================================
  _load() {
    const src = require('options/url/media')(this.model);
    this.image = new window.Image();
    $(this.image).on(_e.load, this._loaded);
    $(this.image).on(_e.error, this._alternate);
    return $(this.image).attr(_a.src, src);
  }
    //@debug ">> Image.Base 2", src
// ========================
//
// ========================

// ===========================================================
// _alternate
//
// ===========================================================
  _alternate() {
    const alt = location.host.replace(/\.net/, '.com');
    this.model.set('alternate', alt);
    const src = require('options/url/media')(this.model);
    //#@debug "Image.Base _alternate", alt, src, @
    this.image = new window.Image();
    $(this.image).on(_e.load, this._loaded);
    return $(this.image).attr(_a.src, src);
  }
    //@debug ">> Image.Base 5", src
// ========================
//
// ========================

// ===========================================================
// _loaded
//
// ===========================================================
  _loaded() {
    this.$el.append(this.image);
    if ((this.ui.loading != null) && _.isFunction(this.ui.loading.remove)) {
      this.ui.loading.remove();
    }
    this._flow = this.model.get(_a.flow) || this.getOption(_a.flow) || (this.parent != null ? this.parent._flow : undefined);
    if (!this._flow) {
      this.warn("undefined flow, setting to default");
      this._flow = _a.widget;
    }
    this._wdith  = parseInt(this.$el.css(_a.width));
    this._height = parseInt(this.$el.css(_a.height));
    this._ratio  = {
      image  : this.image.width/this.image.height,
      widget : this._wdith/this._height
    };
    //@debug ">> Image.Base 3"
    return this._display();
  }
    //@debug ">>QHEREA  IMAGE", @
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const geo = this.model.get(_a.geometry);
    if (_.isObject(geo)) {
      this.$el.css({
        'min-width':Utils.px(geo.width),
        'min-height':Utils.px(geo.height)
      });
    }
    const userAttr = this.model.get(_a.userAttributes);
    if ((userAttr != null) && (userAttr[_a.data.title] != null)) {
      return this.$el.attr(_a.title, userAttr[_a.data.title]);
    } else if (this.model.get(_a.caption) != null) {
      return this.$el.attr(_a.title, this.model.get(_a.caption));
    }
  }
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    fitParent
//
// @param [Object] parent
//
// @return [Object] 
//
// ===========================================================
//    fitParent:(parent) =>
//      if not parent?
//        return
//      @_guessBbox(parent)
//      @bounds = @getBounds()
//      styleOpt = @model.get(_a.styleOpt) || {}
//
//      if parent._flow is _a.horizontal
//        styleOpt.height  = @bbox.height + (@bounds.top  + @bounds.bottom)
//        styleOpt.width   = _a.auto
//      else
//        styleOpt.width   = @bbox.width + (@bounds.left + @bounds.right)
//        styleOpt.height  = _a.auto
//
//      @setStyle styleOpt
//
//      #@_flow = @model.get(_a.flow) || parent._flow || _a.widget
//      #@_flow = parent._flow
//      #@debug "scaleImage >>ssss>> guessSize FFFF 222", @image, @bbox
//
//  # =================================== *
//  #
//  # =================================== *

// ===========================================================
// #    scaleImage
//
// @return [Object] 
//
// ===========================================================
//    scaleImage:()=>
//      if @_flow is _a.free or @model.get(_a.flow) is _a.free
//        return
//
//      @bounds = @getBounds()
//      if not @bbox?
//        @_guessBbox()
//      @bbox.width   = parseInt(@bbox.width)
//      @bbox.height  = parseInt(@bbox.height)
//      @debug "scaleImage >>ssss>> guessSize FFFF 222", @image, @bbox
//
//      @_width  = @bbox.width - (@bounds.left + @bounds.right)
//      @_height = @bbox.height - (@bounds.top  + @bounds.bottom)
//      if @_flow is _a.horizontal
//        @image.height = @_height
//        @image.removeAttribute _a.width
//      else
//        @image.width = @_width
//        @image.removeAttribute _a.height
//      @$el.width @_width
//      @$el.height @_height
// =================================== *
//
// =================================== *

// ===========================================================
// _flexWidth
//
// @param [Object] extend=no
//
// ===========================================================
  _flexWidth(extend){
    let width;
    if (extend == null) { extend = false; }
    this.debug("_flexWidth", this.image.height);
    if (extend) {
      this.$el.css({
        width  : _K.size.full,
        height : _a.initial
      });
    }
    this.image.removeAttribute(_a.height);
    if ((this.get(_a.userAttributes) != null) && this.get(_a.userAttributes)['data-width']) {
      width = this.get(_a.userAttributes)['data-width'];
      this.$el.css(_a.width, width);
    } else {
      width = _K.size.full;
    }
    return $(this.image).attr(_a.width, width);
  }
// =================================== *
//
// =================================== *

// ===========================================================
// _flexHeight
//
// @param [Object] extend=no
//
// ===========================================================
  _flexHeight(extend){
    let height;
    if (extend == null) { extend = false; }
    if (extend) {
      this.$el.css({
        width  : 0,
        height : _K.size.full
      });
    }
    this.image.removeAttribute(_a.width);
    if ((this.get(_a.userAttributes) != null) && this.get(_a.userAttributes)['data-width']) {
      height = this.get(_a.userAttributes)['data-height'];
      this.$el.css(_a.height, height);
    } else {
      height = _K.size.full;
    }
    $(this.image).attr(_a.height, height);
    if (extend) {
      const f = () => {
        return this.$el.css({
          width  : _a.initial,
          height : _K.size.full
        });
      };
      return _.delay(f, 10);
    }
  }
// =================================== *
//
// =================================== *

// ===========================================================
// setHeight
//
// @param [Object] h
//
// ===========================================================
  setHeight(h){
    this.$el.css({
      height  : h});
    this.image.removeAttribute(_a.width);
    return $(this.image).attr(_a.height, h);
  }
// =================================== *
//
// =================================== *

// ===========================================================
// setwidth
//
// @param [Object] w
//
// ===========================================================
  setwidth(w){
    this.$el.css({
      width  : w});
    this.image.removeAttribute(_a.height);
    return $(this.image).attr(_a.width, w);
  }
// =================================== *
//
// =================================== *

// ===========================================================
// _display
//
// ===========================================================
  _display(){
    //_dbg "_display", @
    switch (this._flow) {
      case _a.free: case _a.widget:
        if (this._ratio.widget > this._ratio.image) {
          return this._flexHeight();
        } else {
          return this._flexWidth();
        }
      case _a.page: case _a.width:
        return this._flexWidth(true);
      case _a.height: case _a.media: case _a.image:
        return this._flexHeight(true);
      default:
        if ((this.parent != null ? this.parent._flow : undefined) === _a.horizontal) {
          return this._flexHeight(true);
        } else {
          return this._flexWidth(true);
        }
    }
  }
    //@debug ">> Image.Base 10"
//  # =================================== *
//  #
//  # =================================== *

// ===========================================================
// #    _guessBbox
//
// @param [Object] parent
//
// ===========================================================
//    _guessBbox:(parent)=>
//      parent = parent || @parent
//      if parent?
//        @bbox = parent.guessSize()
//      else
//        @bbox = @guessSize()
//
//      #_dbg ">>ssss>> guessSize bbbb 222", @bounds, @bbox
//      if not Utils.isSize(@bbox)
//        @bbox.height = @image.height
//        @bbox.width  = @image.width
//        this.warn "Could not guess bounding box, using the image one"
//
// ======================================================
//
// ======================================================

// ===========================================================
// onParentResized
//
// @param [Object] parent
// @param [Object] event
// @param [Object] ui
//
// ===========================================================
  onParentResized(parent, event, ui) {
    //_dbg ">>bbb  onParentResized", parent, @, ui
    if (this.image != null) {
      this.image.remove();
    }
    return this._load();
  }
}
__tray.initClass();
// Optimization hack
// This is a container, designed to include files under the same module
module.exports = __tray;
