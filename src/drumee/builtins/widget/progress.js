const _canvas = function(id, w, h){
  const html = `<canvas id=\"${id}\" width=\"${w}\" height=\"${h}\" class=\"canvas-box\"></canvas>`;
  return html;
};

//-------------------------------------
//
// Utils.Progress
//-------------------------------------
class __utils_x_progress extends LetcBox {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUploadError = this.onUploadError.bind(this);
    this.onUploadProgress = this.onUploadProgress.bind(this);
    this.onUploadEnd = this.onUploadEnd.bind(this);
    this.onError = this.onError.bind(this);
    this.onUploadTimeout = this.onUploadTimeout.bind(this);
    this._cancel = this._cancel.bind(this);
  }

  static initClass() {
    this.prototype.templateName =  _T.wrapper.canvas;
    this.prototype.nativeClassName = "margin-auto loader-progress";
    this.prototype.events =
      {click : '_cancel'};
  }

// ======================================================
//
// ======================================================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    this.declareHandlers(); //s({part:@, ui:@})
    this.debug("AAAAAAAAA 43");
    super.initialize();
    this.model.set({
      widgetId : _.uniqueId('canvas-'),
      name     : this.getOption(_a.name) || _K.char.empty
    });
    const socket = this.get(_a.socket) || this.get(_a.uploader);
    if (socket != null) {
      socket.addListener(this);
      return this._mouseEvt =  socket.mouseEvt;
    } else {
      return this.warn(WARNING.attribute.recommanded.format(_a.socket));
    }
  }

// ===========================================================
// onPartReady
//
// ===========================================================
  onPartReady(child, pn, section) {
    return this[`_${pn}`] = child;
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    if (this._mouseEvt != null) {
      this.debug("UPLOADING .... onUploaded FTYPE", this, this._mouseEvt);
      this.el.style.position = _a.absolute;
      this.el.style.left =  this._mouseEvt.pageX.px();
      this.el.style.top  =  this._mouseEvt.pageY.px();
    }
    const digit = Skeletons.Box.Y({
      className : 'progress__wrapper fill-up',
      sys_pn    : 'digit-box',
      justify   : _a.center,
      kids:[
        SKL_Note(this.model.get(_a.name), null, {className:'margin-auto'}),
        SKL_Note("0", "0", {className:'margin-auto', sys_pn:"digit"})
      ]
    }, {'z-index':3000});
    this.feed(digit);
    const f =()=> {
      this._viewportWidth  = this.$el.width();
      this._viewportHeight = this.$el.height();
      this.$el.prepend(_canvas(this.model.get(_a.widgetId), this._viewportWidth, this._viewportHeight));
      this.canvasEl = document.getElementById(this.model.get(_a.widgetId));
      this.ctx = this.canvasEl.getContext("2d");
      this.ctx.beginPath();
      this.ctx.lineWidth=10;
      return this.ctx.strokeStyle="#FF0000";
    };
    return this.waitElement(this.el, f);
  }


// ===========================================================
// onUploadError
//
// @param [Object] model
//
// ===========================================================
  onUploadError(model) {
    _dbg("onUploadError", model);
    //dui.Popup.error _INTL.ERROR_NETWORK
    return Butler.say(LOCALE.ERROR_NETWORK);
  }


// ===========================================================
// onUploadProgress
//
// @param [Object] e
// @param [Object] total
//
// ===========================================================
  onUploadProgress(e, total) {
    let rate;
    this.debug("onUploadProgress", e, total, this, this._handler);
    if (e.lengthComputable) {
      rate = e.loaded / e.total;
    } else if (_.isFinite(total) && (total > 0)) {
      rate = e.loaded / total;
    }
    const p = `${parseInt(100 * rate)}%`;
    const radius = Math.min(this._viewportWidth/2, this._viewportHeight/2);
    if (!this.ctx) {
      this.debug("NO canvasEl", this.model.get(_a.widgetId), this);
      return;
    }
    this.debug("onUploadProgress", this._viewportWidth/2, this._viewportHeight/2, radius - 16, 0, rate);
    this.ctx.beginPath();
    this.ctx.arc(this._viewportWidth/2, this._viewportHeight/2, radius - 16, 0, rate * 2 * Math.PI);
    this.ctx.stroke();
    this._digit.model.set(_a.content, p);
    return this._digit.render();
  }


// ===========================================================
// onUploadEnd
//
// @param [Object] data
// @param [Object] socket
//
// @return [Object]
//
// ===========================================================
  onUploadEnd(data, socket) {
    this.debug("onUploadEnd", data, this._handler, this);
    if (data._status_ === _a.error) {
      RADIO_BROADCAST.trigger(_e.error, data.content);
      return;
    }
    this.parent.collection.remove(this.model);

    // Dzfau events already triggered by socket 
    try {
      return this.model.get(_a.handler).ui.triggerMethod(_e.uploaded, data, socket);
    } catch (error) {}
  }

// ===========================================================
// onError
//
// @param [Object] e
//
// ===========================================================
  onError(e) {
    return this.debug("Failed to onUploadError", e);
  }
// ========================
//
// ========================

// ===========================================================
// onUploadTimeout
//
// @param [Object] model
//
// ===========================================================
  onUploadTimeout(model) {
    _dbg("onUploadTimeout", model);
    //dui.Popup.error _INTL.ERROR_NETWORK
    return Butler.say(LOCALE.ERROR_NETWORK);
  }

// ======================================================
//
// ======================================================

// ===========================================================
// _cancel
//
// ===========================================================
  _cancel(){
    if (confirm(LOCALE.CONFIRM_CANCEL)) {
      this.destroy();
      try {
        __guard__(this.get(_a.socket), x => x.abort());
        __guard__(this.get(_a.socket), x1 => x1.destroy());
        return this._handler.ui.triggerMethod("upload:cancel", this.model);
      } catch (error) {}
    }
  }
}
__utils_x_progress.initClass();
module.exports = __utils_x_progress;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
