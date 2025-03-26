const { filesize, arcLength } = require("core/utils")

class __svg_progress extends LetcBox {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    this.className = "loader-progress";
    this.figName = "svg_progress";
    this.declareHandlers();
    super.initialize();
    this.model.set({
      widgetId: _.uniqueId('svg-'),
      name: this.getOption(_a.name) || _K.char.empty,
      cursor: "#35d6ab",
      innerClass: 'circle'
    });
    this.model.atLeast({
      percent: 0,
      mode: 'grid',
      service: _e.cancel,
      interval: 300
    });

    if (this.mget(_a.mode) === _a.row) {
      require('./skin/row');
    } else {
      require('./skin/grid');
    }

    const loader = this.mget(_a.loader);
    if (loader != null) {
      loader.addListener(this);
      this._mouseEvt = loader.mouseEvt;
    }

    if (this.mget(_a.ttl)) {
      return _.delay(this.goodbye.bind(this), this.mget(_a.ttl));
    }
  }


  /**
   * 
   */
  onRender() {
    super.onRender();
    if (this._mouseEvt != null) {
      this.el.style.position = _a.absolute;
      this.el.style.left = this._mouseEvt.pageX.px();
      this.el.style.top = this._mouseEvt.pageY.px();
    }
    this._cursor = 0;
    const delay = this.mget('delay');
    if (delay && (delay > 0)) {
      this.el.hide();
      setTimeout(() => { this.el.show() }, delay);
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    if (this._ready) {
      return;
    }
    if (this.mget(_a.mode) === _a.row) {
      this.feed(require('./skeleton/row')(this));
    } else {
      this.feed(require('./skeleton/grid')(this));
    }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "ref-chart":
        return this.waitElement(child.el, () => {
          if (this.mget(_a.mode) === _a.row) {
            child.$el.append(require('./template/row')(this));
          } else {
            child.$el.append(require('./template/grid')(this));
          }
          if (this.mget('runtick')) {
            this.tick();
          }
        });
    }
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  update(opt) {
    let v;
    if (_.isObject(opt)) {
      const p = (100 * opt.loaded) / opt.total;
      v = Math.ceil(p);
    } else {
      if (_.isNumber(opt)) {
        v = Math.ceil(opt);
      } else {
        v = parseInt(opt);
      }
    }

    const progress = document.getElementById(`${this._id}-fg`);
    if (!progress) {
      return;
    }

    if (this.mget(_a.mode) === _a.row) {
      progress.style.width = `${v}%`;
    } else {
      progress.style.strokeDashoffset = arcLength(v);
    }

    this.__refPercent.set(_a.content, `${v}%`);
    this._cursor = v;

    if (opt.total != null) {
      this.__refFilesize.setState(1);
      return this.__refFilesize.set(_a.content, filesize(opt.total));
    } else {
      return this.__refFilesize.setState(0);
    }
  }

  /**
   * 
   * @param {*} l 
   * @returns 
   */
  setLabel(l) {
    return this.__refFilename.set(_a.content, l);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} total 
   * @returns 
   */
  onUploadProgress(e, total) {
    let rate;
    if (e.lengthComputable) {
      rate = e.loaded / e.total;
    } else if (_.isFinite(total) && (total > 0)) {
      rate = e.loaded / total;
    }
    const p = parseInt(100 * rate);
    this.update(p);
  }


  /**
   * 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  onUploadEnd(data, socket) {
    this.parent.collection.remove(this.model);
    if (data._status_ === _a.error) {
      this.trigger(_e.error, data.content);
      return;
    }
    try {
      return this.get(_a.handler).ui.triggerMethod(_e.uploaded, data, socket, this);
    } catch (e) {
      if ((this._handler != null ? this._handler.ui : undefined) != null) {
        return this._handler.ui.triggerMethod(_e.uploaded, data, socket, this);
      } else {
        return this.debug("Failed to handle progression", e);
      }
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  onError(e) {
    this.trigger(_e.error, e);
    this.warn("Failed to onUploadError", e);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  onUploadTimeout(e) {
    this.trigger(_e.error, e);
  }

  /**
   * 
   * @returns 
   */
  tick() {
    const f = () => {
      if (this.isDestroyed()) {
        return;
      }
      this._cursor++;
      if (this._cursor > 100) {
        this._cursor = 0;
      }
      this.update(this._cursor);
      return this.tick();
    };

    setTimeout(f, this.mget(_a.interval));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.cancel:
        this._canceled = true;
        this.status = _e.cancel;
        this.softDestroy();
        return this.trigger(_e.cancel);
    }
  }


  /**
   * 
   */
  _cancel() {
    this.goodbye();
  }
}

module.exports = __svg_progress;
