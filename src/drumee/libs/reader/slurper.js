const { timestamp } = require("core/utils")

class __media_slurper extends LetcBox {
  constructor(...args) {
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onSlurp = this.onSlurp.bind(this);
    this._tick = this._tick.bind(this);
    this._setDate = this._setDate.bind(this);
    this.getContext = this.getContext.bind(this);
    this.getCurrentNid = this.getCurrentNid.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.nativeClassName  = "media-slurper";
    this.prototype.behaviorSet =
      {socket   : 1};
  }
// ===========================================================
// onAfterInitialize
//
// @param [Object] opt
//
// ===========================================================
  onAfterInitialize(opt) {
    //Type.setMapName(_a.reader)
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this._setDate();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //try
    //  @parent._handler.part.triggerMethod('part:register', @, 'slurper-pad')
    //@feed @get(_a.kids)
    this.debug("<<vvMANAGER onDomRefresh", this);
    if ((this.get(_a.kids) == null)) {
      return this.collection.set(SKL_Note(_e.error, "Should sahehave a skeleton"));
    }
  }
// ========================
//
// ========================

// ===========================================================
// onSlurp
//
// @param [Object] model
//
// ===========================================================
  onSlurp(model) {
    this.debug("<<vvMANAGER onSlurp", model, this);
    const opt = model.toJSON();
    return this.triggerMethod(_e.rpc.post, {
      method : _RPC.media.slurp,
      content : model.get(_a.value),
      nid    : this.getCurrentNid()
    }
    );
  }
    //opt.socket = model
    //@model.set(_a.aspect , _a.grid)
    //@debug "<<vvMANAGER onUploadStart", model, @
    //if not @_list?
    //  @getPart(_a.list).collection.set require('skeleton/media/upload')(@, null, {height:_a.auto})
    //  @_list = @getPart(_a.list).children.findByIndex(0)
    //@_list.prepend opt
// ============================================
//
// ============================================

// ===========================================================
// _tick
//
// @param [Object] e
//
// ===========================================================
  _tick(e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    return this.debug("<<vvMANAGER _tick", e, this);
  }
// ========================
//
// ========================

// ===========================================================
// _setDate
//
// ===========================================================
  _setDate() {
    const ctime = this.model.get(_a.createTime) || 0;
    const m = Dayjs.unix(ctime);
    this.model.set(_a.age, m.fromNow());
    this.model.set(_a.date , m.format(_K.defaults.date_format));
    return this.model.atLeast({
      date : Dayjs.unix(timestamp(1))});
  }
// ========================
//
// ========================

// ===========================================================
// getContext
//
// @return [Object] 
//
// ===========================================================
  getContext() {
    return this._context;
  }
// ========================
//
// ========================

// ===========================================================
// getCurrentNid
//
// @return [Object] 
//
// ===========================================================
  getCurrentNid() {
    const nid = Env.get(_a.currentPid) || -1;
    return nid;
  }
// ============================================
//
// ============================================

// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
  __dispatchRest(method, data) {
    _dbg(`>>KK __dispatchRest method='${method}'`, method, data, this);
    switch (method) {
      case _RPC.hub.set_profile:
        var hub = router._mainBarre._siteMenu;
        var src = hub.model.get(_a.src);
        hub.model.set(_a.src, `${src}&a=${_.uniqueId()}`);
        return hub.render();
        //RADIO_BROADCAST.trigger _e.media.update, @model
      case _RPC.media.trash: case _RPC.media.remove:
        //RADIO_BROADCAST.trigger _e.media.update, @model
        return this.trigger(_e.deleted);
      case _RPC.media.caption:
        return this.model.set(_a.caption, data.caption);
      case _RPC.media.rotate:
        this.model.set(_a.caption, data.caption);
        return this.$el.find('img').attr({
          src:`${this.model.get(_a.src)}&a=${_.uniqueId()}`});
      case _RPC.media.rename: case _RPC.media.retrieve:
        //@model.set _a.filename, data.filename
        return this._respawn(data);
      case _RPC.media.comment:
        return RADIO_BROADCAST.trigger(_e.info, _I.ACK_REQ_OK);
      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}
__media_slurper.initClass();
module.exports = __media_slurper;
