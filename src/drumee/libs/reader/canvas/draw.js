/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/canvas/draw
//   TYPE :
// ==================================================================== *

class __canvas_draw extends Marionette.View {
  static initClass() {
  //   templateName: _T.wrapper.canvas
  //   className : "widget canvas-wrapper"
  //
  //   behaviorSet: PROXY_CORE.behaviors
  //   #tagName          : PROXY_CORE.tagName #'a'
  //
    this.prototype.templateName = _T.wrapper.canvas;
    this.prototype.className  = "widget canvas-wrapper";
  }
//__behaviorSet: PROXY_CORE.behaviors
  //tagName          : PROXY_CORE.tagName #'a'

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    super.initialize();
    this._id = _.uniqueId("canvas-");
    this.model.set({
      widgetId   :  this._id,
      innerClass : _K.char.empty,
      width      : _K.size.full,
      height     : _K.size.full
    });
    return this._countDown = _.after(3, this._start);
  }

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    this.debug("initCanvas", this, this.$el.width(), this.$el.height());
    this._canvas = document.getElementById(this._id);
    this._canvas.width  = this.$el.width();
    this._canvas.height = this.$el.height();
    const ctx = this._canvas.getContext('2d');
    this.context = ctx;
    const f = ()=> {
      if (this.model.get(_a.src)) {
        const img = new Image;
        img.onload = () => ctx.drawImage(img,0,0);
        return img.src = this.model.get(_a.src);
      }
    };
    return this.waitElement(this.context, f);
  }


// ===========================================================
// onDomRefresh
//
// @return [Object]
//
// ===========================================================
  onDomRefresh() {
    this._countDown();
    const f = ()=> {
      return this._countDown();
    };
    return this.waitElement(this.el, f); 
  }

// ===========================================================
// __line
//
// @return [Object]
//
// ===========================================================
  __line() {
    if ((this.context == null)) {
      this.warn("CONTEXT NOT FOUND");
      return;
    }
    this.context.beginPath();
    this.context.setLineDash([5, 5]);
    this.context.moveTo(100, 150);
    this.context.lineTo(450, 50);
    this.context.strokeStyle= "#FF0000";
    this.context.stroke();
    this.context.beginPath();
    this.context.setLineDash([10, 15]);
    this.context.moveTo(100, 150);
    this.context.lineTo(450, 50);
    this.context.strokeStyle= "#00FF00";
    return this.context.stroke();
  }

// ===========================================================
// lines
//
// @param [Object] lines
//
// @return [Object]
//
// ===========================================================
  lines(lines) {
    if ((this.context == null)) {
      this.warn("CONTEXT NOT FOUND");
      return;
    }
    //arr = []
    this.context.clearRect(0,0, this._canvas.width, this._canvas.height);
    return (() => {
      const result = [];
      for (var l of Array.from(lines)) {
        this.context.beginPath();
        //dash = l.dash || arr
        if (l.dash != null) {
          this.context.setLineDash(l.dash);
        }
        this.context.moveTo(l.from.x, l.from.y);
        this.context.lineTo(l.to.x, l.to.y);
        this.context.strokeStyle= l.style;
        result.push(this.context.stroke());
      }
      return result;
    })();
  }
}
__canvas_draw.initClass();

module.exports = __canvas_draw;
