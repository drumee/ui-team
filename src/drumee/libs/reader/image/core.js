const {
  TweenLite
} = require("gsap/all");
const { fitBoxes } = require("core/utils")

class __image_core extends Marionette.View {
  constructor(...args) {
    this._start = this._start.bind(this);
    this.setup = this.setup.bind(this);
    super(...args);
  }

  static initClass() {  //Marionette.View
    this.prototype.templateName = "#--wrapper-image-core";
    this.prototype.className = "image-core";
    this.prototype.ui = {
      mask     : '.img-filter',
      viewport : '.img-viewport',
      content  : '.img-content'
    };
  }

// ========================
//  PROXIED
// ========================
//__behaviorSet: PROXY_CORE.behaviors
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
    super.initialize();
    this.options.spinner = _a.off;
    this.model.set({widgetId : _.uniqueId('img-core-')});
    this._countdown = _.after(2, this._start);
    return this.preset();
  }
    //@debug "SHHHA ... initialize, @", require('options/url/link')(@model, _a.orig), @model.get(_a.vhost), @
    // if @model.get(_a.tuning)
    //   if Caman?
    //     @_countdown()
    //   else
    //     Utils.loadJS(_K.vendor.caman, @_countdown)

// ===========================================================
// preset
//
// ===========================================================
  preset() {
    const format = this.get(_a.format) || _a.slide;
    const sizing = this.get(_a.sizing) || _a.cover;
    return this.model.set({
      url      : require('options/url/link')(this.model, format),
      date     : Dayjs.unix(this.model.get(_a.createTime)).format("DD-MM-YYYY à HH:MM"),
      sizing
    });
  }

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    //@debug "SHHHA ... _start", @
    //f = ()=>
    //  @ui.content.attr _a.src, @model.get(_a.url)
    //  @setup()
    //  @trigger _e.ready
    //this.waitElement @ui.content, f
    const f = ()=> {
      this.ui.viewport.css({
        "background-color" : _a.transparent,
        'transform-origin' : _K.position.center,
        width              : this.$el.width(),
        height             : this.$el.height(),
        'z-index'          : -10
      });
      this.el.setAttribute(_a.title, this.model.get(_a.parent_path) + '/' + this.model.get(_a.filename));
      return this.ui.content.attr(_a.src, this.model.get(_a.url));
    };

    Utils.waitForFunc(this.ui.viewport.css, f);
    //@ui.content.attr _a.src, @model.get(_a.url)
    this.setup();
    return this.trigger(_e.ready);
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s()  
    this.debug("SHHHA ... onDomRefresh", this.model.get(_a.url), this);
    this._natural = new window.Image();
    $(this._natural).on(_e.load, this._countdown);
    $(this._natural).attr(_a.src, this.model.get(_a.url));
    return this._countdown();
  }
// ========================
// scale = ratio between the natural image size and the reference cropping image @_natural
// zoom  = ratio between the cropping size (canvas) and the image size place in the draft
// ========================

// ===========================================================
// setup
//
// ===========================================================
  setup() {
    let format;
    const xform = this.get(_a.transform) || {};
    //@debug "SHHHA ... setup", xform
    const opt =
      {transformOrigin: _K.position.center};
    xform.zoom = xform.zoom || 1;
    if ((xform.scale != null ? xform.scale.x : undefined)) {
      opt.scaleX = xform.scale.x;
    } else {
      opt.scaleX = this.$el.width()/this._natural.width;
    }
    if ((xform.scale != null ? xform.scale.y : undefined)) {
      opt.scaleY = xform.scale.y;
    } else {
      opt.scaleY = this.$el.height()/this._natural.height;
    }
    if (xform.x != null) {
      opt.x = xform.x;
    } else {
      opt.x = -(this._natural.width - (opt.scaleX*this._natural.width))*0.5;
    }
    if (xform.y != null) {
      opt.y = xform.y;
    } else {
      opt.y = -(this._natural.height - (opt.scaleY*this._natural.height))*0.5;
    }
    if (xform.rotation) {
      opt.rotation = xform.rotation;
    }
    switch (this.get(_a.sizing)) {
      case _a.cover:
        var scale = Math.max(opt.scaleX,opt.scaleY);
        opt.scaleX = (opt.scaleY = scale);
        break;
      case _a.contain:
        scale = Math.min(opt.scaleX,opt.scaleY);
        opt.scaleX = (opt.scaleY = scale);
        break;
      case _a.bound:
        var bbox = this.get(_a.bbox) || {width:200, height:200};
        var box = fitBoxes({width:200, height:200}, {width:this._natural.width, height:this._natural.height});
        //{width: 200, height: 160, scaled: 0.8}
        //scale = Math.min(opt.scaleX,opt.scaleY)
        opt.scaleX = (box.width*box.scaled)/this._natural.width;
        opt.scaleY = (box.height*box.scaled)/this._natural.height;
        this.$el.width(box.width*box.scaled);
        this.$el.height(box.height*box.scaled);
        opt.x = -(this._natural.width - (opt.scaleX*this._natural.width))*0.5;
        opt.y = -(this._natural.height - (opt.scaleY*this._natural.height))*0.5;
        this.parent.$el.width(box.width*box.scaled);
        this.parent.$el.height(box.height*box.scaled);
        break;
    }
    opt.scaleX = opt.scaleX * xform.zoom;
    opt.scaleY = opt.scaleY * xform.zoom;
    TweenLite.set(this.ui.content, opt);
    return format = this.get(_a.format) || _a.slide;
  }
    // @_shape()
    // @_deform()
    // @_tune()
// ========================
//
// ========================

// ===========================================================
// _shape
//
// @return [Object]
//
// ===========================================================
  _shape() {
    const shape = this.get(_a.shape);
    if ((shape == null)) {
      return;
    }
    const opt =
      {overflow : _a.hidden};
    _.merge(opt, shape.style);
    return this.$el.css(opt);
  }
// ========================
//
// ========================

// ===========================================================
// _deform
//
// @return [Object]
//
// ===========================================================
  _deform() {
    const deform = this.get(_a.deform);
    if ((deform == null)) {
      return;
    }
    const opt = {
      transformPerspective : 250,
      transformStyle : "preserve-3d"
    };
    _.merge(opt, deform);
    return TweenLite.set(this.$el, opt);
  }
//# ========================
//
// ========================

// ===========================================================
// _tune
//
// @return [Object]
//
// ===========================================================
  _tune() {
    const tuning = this.model.get(_a.tuning);
    if ((tuning == null)) {
      return;
    }
    const f = ()=> {
      return (() => {
        const result = [];
        for (var k in tuning) {
          var v = tuning[k];
          switch (k) {
            case "brightness": case "contrast": case "saturation": case "stackBlur":
              this._caman[k](v);
              result.push(this._caman.render());
              break;
            case "opacity":
              result.push(this.$el.css(k, v));
              break;
            default:
              result.push(undefined);
          }
        }
        return result;
      })();
    };
    return this._caman = Caman(`#${this.model.get(_a.widgetId)}`, f);
  }
//
//
//# ========================
//#
//# ========================

// ===========================================================
// #  _setupMask
//
// @param [Object] val
//
// ===========================================================
//  _setupMask: (val) ->
//    mask = @get(_a.mask)
//    @ui.viewport.css @get(_a.mask).vars
//    @$el.css
//      width : mask.width
//      height : mask.height
//# ========================
//#
//# ========================

// ===========================================================
// #  setShape
//
// @param [Object] val
//
// ===========================================================
//  setShape: (val) ->
//    if _.isObject val
//      for k,v of val
//        @ui.content.css "border-#{k}-radius", v
//        @ui.mask.css "border-#{k}-radius", v
//    else
//      @ui.content.css _a.border.radius, val
//      @ui.mask.css _a.border.radius, val
// ========================
//
// ========================

// ===========================================================
// setFilterProps
//
// @param [Object] k
// @param [Object] v
//
// ===========================================================
  setFilterProps(k,v) {
    return this.ui.mask.css(k, v);
  }
// ========================
//
// ========================

// ===========================================================
// setProps
//
// @param [Object] k
// @param [Object] v
// @param [Object] scope
//
// ===========================================================
  setProps(k,v, scope) {
    this.ui.content.css(k, v);
    return this.ui.mask.css(k, v);
  }
// ========================
//
// ========================

// ===========================================================
// setMaskProps
//
// @param [Object] k
// @param [Object] v
//
// ===========================================================
  setMaskProps(k,v) {
    return this.ui.mask.css(k, v);
  }
}
__image_core.initClass();
module.exports = __image_core;
