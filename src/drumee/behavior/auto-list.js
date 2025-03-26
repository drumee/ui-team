class __bahavior_autolist extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPipeEnd = this.onPipeEnd.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.onPipeFailed = this.onPipeFailed.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this._scroll = this._scroll.bind(this);
    this.onContinue = this.onContinue.bind(this);
    this.onRestart = this.onRestart.bind(this);
    this._onFetched = this._onFetched.bind(this);
    this._fetch = this._fetch.bind(this);
    this._buffer = this._buffer.bind(this);
  }

  static initClass() {
    // ==================================================
    // PROXIED
    // ==================================================
    this.prototype._exec = PROXY_CORE.exec;
  }
  // ========================
  //
  // ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
  initialize(opt) {
    let pipe;
    this._prevScroll = -1;
    const api  = this.view.get(_a.api);
    const xhr  = this.view.getOption(_a.xhr);
    _dbg("<<NNPanel TTTTTT __bahavior_autolist", api, this.view);
    if (api != null) {
      if (api === _a.none) {
        return;
      }
      pipe = require('core/socket/pipe');
      this._socket = new pipe(api);
      return this._socket.addListener(this.view);
    } else if (xhr != null) {
      this.view.fireEvent(_e.pipe.start);
      return $.getJSON(xhr, this._onFetched);
    } else {
      return _c.info("Letc.AutoList: No api, using local");
    }
  }
  // ========================
  // onDomRefresh
  // ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.$el.on(_e.scroll,  _.throttle(this._scroll, 300));
    if (this.view.get('bindWindow') != null) {
      window.onscroll = _.debounce(this._scroll, 200);
    }
    this._end_of_data = false;
    if (this._socket != null) {
      this._curPage = 1;
      return this._socket.read();
    }
  }
  // ========================
  // onPipeEnd
  // ========================

// ===========================================================
// onPipeEnd
//
// ===========================================================
  onPipeEnd() {
    return this.view.fireEvent(_e.pipe.end);
  }
  // ========================
  // onPipeSucceeded
  // ========================

// ===========================================================
// onPipeSucceeded
//
// @param [Object] json
//
// ===========================================================
  onPipeSucceeded(json) {
    return this._buffer(json);
  }
// ============================
//
// ===========================

// ===========================================================
// onPipeFailed
//
// @param [Object] xhr
//
// ===========================================================
  onPipeFailed(xhr) {
    this.debug(">>TTTT onPipeFailed", this.view);
    this.xhr = xhr;
    if ((this.view._handler != null ? this.view._handler.error : undefined) != null) {
      return this.view._handler.error.triggerMethod(_e.error, xhr);
    } else if (!this._exec(__guard__(this.view.get(_a.api), x => x.on_error))) {
      return RADIO_BROADCAST.trigger(_e.error, xhr);
    }
  }
  // ========================
  //
  // ========================

// ===========================================================
// onScroll
//
// @param [Object] e
//
// ===========================================================
  onScroll(e) {
    _dbg("onScroll", e);
    return this._scroll(e);
  }
  // ========================
  // _scroll
  // ========================

// ===========================================================
// _scroll
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _scroll(e){
    //_dbg "_scroll", e
    const target = e.currentTarget || e.target.scrollingElement;
    if ((target == null)) {
      return;
    }
    if (target.scrollTop >= this._prevScroll) {
      this._fetch();
    }
    this._prevScroll = target.scrollTop;
    //@view.fireEvent _e.scroll, e
    return RADIO_BROADCAST.trigger(_e.scroll, e);
  }
  // ========================
  // _
  // ========================

// ===========================================================
// onContinue
//
// ===========================================================
  onContinue() {
    return this._fetch();
  }
  // ========================
  // _
  // ========================

// ===========================================================
// onRestart
//
// ===========================================================
  onRestart() {
    _dbg("onRestart", this._socket, this._curPage);
    this._end_of_data = false;
    if (this._socket != null) {
      this._curPage = 1;
      this._socket.set(_a.page, 1);
      return this._socket.read();
    }
  }
  // ========================
  // _onFetched
  // ========================

// ===========================================================
// _onFetched
//
// @param [Object] data
//
// ===========================================================
  _onFetched(data) {
    return this._buffer(data);
  }
  // ========================
  // _fetch
  // ========================

// ===========================================================
// _fetch
//
// @return [Object] 
//
// ===========================================================
  _fetch() {
    if (this._end_of_data) {
      _dbg(`>>KK _end_of_data at page = ${this._curPage}`);
      this.$el.off(_e.scroll, _.throttle(this._scroll, 300));
      return;
    }
    if ((this._socket == null)) {
      this.warn(WARNING.pipe.recommanded.format('auto-list'));
      return;
    }
    this._curPage++;
    this._socket.set({page:this._curPage});
    this._socket.unset('data');
    this._socket.unset('__ack__');
    this._socket.unset('_status_');
    return this._socket.read();
  }
//    try
//      @_socket.set @view.model.get(_a.extra).args
  // ========================
  // _buffer
  // ========================

// ===========================================================
// _buffer
//
// @param [Object] json
//
// @return [Object] 
//
// ===========================================================
  _buffer(json) {
    const {
      data
    } = json;
    if (_.isEmpty(data) || !_.isArray(data)) {
      this.view.triggerMethod(_e.end);
      this.view.triggerMethod(_e.bubble, json);
      this._end_of_data = true;
      return;
    }
    const modelArgs = this.view.getOption(_a.modelArgs);
    //_dbg ">>aaaa  AZAZAZ modelArgs ", data, modelArgs
    if (_.isObject(modelArgs)) {
      _.each(data, d => d = _.extend(d, modelArgs));
    }
    this.view.add(data);
    return this.view.triggerMethod(_e.bubble, json);
  }
}
__bahavior_autolist.initClass();
module.exports = __bahavior_autolist;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
