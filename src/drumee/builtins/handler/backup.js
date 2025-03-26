const { timestamp } = require("core/utils")

const handler_base = require('./handler');
class handler_backup extends handler_base {
  constructor(...args) {
    this.onDestroy = this.onDestroy.bind(this);
    this._onModelUpdate = this._onModelUpdate.bind(this);
    this._backup = this._backup.bind(this);
    this._syncOut = this._syncOut.bind(this);
    this.syncIn = this.syncIn.bind(this);
    this.preview = this.preview.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    behaviorSet({
      socket:1});
  }
//    modelEvents:
//        change: "_onModelUpdate"
// ============================
//
// ===========================

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    this._state = _a.off;
    this._backupTime = timestamp();
    this.model.set({
      version : dui.version.letc});
    return this._draft = this.getOption(_a.draft);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    return this._state = _a.off;
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// _onModelUpdate
//
// @param [Object] model
//
// ===========================================================
  _onModelUpdate(model) {
    return (() => {
      const result = [];
      const object = model.changedAttributes();
      for (var k in object) {
        var v = object[k];
        if (k === _a.mtime) {
          result.push(_dbg(`onModelUpdate *${k}* ==>`, v, model));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _backup
//
// @return [Object] 
//
// ===========================================================
  _backup() {
    if (!this.isRunning()) {
      return;
    }
    _.delay(this._backup, 10000);
    if (this._backupTime >= this.model.get(_a.mtime)) {
      return;
    }
    return this._syncOut();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _syncOut
//
// ===========================================================
  _syncOut() {
    let args;
    this._backupTime = timestamp();
    _dbg("_syncOut", args, this);
    if (_.isEmpty(this.model.get(_a.id))) {
      args = {
        api     : _RPC.layout.new,
        device  : this.model.get(_a.device),
        lang    : this.model.get(_a.lang),
        letc    : this._root.serializeData(),
        context : this.model.get(_a.context),
        screen  : this.model.get(_a.device),
        version : dui.version.letc
      };
    } else {
      args = {
        api     : _RPC.layout.backup,
        letc    : this._root.serializeData(),
        id      : this.model.get(_a.id)
      };
    }
    return this.triggerMethod(_e.rpc.post, args);
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// syncIn
//
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  syncIn(data) {
    if (((data != null ? data.ctime : undefined) == null)) {
      return;
    }
    this._backupTime = timestamp();
    this.model.set({
      id      : data.id,
      ctime   : data.ctime,
      mtime   : this._backupTime,
      status  : data.status,
      hashtag : data.hashtag
    });
    if (this._preview) {
      let href;
      this._preview = false;
      if (this.model.get(_a.status) === _a.draft) {
        href = _USING.char.diese + "---" + this.model.get(_a.id);
      } else {
        href = _USING.char.diese + this.model.get(_a.hashtag);
      }
      if ((window.open(href, '_blank') == null)) {
        return alert(LOCALE.WINDOW_BLOCKED);
      }
    }
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// preview
//
// ===========================================================
  preview() {
    this._preview = true;
    return this._syncOut();
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
    switch (method) {
      case _RPC.layout.new: case _RPC.layout.backup:
        return this.syncIn(data);
      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// start
//
// @return [Object] 
//
// ===========================================================
  start() {
    if (this.isRunning()) {
      return;
    }
    this._state = _a.on;
    this._root = this._draft.children.findByIndex(0);
    return this._syncOut();
  }
// ============================================
//
// ============================================

// ===========================================================
// stop
//
// ===========================================================
  stop() {
    return this._state = _a.off;
  }
}
handler_backup.initClass();
module.exports = handler_backup;
