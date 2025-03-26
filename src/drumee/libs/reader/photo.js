
require('yuki-createjs');
const { isNumeric, fitBoxes, capFirst } = require("core/utils")

createjs.Graphics.Polygon = function (x, y, points) {
  this.x = x;
  this.y = y;
  return this.points = points;
};

createjs.Graphics.Polygon.prototype.exec = function (ctx) {
  //Start at the end to simplify loop
  const end = this.points[this.points.length - 1];
  ctx.moveTo(end.x, end.y);
  return this.points.forEach(point => ctx.lineTo(point.x, point.y));
};

createjs.Graphics.prototype.drawPolygon = function (x, y, args) {
  const points = [];
  if (Array.isArray(args)) {
    args.forEach(function (point) {
      let p;
      if (Array.isArray(point)) {
        p = { x: point[0], y: point[1] };
      } else {
        p = point;
      }
      return points.push(p);
    });
  } else {
    args = Array.prototype.slice.call(arguments).slice(2);
    let px = null;
    args.forEach(function (val) {
      if (px === null) {
        return px = val;
      } else {
        points.push({ x: px, y: val });
        return px = null;
      }
    });
  }
  return this.append(new createjs.Graphics.Polygon(x, y, points));
};


/**
 * 
 * @param {*} v 
 * @returns 
 */
const _canvas = function (v) {
  const id = v.model.get(_a.widgetId);
  const w = v._viewportWidth;
  const h = v._viewportHeight;
  const src = v._url();
  const html = `
    <div id="${id}-wrapper" class="image-wrapper"> 
      <canvas id="${id}" width="${w}" height="${h}" class="canvas-box"></canvas> 
      <img id="${id}-img" style="z-index:-10;" src="${src}" class="img-box"></img> 
    </div>`;
  return html;
};


/**
 * 
 * @param {*} id 
 * @param {*} msg 
 * @returns 
 */
const _message = function (id, msg) {
  const html = `<div id="msg-${id}" class="fill-up">${msg}</div>`;
  return html;
};


class __photo extends LetcBox {
  constructor(...args) {
    this.onPartReady = this.onPartReady.bind(this);
    this.guessFormat = this.guessFormat.bind(this);
    this._url = this._url.bind(this);
    this._loadImage = this._loadImage.bind(this);
    this._stop = this._stop.bind(this);
    this._start = this._start.bind(this);
    this.mould = this.mould.bind(this);
    this.update = this.update.bind(this);
    this.clearLoaders = this.clearLoaders.bind(this);
    this.display = this.display.bind(this);
    this._setupDefault = this._setupDefault.bind(this);
    this._cook = this._cook.bind(this);
    this._shape = this._shape.bind(this);
    this._getBoudingBox = this._getBoudingBox.bind(this);
    this._getShapeOpt = this._getShapeOpt.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.className = "widget photo";
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    this.model.atLeast({
      innerClass: ""
    });
    super.initialize(opt);

    this._countdown = _.after(3, () => {
      return this._start();
    });

    this.image = new Backbone.Model(this.model.get(_a.imageOpt));
    if (_.isEmpty(this._url())) {
      this.warn(WARNING.attribute.required.format('url'));
      this._countdown();
      this._countdown();
    }

    this.declareHandlers();
    this.transform = new Backbone.Model(this.model.get(_a.transformOpt));

    this.options.spinner = _a.off;
    this.model.set({
      widgetId: _.uniqueId('canvas-')
    });
    this.preset();
    this.natural = new window.Image();
    this._loadImage();
    this._filters = {};
    return this._zoom = this.image.get(_a.zoom) || 1;
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    this[`_${pn}`] = child;
    switch (pn) {
      case _a.loader:
        return child.feed(require('skeleton/spinner/circles')());
    }
  }



  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('skeleton/photo')(this));
    this._viewportWidth = Math.round(this.$el.width());
    this._viewportHeight = Math.round(this.$el.height());
    this.$el.append(_canvas(this));
    this.canvasEl = document.getElementById(this.model.get(_a.widgetId));
    const f = () => {
      return this._countdown();
    };
    this.waitElement(this.canvasEl, f); //@createCanvas

    const me = this;
    const g = () => me._countdown();
    this.waitElement(this.el, g);

  }

  /**
   * 
   * @returns 
   */
  guessFormat() {
    let format, h, w;
    if (this._isShown) {
      w = this.$el.width();
      h = this.$el.height(); //
    } else {
      w = this.style.get(_a.width);
      h = this.style.get(_a.height);
    }
    if ((w < 500) || (h < 500)) {
      format = _a.thumb;
    } else if ((w > 900) || (h > 650)) {
      format = _a.orig;
    } else {
      format = _a.slide;
    }
    return format;
  }

  /**
   * 
   * @returns 
   */
  _url() {
    if (this.mget(_a.url)) {
      return this.mget(_a.url);
    }
    if (this.image.isEmpty() && this.model.get(_a.nodeId)) {
      for (var i of [_a.nodeId, _a.filetype, _a.ownerId, _a.vhost]) {
        this.image.set(i, this.model.get(i));
      }
    }
    if (this.model.get(_a.format) != null) {
      return require('options/url/link')(this.image, this.model.get(_a.format));
    }
    return require('options/url/link')(this.image, this.guessFormat());
  }


  /**
   * 
   * @returns 
   */
  _loadImage() {
    //f = ()=>
    this.natural.onload = this._countdown;
    this.natural.onerror = e => {
      return this._stop(e);
    };
    return this.natural.setAttribute(_a.src, this._url());
  }

  /**
   * 
   * @param {*} refresh 
   * @returns 
   */
  preset(refresh) {
    if (refresh == null) { refresh = false; }
    this._minWidth = 200;
    return this.model.set({
      date: Dayjs.unix(this.image.get(_a.createTime)).format("DD-MM-YYYY à HH:MM")
    });
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _stop(e) {
    this.$el.append(_message(this._id, `Failed to load from URL *${this._url()}*`));
    return this.clearLoaders();
  }


  /**
   * 
   * @returns 
   */
  _start() {
    this.size = {};
    if (isNumeric(this.style.get(_a.width))) {
      this.size.width = Math.floor(this.style.get(_a.width));
    } else {
      this.size.width = Math.floor(this.el.style.width);
    }

    if (isNumeric(this.style.get(_a.height))) {
      this.size.height = Math.floor(this.style.get(_a.height));
    } else {
      this.size.height = Math.floor(this.el.style.height);
    }

    this.stage = new createjs.Stage(this.model.get(_a.widgetId));
    this.cook = new Backbone.Model(this.model.get(_a.cookOpt));
    this.display();
    return this._countdown = null;
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  mould(cmd) {
    if (cmd) {
      if (cmd.model) {
        this.image.set(_.clone(cmd.model.toJSON()));
      } else {
        this.image.set(_.clone(cmd));
      }
    }

    this.preset();
    this._countdown = _.after(1, this.display);
    return this._loadImage();
  }

/**
 * 
 * @param {*} cmd 
 * @returns 
 */
  update(cmd) {
    this.b0.filters = [];
    for (var k in this._filters) {
      var v = this._filters[k];
      this.b0.filters.push(v);
    }
    this.b0.cache(0, 0, this.natural.width, this.natural.height);
    return this.stage.update();
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  clearLoaders(cmd) {
    return this.children.each(function (c) {
      if (c.model.get(_a.sys_pn) === _a.loader) {
        c.clear();
        return c.el.dataset.state = _a.closed;
      }
    });
  }

  /**
   * 
   * @returns 
   */
  display() {
    this.clearLoaders();
    this.stage.removeAllChildren();
    this.l0 = new createjs.Container();

    this.b0 = new createjs.Bitmap(this._url());

    if (this.transform.isEmpty()) {
      this.stage.x = 0;
      this.stage.y = 0;
      this._setupDefault();
    } else {
      if (this.transform.get(_a.stage)) {  // Scaling / natural
        this.stage.set(this.transform.get(_a.stage));
        this.b0.scaleX = this.$el.width() / this.natural.width;
        this.b0.scaleY = this.$el.height() / this.natural.height;
      }
      if (this.transform.get(_a.container)) {   // Crop rectange position on the stage
        this.l0.set(this.transform.get(_a.container));
      }
      if (this.transform.get(_a.image)) { // Image position / container ??
        this.b0.set(this.transform.get(_a.image));
      }
      this.$el.width(this.size.width);
      this.$el.height(this.size.height);
      if (this.canvasEl) {
        this.canvasEl.width = this.size.width;
        this.canvasEl.height = this.size.height;
      }
    }
    this.l0.addChild(this.b0);
    this.stage.addChild(this.l0);
    this._cook();
    return this.update();
  }

  /**
   * 
   * @returns 
   */
  _setupDefault() {
    const width = this.style.get(_a.width) || this.$el.width();
    const height = this.style.get(_a.height) || this.$el.height();
    this._scaleX = width / this.natural.width;
    this._scaleY = height / this.natural.height;
    const sizing = this.model.get(_a.sizing) || _a.contain;

    switch (sizing) {
      case _a.cover:
        this._scaleX = (this._scaleY = Math.max(this._scaleX, this._scaleY));
        this._innerSize = {
          width: this._scaleX * this.natural.width,
          height: this._scaleY * this.natural.height
        };
        break;

      case 'fit':
        var outer = { width, height };
        var inner = { width: this.natural.width, height: this.natural.height };
        this._innerSize = fitBoxes(outer, inner);
        this._scaleX = this._innerSize.width / this.natural.width;
        this._scaleY = this._innerSize.height / this.natural.height;
        break;

      case _a.contain:
        this._scaleX = (this._scaleY = Math.min(this._scaleX, this._scaleY));
        this._innerSize = {
          width: this._scaleX * this.natural.width,
          height: this._scaleY * this.natural.height
        };
        break;

      case _a.bound:
        var scale = Math.min(this._scaleX, this._scaleY);
        if ((scale * this.natural.width) < this._minWidth) {
          scale = this._minWidth / this.natural.width;
        }
        this._scaleX = (this._scaleY = scale);
        this._innerSize = {
          width: this._scaleX * this.natural.width,
          height: this._scaleY * this.natural.height
        };
        break;

      case _a.auto:
        this._scaleX = this._viewportWidth / this.natural.width;
        this._scaleY = this._viewportHeight / this.natural.height;
        this._scaleX = (this._scaleY = Math.min(this._scaleX, this._scaleY));
        this._innerSize = {
          width: this._viewportWidth - 1, //width - 1
          height: this._viewportHeight - 1 //height - 1
        };
        break;

      default:
        this._scaleX = this.size.width / this.natural.width;
        this._scaleY = this.size.height / this.natural.height;
    }
    this.b0.scaleX = this._scaleX * this._zoom;
    this.b0.scaleY = this._scaleY * this._zoom;


    this._innerSize.width = Math.round(this._innerSize.width);
    this._innerSize.height = Math.round(this._innerSize.height);
    this.$el.width(this._innerSize.width);
    this.$el.height(this._innerSize.height);
    if (this.canvasEl) {
      this.canvasEl.width = this._innerSize.width;
      return this.canvasEl.height = this._innerSize.height;
    }
  }

  /**
   * 
   * @returns 
   */
  _cook() {
    if ((this.cook == null)) {
      return;
    }
    this.b0.filters = [];

    return (() => {
      const result = [];
      const object = this.cook.toJSON();
      for (var k in object) {
        var v = object[k];
        try {
          result.push(this[`_${k}`](v));
        } catch (e) {
          result.push(this.warn("Failed to cook", e));
        }
      }
      return result;
    })();
  }

  /**
   * 
   * @param {*} value 
   * @returns 
   */
  _alpha(value) {
    const shape = new createjs.Shape();
    const alpha = ((100 - value) / 100).toFixed(2);
    const rgba = `rgba(0, 0, 0, ${alpha})`;
    shape.graphics.beginFill(rgba);
    shape.graphics.drawRect(0, 0, this.natural.width, this.natural.height);
    shape.cache(0, 0, this.natural.width, this.natural.height);
    return this._filters.alpha = new createjs.AlphaMaskFilter(shape.cacheCanvas);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _blur(opt) {
    if (!_.isObject(opt)) {
      opt = {};
    }
    const rx = opt.ry || 0;
    const ry = opt.rx || 0;
    const q = opt.quality || 1;

    return this._filters.blur = new createjs.BlurFilter(rx, rx, q);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _colorMatrix(opt) {
    const matrix = new createjs.ColorMatrix();
    for (var k in opt) {
      var v = opt[k];
      var m = `adjust${capFirst(k)}`;
      try {
        matrix[m](v);
      } catch (e) {
        this.warn(`Failed to apply ${m} on matrix`);
      }
    }
    return this._filters.colorMatrix = new createjs.ColorMatrixFilter(matrix);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _color(opt) {
    let r = opt.r || 1;
    const g = opt.g || 1;
    const b = opt.b || 1;
    const a = opt.a || 1;
    const R = opt.R || 1;
    const G = opt.G || 1;
    const B = opt.B || 1;
    return this._filters.color = new createjs.ColorFilter(r, g, b, a, R, G, B);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _shape(opt) {
    let angle, ps;
    this._mask = new createjs.Shape();
    const g = this._mask.graphics.beginFill("rgba(0, 0, 0, 1)");
    let radius = 0;
    opt = this._getShapeOpt(opt.name);
    switch (opt.name) {
      case 'circle':
        this._maskCmd = g.drawCircle(opt.x, opt.y, opt.radius).command;
        break;

      case 'polystar':
        var sides = opt.sides || 6;
        radius = opt.radius || Math.min(opt.w / 2, opt.h / 2);
        if ((opt.pointSize == null)) {
          ps = 0.6;
        } else {
          ps = opt.pointSize;
        }
        if ((opt.angle == null)) {
          angle = -90;
        } else {
          ({
            angle
          } = opt);
        }
        this._maskCmd = g.drawPolyStar(opt.x, opt.y, radius, sides, ps, angle).command;
        break;

      case 'ellipse':
        this._maskCmd = g.drawEllipse(opt.x, opt.y, opt.w, opt.h).command;
        break;

      case 'roundrect':
        radius = opt.radius || 10;
        this._maskCmd = g.drawRoundRect(opt.x, opt.y, opt.w, opt.h, radius).command;
        break;

      default:
        this._maskCmd = g.drawRect(opt.x, opt.y, opt.w, opt.h).command;
    }
    this._mask.cache(0, 0, this.natural.width, this.natural.height);
    return this._filters.shape = new createjs.AlphaMaskFilter(this._mask.cacheCanvas);
  }


  /**
   * 
   * @returns 
   */
  _getBoudingBox() {
    const bounds = {
      x: 0,
      y: 0,
      w: this._viewportWidth,
      h: this._viewportHeight
    };
    if (!_.isEmpty(this.cook.get(_a.crop))) {
      _.merge(bounds, this.cook.get(_a.crop));
    }
    return bounds;
  }

  /**
   * 
   * @param {*} name 
   * @returns 
   */
  _getShapeOpt(name) {
    let opt;
    const scaleX = this.transform.get(_a.scaleX) || 1;
    const scaleY = this.transform.get(_a.scaleY) || 1;
    let w = this.natural.width;
    let h = this.natural.height;
    let x = 0;
    let y = 0;
    const image = this.transform.get(_a.image);
    if (image != null) {
      x = (-image.x / image.scaleX) + (image.x * (scaleX - 1)); //(bbox.x)/mtx.scaleX 
      y = (-image.y / image.scaleY) + (image.y * (scaleY - 1));//(bbox.y)/mtx.scaleY 
    } else {
      x = 0;
      y = 0;
    }

    switch (name) {
      case 'circle': case 'polystar':
        w = w * scaleX;
        h = h * scaleY;
        x = x + (w / 2);
        y = y + (h / 2);
        var radius = Math.min(w / 2, h / 2);

        opt = {
          x,
          y,
          w,
          h,
          radius
        };
        break;
      default:
        opt = {
          x,
          y,
          w,
          h
        };
    }
    if (this.cook.get(_a.shape) != null) {
      _.merge(opt, this.cook.get(_a.shape));
    }
    return opt;
  }
}
__photo.initClass();

module.exports = __photo;
