if ((window.Color == null)) {
  window.Color = require('color');
}

// ===========================================================
// _cursor
//
// @param [Object] id
//
// @return [String] HTML string that represents the button used as rotate command
//
// ===========================================================
const _cursor = function (id, icon) {
  const html = `<div id=\"${id}-cursor\" class=\"colorpicker-cursor svg-wrapper widget\"> \
<svg class=\"full inner drumee-picto svg-inner=\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-${icon}\"></use> \
</svg> \
</div>`;
  return html;
};

//-------------------------------------
//
//
//-------------------------------------
class __color_picker extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._start = this._start.bind(this);
    this._initOffset = this._initOffset.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragStop = this._dragStop.bind(this);
    this._dragging = this._dragging.bind(this);
    this._getPixel = this._getPixel.bind(this);
    this._triggerUiEvent = this._triggerUiEvent.bind(this);
    this._mousemove = this._mousemove.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.canvas;
    this.prototype.className = `${_a.widget} color-picker`;
  }
  //tagName          : PROXY_CORE.tagName #'a'



  initialize(opt) {
    super.initialize();
    this.model.atLeast({
      height: 276,
      width: 276,
      innerClass: "",
      signal: _e.ui.event,
      service: _a.preset,
      chartId: "arrow-down",
    });
    this._countdown = _.after(2, this._start);
    this._nalutral = new window.Image();
    this._nalutral.crossOrigin = "Anonymous";
    this._nalutral.onload = this._countdown;
    this._nalutral.src = this.model.get(_a.image);
    this._id = _.uniqueId('canvas-');
    this.model.set(_a.widgetId, this._id);
    return this._signal = this.model.get(_a.signal);
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.bitmap = new createjs.Bitmap(this.model.get(_a.image));
    this.declareHandlers(); //s()
    this._countdown();
    if (this.model.get(_a.handle) != null) {
      this.$el.append(_cursor(this._id, this.model.get(_a.chartId)));
      this.$handle = this.$el.find(`#${this._id}-cursor`);
      return this.$handle.draggable({
        axis: _a.x,
        drag: this._dragging,
        start: this._dragStart,
        stop: this._dragStopt,
        containment: this.$el
      });
    }
  }


  /**
   * 
   * @returns 
   */
  _start() {
    this.debug("START __colorpicker", this);

    this.$canvas = this.$el.find(`#${this._id}`);
    this._canvas = this.$canvas[0];
    const f = () => {
      this._ctx = this._canvas.getContext('2d');
      this._ctx.drawImage(this._nalutral, 0, 0, this.model.get(_a.width), this.model.get(_a.height));
      //@_canvas.onmousemove = @_mousemove
      return this._canvas.onclick = this._triggerUiEvent;
    };
    return this.waitElement(this.$canvas, f);
  }


  /**
   * 
   * @returns 
   */
  _initOffset() {
    const o = this.$canvas.offset();
    const r = this.$canvas[0].getBoundingClientRect();
    return this._canvasRect = {
      x: o.left,
      y: o.top,
      w: r.width,
      h: r.height
    };
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _dragStart(e, ui) {
    this._drag = true;
    return this._initOffset();
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _dragStop(e, ui) {
    return this._drag = false;
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _dragging(e, ui) {
    this._offsetY = 0;
    this._triggerUiEvent(e.originalEvent.originalEvent, false);

    this._lastX = ui.position.left;
    return this._lastY = ui.position.top;
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _getPixel(e) {
    if (!this._drag) {
      this._initOffset();
    }
    let x = Math.floor(e.pageX - this._canvasRect.x);
    let y = Math.floor(e.pageY - this._canvasRect.y);
    if (y < 0) {
      y = 0;
    }
    if (x < 0) {
      x = 0;
    } else if (x > this._canvasRect.w) {
      x = this._canvasRect.w;
    }
    this.debug("canvasOffset AAAA", x, y, this, this._canvasRect); //, @$canvas[0].getBoundingClientRect()
    const imageData = this._ctx.getImageData(x, y, 1, 1);
    const pixel = imageData.data;
    const color = new Color(`rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);
    //@_lastColor 
    return color.hexString();
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _triggerUiEvent(e) {
    const hexString = this._getPixel(e);
    this.debug(`_triggerUiEvent __colorpicker hstr=${hexString}`, e, this);
    if ((this._handler != null ? this._handler.ui : undefined) != null) {
      this.model.set(_a.value, hexString);
      this.model.set(_a.type, _e.click);
      this.status = _e.click;
      return this._handler.ui.triggerMethod(this._signal, this);
    }
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _mousemove(e) {
    this.debug("START _mousemove", this);
    const hexString = this._getPixel(e);
    return this.debug(`_mousemove __colorpicker hstr=${hexString}`);
  }
}
__color_picker.initClass();



module.exports = __color_picker;
