const _button = function (id) {
  const html = `<div id=\"${id}-fetch\" class=\"fetch-button\"></div>`;
  return html;
};
const SPINNER_WAIT = 'spinnerWait';

class __list extends LetcBox {

  /**
   * 
   */
  initialize(opt) {
    if (opt.kids && opt.itemsOpt) {
      opt.kids = { ...this.prepare(opt.kids) };
    }
    super.initialize(opt);
    this.declareHandlers();
    if (_.isEmpty(this.mget(_a.kids))) {
      this._started = false;
    } else {
      this._started = true;
    }

    this.model.atLeast({
      innerClass: _K.char.empty,
      flow: _a.vertical,
      axis: _a.y
    });
    this.model.set(_a.widgetId, this._id);
    if (this.mget(_a.timer)) {
      this._timer = this.mget(_a.timer);
    }

    opt = this.mget(_a.vendorOpt) || {};
    this._startAtBottom = (this.mget(_a.start) || opt.start) === _a.bottom;
    if (this._startAtBottom) {
      opt.star = this._startAt;
      this.mset(_a.vendorOpt, opt);
    }

    const o = this.mget('autoHeight');
    if (o != null) {
      if ((o.min == null)) {
        o.min = 30;
      }
      this._minHeight = o.min;
      this._maxHeight = o.max || 300;
      this._unitHeight = o.unit || this._minHeight;
      this.collection.on(_e.remove, c => {
        if (this.collection.length === 0) {
          return this.el.hide();
        }
      });
    }
    RADIO_BROADCAST.on(_e.responsive, this.responsive.bind(this));
    this._onMouseWheel = this._onMouseWheel.bind(this)
    this._initApi();
  }

  /**
   * 
   */
  onDestroy() {
    this.collection.reset();
    this.stopListening();
    try {
      this.__container.removeEventListener(_e.scroll, this._scrollHandler);
      this.el.removeEventListener("mousewheel", this._onMouseWhee)
      this.el.useMouseWheel = null;
    } catch (e) {

    }
    RADIO_BROADCAST.off(_e.responsive, this.responsive.bind(this));
  }

  /**
   * 
   */
  restart() {
    this.trigger(_e.eod); //** Flush old listeningxs */
    this.start(1)
  }

  /**
  * 
  */
  responsive() {
    /** Do not remove */
  }


  /**
  * 
  */
  scrollHeight() {
    if (!this.__container) return;
    return this.__container.scrollHeight - this.__container.outerHeight();
  }

  /**
   * 
   */
  scrollTop() {
    if (!this.__container) return;
    return this.__container.scrollTop;
  }

  /**
  * 
  */
  scrolledY() {
    if (!this.__container) return;
    return this.__container.scrollHeight - this.__container.outerHeight() - this.__container.scrollTop;
  }

  /**
   * 
   * @returns 
   */
  _initApi() {
    const api = this.mget(_a.api)
    if (!api) {
      this._api = {};
    }
    if (_.isString(api)) {
      this._api = { service: api };
      return;
    }
    if (_.isFunction(api)) {
      this._api = api(this) || {};
      return
    }
    this._api = api || {};
  }

  /**
   * 
   */
  start(reset = 0) {
    this._curPage = 1;
    this._waiting = false; // wait util data received
    this._scrollY = 0;
    this._lastScrollTop = 0;
    this._initApi();
    if (reset) this.reset();
    this._end_of_data = false;
    this._started = false;
    let fetched = this.fetch();
    let kids = this.mget(_a.kids)
    if (fetched) return;
    if (!_.isEmpty(kids)) {
      this.feed(kids);
    }
    this.trigger(_e.started)
  }

  /**
   * 
   * @param {*} timer 
   * @returns 
   */
  tick(timer) {
    if (_.isNumber(timer)) {
      this._timer = timer;
    }
    if (this._tickRunning) {
      return;
    }

    const list = this.children.toArray();
    var f = () => {
      this._tickRunning = true;
      this._tickCount++;
      if (list[this._tickCount] != null) {
        list[this._tickCount].triggerMethod("tick", this);
      }
      if (this._end_of_data || (this._tickCount > this.collection.length)) {
        this._tickRunning = false;
        return;
      }
      this.fetch();
      setTimeout(f, this._timer);
    };
    return setTimeout(f, this._timer);
  }

  /**
   * 
   */
  initCollectionEvents() {
    const phContent = this.mget(_a.placeholder) || this.phContent;
    if (!phContent) return;
    if (this._collectionEventsBound) return;
    this._collectionEventsBound = true;
    this.collection.on(_e.add, () => {
      let ph = this.__placeholder;
      if (ph && !ph.isDestroyed()) {
        ph.cut();
      }
    });
  }

  /**
   * 
   * @returns 
   */
  initContent() {
    const id = `${this._id}-container`;
    const c = document.getElementById(id);
    this.__container = c;
    //this.trigger(_e.ready);
    let kids = this.mget(_a.kids) || [];
    if (this._startAtBottom) {
      this.collection.on(_e.update, () => {
        if (this._scrolling) return;
        setTimeout(() => {
          c.scrollTop = c.scrollHeight;
        }, 300);
      });
      this.collection.once(_e.update, () => {
        setTimeout(() => {
          this._ready = 1;
          this.trigger(_e.ready);
        }, 300);
      });
    } else {
      this._ready = 1;
      this.trigger(_e.ready);
    }

    this._scrollHandler = _.throttle(this._onScroll.bind(this), 500);
    c.addEventListener(_e.scroll, this._scrollHandler);
    let ph = this.mget(_a.placeholder);
    if (_.isFunction(ph)) {
      this.phContent = ph();
    } else {
      this.phContent = ph;
    }
    if (kids.length) {
      this.initCollectionEvents();
      this.start();
      return
    }
    if (this.phContent) {
      this.append(this.phContent);
      this.__placeholder = this.children.last();
    }
    this.initCollectionEvents();
    this.start();
    this.useMouseWheel()
  }



  /**
   * 
   */
  onDomRefresh() {
    let f;
    this._scrollY = 0;
    this._delta = 0;

    const id = `${this._id}-container`;
    this._scrolling = false;
    this.ensureElement(id)
      .then(this.initContent.bind(this))
      .catch((e) => {
        this.warn(`Failed to ensure element id=${id}`, e)
      })
  }

  /** When the first pages are not long enough to 
   * trigger scroll event we rely on mousewheel event 
   * to get more items
   */
  async useMouseWheel() {
    this.el.addEventListener("mousewheel", this._onMouseWheel, { passive: true })
  }

  /**
   * 
   */
  changeFlow(f) {
    this.el.dataset.flow = f;
    return this.__container.dataset.flow = f;
  }

  /**
   * mouseenter are sometime lost because the children update 
   * the parent space so, children must bubble the events
   * @returns 
   */
  onChildItemOver() {
    return this.el.mouseenter();
  }


  /**
   * 
   * @param {*} opt 
   */
  getScrollX() {
    return this.__container.scrollLeft;
  }

  /**
   * 
   * @param {*} opt 
   */
  getScrollY(opt) {
    return this.__container.scrollTop;
  }

  /**
   * 
   * @param {*} opt 
   */
  scroll(opt) { }



  /**
   * 
   * @param {*} width 
   * @param {*} height 
   * @param {*} force 
   * @returns 
   */
  setSize(width, height, force) {
    if (force == null) { force = false; }
    if (width != null) {
      this.$el.width(width);
      this.style.set(_a.width, width);
    } else if (/[0-9]+([%|a-z|A-B]+)/.test(this.style.get(_a.width))) {
      this.$el.width(this.style.get(_a.width)); //(width)
    }

    if (height != null) {
      this.$el.height(height);
      return this.style.set(_a.height, height);
    } else if (/[0-9]+([%|a-z|A-B]+)/.test(this.style.get(_a.height))) {
      // if isNumeric @style.get(_a.height)
      // height = parseInt @style.get(_a.height)
      return this.$el.height(this.style.get(_a.height)); //(height)
    }
  }

  /**
   * 
   */
  syncSisze(width, height, force) {
    if (force == null) { force = false; }
    return this.warn("syncSisze IS DEPRECATED!!!");
  }

  /**
   * 
   */
  contentHeight() {
    return this.__container.outerHeight();
  }

  /**
   * 
   */
  contentWidth() {
    return this.__container.outerHeight();
  }

  /**
   * 
   */
  setOverflow(v) {
    this.el.css(_a.overflow._, v);
    return this.el.parent().css(_a.overflow._, v);
  }

  /**
   * 
   */
  checkSpinner() {
    if (!this.mget(_a.spinner)) {
      return;
    }
    const tw = this.mget(SPINNER_WAIT);
    if (this._timeout) return;

    if (tw) {
      this._timeout = setTimeout(() => {
        this.spinner(1);
        this._timeout = null;
      }, tw);
    } else {
      this.spinner(1);
    }
  }

  /**
   * 
   */
  fetch(spin = 0) {
    const { service } = this._api;
    if (!service) {
      return;
    }
    if (this._end_of_data || this.isDestroyed()) {
      return;
    }
    let max_page = this.mget(_a.max_page);
    if (max_page && this._curPage > max_page) {
      this._end_of_data = true;
      return;
    }
    if (this._waiting) {
      return { waiting: 1 };
    }
    this._api.page = this._curPage;
    this._waiting = true;
    const opt = { ... this._api };
    if (this.mget(_a.cors) && (this.mget(_a.vhost) != null)) {
      opt.vhost = this.mget(_a.vhost);
    }
    delete opt.service;
    opt.pagelength = this.mget('pagelength') || _K.pagelength;
    if (spin) {
      this.spinner(1)
    } else {
      this.checkSpinner();
    }
    this.fetchService(service, opt)
      .then(this.handleResponse.bind(this))
      .catch(this.onServerComplain.bind(this));
    return opt;
  }

  /**
   * 
   * @param {*} e 
   */
  _onMouseWheel(e) {
    this._onMouseWheelTimeout = setTimeout(() => {
      if (this._scrolled) {
        this.el.removeEventListener("mousewheel", this._onMouseWhee)
        return; // this._onScroll has been called, no more ned 
      }
      if (!this.scrollY && !this._end_of_data) {
        if (this._startAtBottom) {
          if (e.deltaY < 0) this.fetch();
        } else {
          if (e.deltaY > 0) this.fetch();
        }
      }
      this.trigger("mousewheel", e)
    }, 500)
  }

  /**
   * 
   */
  _onScroll(e, pos) {
    this._scrolled = true; // Prevent mousewheel overrun
    if(this._onMouseWheelTimeout){
      this.el.removeEventListener("mousewheel", this._onMouseWhee)
      clearTimeout(this._onMouseWheelTimeout)
    }
    if (!this.__container) return;
    let dir;
    if (!this._ready || this._waiting) {
      return;
    }

    const st = this.__container.scrollTop;
    this.scrollY = st;
    this.scrollX = this.__container.scrollLeft;
    if (this._scrollY < this.scrollY) {
      dir = _a.down;
    } else if (this._scrollY > this.scrollY) {
      dir = _a.up;
    } else if (this._scrollX < this.scrollX) {
      dir = _a.left;
    } else if (this._scrollX > this.scrollX) {
      dir = _a.right;
    } else {
      return;
    }
    this.scrollDir = dir;
    this._scrolling = true;
    this._scrollY = this.scrollY;
    this._scrollX = this.scrollX;
    this.trigger(_e.scroll, this, e);
    setTimeout(() => {
      this._scrolling = false;
      this.spinner(0)
    }, 3000);
    if (this._startAtBottom) {
      if ((dir === _a.down) || (st > 0)) {
        return;
      }
    }
    if (dir == _a.down) {
      if ((this.scrollTop() + this.$el.height()) < this.scrollHeight()) return
      this.fetch(1);
      return
    }
    if (this.scrollTop()) return;
    this.fetch(1);
  }

  /**
   * 
   * @returns 
   */
  isWaiting() {
    return this._waiting;
  }

  /**
   * 
   */
  getOffsetY() {
    if (!this.__container) return;
    return this.__container.scrollTop;
  }

  /**
   * 
   */
  scrollHeight() {
    if (!this.__container) return this.$el.height();
    return this.__container.scrollHeight;
  }

  /**
   * 
   */
  getOffsetX() {
    if (!this.__container) return;
    return this.__container.scrollLeft;
  }

  /**
   * 
   */
  scrollTo(x, y, d) {
    if (!this.__container) return;
    if (x == null) { x = 0; }
    if (y == null) { y = 0; }
    if (d == null) { d = 0.5; }
    return this.__container.scrollTo(x, y);
  }

  /**
   * 
   */
  scrollToBottom(d) {
    if (!this.__container) return;
    const h = this.__container.scrollHeight || this.__container.innerHeight();
    this.__container.scrollTop = h;
  }

  /**
   * 
   */
  scrollToRight(d) {
    if (!this.__container) return;
    if (d == null) { d = 0.5; }
    const h = this.__container.scrollWidth || this.__container.innerWidth();
    return this.__container.scrollTo(0, h);
  }

  /**
   * 
   */
  isNaturalyEmpty() {
    if (this.isEmpty()) return true;
    let last = this.children.last();
    if (!last) return true;
    // if (this.__spinner) {
    //   return (last.mget(_a.kind) == this.__spinner.mget(_a.kind))
    // }
    return this.collection.length == 0;
  }

  /**
   * 
   */
  showAtBottom() { }

  /**
  * @param {any} xhr 
  */
  onServerComplain(xhr) {
    this.warn(`[556] GOT SERVER COMPLAINS`, xhr);
    this._waiting = false;
    this.spinner(0);
    // if ((this.__spinner != null) && !this.__spinner.isDestroyed()) {
    //   this.__spinner.cut();
    // }
    setTimeout(() => {
      let itemsOpt = this.mget(_a.itemsOpt);
      this.model.unset(_a.itemsOpt);
      this.feed([Skeletons.Note(LOCALE.ERROR_SERVER, 'server-error')])
      this.mset({ itemsOpt })
    }, 1000)
    this.trigger(_e.error, this);
  }


  /**
   * 
   */
  handleResponse(data) {
    // this._waiting = false;
    // this.spinner(0)
    // if (this._timeout) {
    //   clearTimeout(this._timeout);
    //   this._timeout = null;
    // }
    // if ((this.__spinner != null) && !this.__spinner.isDestroyed()) {
    //   this.__spinner.cut();
    // }

    const phContent = this.mget(_a.placeholder) || this.phContent;
    if (_.isEmpty(data) && phContent) {
      if (this.collection.length === 0) {
        this.collection.cleanSet(phContent);
        this.__placeholder = this.children.last();
      }
      return;
    }

    if (this._startAtBottom) {
      if (_.isArray(data)) {
        data = data.reverse();
      }
    }
    if (!_.isArray(data)) {
      this._eod();
      if (this.el != null) {
        this.$el.mouseenter();
      }
      return;
    }

    if (!data.length) {
      this._eod();
      return;
    }

    try {
      this.renderData(data);
    } catch (error) { }


    if ((data[0] != null) && data[0].page) {
      if (data.length < _K.pagelength) {
        this._eod();
        return;
      }
    }

    this._curPage++;
    if (this._timer) this.tick();
  }

  /**
   * 
   */
  _stopSpinner() {
    this.spinner(0);
    this._waiting = false;
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  /**
   * 
   */
  _eod() {
    this._end_of_data = true;
    this.trigger(_e.eod, this);
    this.status = _e.eod;
    this._stopSpinner();
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  renderData(data) {
    if (this._fetchBtn != null) {
      this._fetchBtn.remove();
    }

    this.trigger(_e.data, data);
    if (this._end_of_data) {
      return;
    }
    data = this.prepare(this.prepareData(data));
    if (!this._started) {
      if (this.mget(_a.defaults)) {
        setTimeout(() => {
          this.collection.add(data);
        }, 300)
      } else {
        try {
          this.collection.cleanSet(data);
        } catch (e) {
          this.warn(e, data);
        }
      }
      this._started = true;
    } else {
      if (this._startAtBottom) {
        if ((this._curPage > 1) || this.mget(_a.defaults)) {
          this.collection.unshift(data);
        } else {
          this.collection.set(data, { silent: true });
        }
      } else {
        if ((this._curPage > 1) || this.mget(_a.defaults)) {
          this.collection.add(data);
        } else {
          this.collection.cleanSet(data);
        }
      }
    }
    this._stopSpinner()
    if (this.mget('fetchButton')) {
      this.el.append(_button(this._id));
      this._fetchBtn = document.getElementById(`${this._id}-fetch`);
      const h = () => {
        return this._fetchBtn.onclick = this.fetch;
      };
      return this.waitElement(this._fetchBtn, h);
    }
  }

  /**
   * 
   */
  prepareData(data) {
    if (!_.isArray(data)) {
      data = [data];
    }
    let skip = this.mget('skip');
    if (!skip) return data;
    for (let k in skip) {
      data = data.filter((e) => {
        if (_.isString(skip[k])) {
          return e[k] != skip[k]
        } else if (skip[k].test) {
          return !skip[k].test(e[k])
        }
        return true
      })
    }
    return data
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  feed(data) {
    data = this.prepareData(data);
    let kids = this.prepare(data);
    if (kids) {
      return this.collection.set(kids);
    }
    return this.collection.set(data);
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  prepend(data) {
    this.prepare(data);
    this.collection.unshift(data);
    let c = this.children.first();
    return c;
  }

  /**
   * 
   * @param {*} data 
   * @param {*} index 
   * @returns 
   */
  append(data, index) {
    this.prepare(data);
    let c;
    if (index != null) {
      const ch = this.collection.toJSON();
      ch.splice(index, 0, data);
      this.collection.cleanSet(ch);
      c = this.children.findByIndex(index);
    } else {
      this.collection.add(data);
      c = this.children.last();
    }
    return c;
  }

  /**
   * 
   * @returns 
   */
  getEffectiveLength() {
    const { length } = this.collection;
    return length;
  }
}

module.exports = __list;
