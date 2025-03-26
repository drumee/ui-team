const { timestamp } = require("core/utils")

const handler_base = require('../handler.coffee');
class __history extends handler_base {
// ============================
//
// ===========================

// ===========================================================
// initialize
//
// @return [Object] 
//
// ===========================================================
  constructor(...args) {
    this.onDestroy = this.onDestroy.bind(this);
    this.log = this.log.bind(this);
    this.start = this.start.bind(this);
    this.reset = this.reset.bind(this);
    this.restart = this.restart.bind(this);
    this._do = this._do.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this.hasChanged = this.hasChanged.bind(this);
    super(...args);
  }

  initialize() {
    this.model.set({
      version : dui.version.letc});
    if ((typeof designer === 'undefined' || designer === null)) {
      _c.error("designer not found");
      return;
    }
    this._state = _a.off;
    return this._history = {
      pointer : 0,
      log     : [],
      state   : _a.on
    };
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    this._state = _a.off;
    this._history.log = null;
    return this._history     = null;
  }
// ======================================================
//
// ======================================================

// ===========================================================
// log
//
// @param [Object] action
//
// @return [Object] 
//
// ===========================================================
  log(action) {
    if (!this.isRunning()) {
      return;
    }
    //_dbg ">>1222 undo pointer=#{@_history.pointer}", @_histor
    this.model.set(_a.mtime, timestamp());
    this._history.log.push(designer.snapShot());
    return this._history.pointer = this._history.log.length - 1;
  }
// ======================================================
//
// ======================================================

// ===========================================================
// start
//
// @param [Object] action
//
// ===========================================================
  start(action) {
    this.control(_a.on);
    this._history.pointer = 0;
    this._root = this._draft.children.findByIndex(0);
    return this._history.log = [designer.snapShot()];
  }
// ======================================================
//
// ======================================================

// ===========================================================
// reset
//
// @param [Object] action
//
// ===========================================================
  reset(action) {
    this._history.log = [];
    return this._history.pointer = 0;
  }
// ======================================================
//
// ======================================================

// ===========================================================
// restart
//
// ===========================================================
  restart() {
    this.reset();
    return this.start();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _do
//
// @param [Object] incr
//
// ===========================================================
  _do(incr) {
    this.control(_a.off);
    //_dbg ">>1222 undo pointer=#{@_history.pointer}", @_history
    if (this._history.log[this._history.pointer + incr] != null) {
      this._history.pointer = this._history.pointer + incr;
      designer.draw(this._history.log[this._history.pointer]);
    }
    return this.control(_a.on);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// undo
//
// ===========================================================
  undo() {
    return this._do(-1);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// redo
//
// ===========================================================
  redo() {
    return this._do(1);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// hasChanged
//
// @return [Object] 
//
// ===========================================================
  hasChanged() {
    return (this._history.log.length - 1);
  }
}
module.exports = __history;
