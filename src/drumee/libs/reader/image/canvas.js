
const { capFirst } = require("core/utils")
class __image_canvas extends Marionette.View {
  constructor(...args) {
    this._start = this._start.bind(this);
    this.mould = this.mould.bind(this);
    this.resize = this.resize.bind(this);
    super(...args);
  }

  static initClass() {  //Marionette.View
    this.prototype.templateName =  _T.wrapper.canvas;
    this.prototype.className = "image-canvas";
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.options.spinner = _a.off;
    this.preset();
    this._countdown = _.after(3, this._start);
    return require.ensure(['yuki-createjs'], ()=> {
      this.debug("START AAAAQQ ensure", this.model.get(_a.url));
      require('yuki-createjs');
      return this._countdown();
    });
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const f = ()=> {
      this.debug("START AAAAQQ load", this.model.get(_a.url));
      return this._countdown();
    };

    this.natural = new window.Image();
    $(this.natural).on(_e.load, f);
    $(this.natural).attr(_a.src, this.model.get(_a.url));
    this.debug("START AAAAQQ onDomRefresh");
    return this._countdown();
  }

// ===========================================================
// preset
//
// ===========================================================
  preset() {
    const format = this.model.get(_a.format) || _a.slide;
    const sizing = this.model.get(_a.sizing) || _a.cover;
    this.model.set({
      url      : require('options/url/link')(this.model, format),
      date     : Dayjs.unix(this.model.get(_a.createTime)).format("DD-MM-YYYY à HH:MM"),
      sizing,
      width    : this.style.get(_a.width)  || 100,
      height   : this.style.get(_a.height) || 100,
      widgetId : _.uniqueId('canvas-')
    });
    return this.model.atLeast({
      innerClass : ""});
  }

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    //@debug "START AAAAQQ Bitmap", @model.get(_a.url), @, @model.get(_a.widgetId)
    this._stage = new createjs.Stage(this.model.get(_a.widgetId));
    this.bitmap = new createjs.Bitmap(this.model.get(_a.url));
    this._stage.addChild(this.bitmap);
    this._stage.x=0;
    this._stage.y=0;
    this.resize(this.model.get(_a.sizing), true);

    if (this.get(_a.filter)) {
      if (this.get(_a.adjust)) { this._filter(); }
      this._adjust();
    }
    this._stage.update();
    return this.trigger(_e.ready);
  }

// ===========================================================
// mould
//
// ===========================================================
  mould() {
   this.preset();
   return this._start();
 }

//# ===========================================================
//# _display
//#
//# ===========================================================
//  _display: () =>
//    bmp.scaleY = @$el.height()/@natural.height
//    bmp = @bitmap
//    switch @get(_a.sizing)
//      when _a.cover
//        scale = Math.max(bmp.scaleX,bmp.scaleY)
//        bmp.scaleX = bmp.scaleY = scale
//      when _a.contain
//        scale = Math.min(bmp.scaleX,bmp.scaleY)
//        bmp.scaleX = bmp.scaleY = scale
//      else
//
//    bmp.scaleX = bmp.scaleX * xform.zoom
//    bmp.scaleY = bmp.scaleY * xform.zoom

// ========================
// scale = ratio between the natural image size and the reference cropping image @natural
// zoom  = ratio between the cropping size (canvas) and the image size place in the draft
// ========================


// ===========================================================
// update
//
// ===========================================================
  resize(sizing, bubble, update) {
    if (bubble == null) { bubble = false; }
    if (update == null) { update = false; }
    const bmp = this.bitmap;
    const xform = this.get(_a.transform) || {x:0, y:0};
    xform.zoom = xform.zoom || 1;
    if ((xform.scale != null ? xform.scale.x : undefined)) {
      bmp.scaleX = xform.scale.x;
    } else {
      bmp.scaleX = this.$el.width()/this.natural.width;
    }
    if ((xform.scale != null ? xform.scale.y : undefined)) {
      bmp.scaleY = xform.scale.y;
    } else {
      bmp.scaleY = this.$el.height()/this.natural.height;
    }
    if (xform.x != null) {
      bmp.x = xform.x;
    } else {
      bmp.x = -(this.natural.width - (bmp.scaleX*this.natural.width))*0.5;
    }
    if (xform.y != null) {
      bmp.y = xform.y;
    } else {
      bmp.y = -(this.natural.height - (bmp.scaleY*this.natural.height))*0.5;
    }
    if (xform.rotation) {
      bmp.rotation = xform.rotation;
    }
    switch (sizing) {
      case _a.cover:
        var scale = Math.max(bmp.scaleX,bmp.scaleY);
        bmp.scaleX = (bmp.scaleY = scale);
        //@trigger 'scale', @, scale
        this.size = {
          width  : scale * this.natural.width,
          height : scale * this.natural.height
        };
        if (bubble) {
          this.trigger('scale', this);
        }
        break;
      case _a.contain:
        scale = Math.min(bmp.scaleX,bmp.scaleY);
        bmp.scaleX = (bmp.scaleY = scale);
        this.size = {
          width  : scale * this.natural.width,
          height : scale * this.natural.height
        };
        if (bubble) {
          this.trigger('scale', this);
        }
        break;
      default:
        bmp.scaleY = this.$el.height()/this.natural.height;
        bmp.scaleX = this.$el.width()/this.natural.width;
        return;
    }
    this.debug("SHHHA ... setup", xform);
    bmp.scaleX = bmp.scaleX * xform.zoom;
    bmp.scaleY = bmp.scaleY * xform.zoom;
    if (update) { 
      return this._stage.update();
    }
  }

//# ========================
//#
//# ========================

// ===========================================================
// _filter
//
// ===========================================================
  _filter() {
    let rgba;
    const w = this.model.get(_a.width);
    const h = this.model.get(_a.height);
    const filter = this.model.get(_a.filter);
    const shape = new createjs.Shape();
    if (filter.alpha != null) {
      rgba = `rgba(0, 0, 0, ${filter.alpha})`;
    } else {
      rgba = "rgba(0, 0, 0, 1)";
    }
    this.debug(`JSHSHSHS, rgba=${rgba}`, filter);
    const g = shape.graphics.beginFill(rgba);
    const filters = [];
    if (filter.shape) {
      const x = w/2;
      const y = h/2;
      const r = Math.min(x, y);
      switch (filter.shape.name) {
        case 'Circle':
          g.drawCircle(x, y, r);
          break;
        case 'RoundRect':
          var radius = filter.shape.radius || 5;
          g.drawRoundRect(x, y, w, h, radius);
          break;
        case 'Ellipse':
          g.drawEllipse(0, 0, w, h);
          break;
        case 'PolyStar':
          var sides = filter.shape.sides || 6;
          var ps    = filter.shape.pointSize || 0.6;
          var angle = filter.shape.angle || -90;
          this.debug("RZRZRZRZ", filter);
          g.drawPolyStar(x, y, r, sides, ps, angle);
          break;
          //g.drawPolyStar(x, y, r, 6, 0, 30)
        default:
          g.drawRect(0, 0, w, h);
      }
    } else {
      g.drawRect(0, 0, w, h);
    }
    shape.cache(0, 0, w, h);
    filters.push(new createjs.AlphaMaskFilter(shape.cacheCanvas));
    this.bitmap.filters = filters;
    this.bitmap.cache(0, 0, w, h);
    if (filter.blur) {
      const rx = filter.blur.ry || 5;
      const ry = filter.blur.rx || 5;
      const q  = filter.blur.quality || 1;
      shape.cache(0, 0, w, h);
      filters.push(new createjs.BlurFilter(rx, rx, q));
      this.bitmap.filters = filters;
      return this.bitmap.cache(0, 0, w, h);
    }
  }
//# ========================
//#
//# ========================

// ===========================================================
// _adjust
//
// ===========================================================
  _adjust() {
    const w = this.model.get(_a.width);
    const h = this.model.get(_a.height);
    const filters = this.bitmap.filters || [];
    const matrix = new createjs.ColorMatrix();
    const object = this.model.get(_a.adjust);
    for (var k in object) {
      var v = object[k];
      var m = `adjust${capFirst(k)}`;
      matrix[m](v);
    }
    filters.push(new createjs.ColorMatrixFilter(matrix));
    this.bitmap.filters = filters;
    return this.bitmap.cache(0, 0, w, h);
  }
}
__image_canvas.initClass();

// ===========================================================
// #  _filterAA
//
// ===========================================================
//  _filterAA: () ->
//    w = @model.get(_a.width)
//    h = @model.get(_a.height)
//
//    filter = @model.get(_a.filter)
//    filters = []
//    x = w/2
//    y = h/2
//    r = Math.min(x, y)
//    shape = new createjs.Shape()
//    g = shape.graphics.beginFill("rgba(0, 0, 0, 0.3)")
//    #g.drawCircle(x, y, r)
//    g.drawRect(0, 0, w, h)
//    shape.cache(0, 0, w, h)
//    filters.push(new createjs.AlphaMaskFilter(shape.cacheCanvas))
//    @bitmap.filters = filters
//    @bitmap.cache(0, 0, w, h)
module.exports = __image_canvas;
