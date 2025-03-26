//########################################
class backtrack extends Backbone.Model {
// ========================
//
// ========================

// ===========================================================
// initialize
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this._serialize = this._serialize.bind(this);
    this._record = this._record.bind(this);
    this._unserialize = this._unserialize.bind(this);
    this._restore = this._restore.bind(this);
    this.log_test = this.log_test.bind(this);
    this.__log__ = this.__log__.bind(this);
    this.beforeChange = this.beforeChange.bind(this);
    this.afterChange = this.afterChange.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this._currentId = this._currentId.bind(this);
    this._currentPtr = this._currentPtr.bind(this);
  }

  initialize() {
    this._log = [];
    this._pointer = 0;
    this._data = {};
    return this._last_cid = _.uniqueId();  // last change id seen
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _serialize
//
// @param [Object] row
//
// @return [Object]
//
// ===========================================================
  _serialize(row){
    let data;
    let e;
    const {
      view
    } = row;
    const {
      action
    } = row;
    let letc = null;
    this.debug(`Serialized : action=${action}`, view);
    switch (action) {
      case _e.reorder: case _e.add:
        data = view.serializeData(_a.kids);
        break;
      case _e.remove:
        try {
          data = view.parent.serializeData(_a.kids);
        } catch (error) {
          e = error;
          data = view.serializeData(_a.kids);
        }
        break;
      case _e.change: case _e.update:
        try {
          data = view.parent.serializeData(_a.kids);
        } catch (error1) {
          e = error1;
          data = view.serializeData(_a.kids);
        }
        break;
      case _e.edit:
        data = view._serialize();
        break;
      default:
        this.warn(WARNING.bad_value.format(action, view.cid), this);
    }
    if (data != null) {
      //@debug "Serialized : ", data #, JSON.parse(JSON.stringify(data))
      data = Type.convert(data, _a.designer);
      //@debug "Serialized : 1111", JSON.parse(JSON.stringify(data))
      letc = JSON.stringify(data);
    }
    return letc;
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _record
//
// @param [Object] rows
//
// @return [Object]
//
// ===========================================================
  _record(rows){
    const change_id = _.uniqueId("rec-");
    const data = [];
    for (var row of Array.from(rows)) {
      var a = {
        view   : row.view,
        action : row.action,
        letc   : this._serialize(row)
      };
      data.push(a);
    }
    this._data[change_id] = {
      rows   : data,
      cid    : change_id
    };
    return change_id;
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _unserialize
//
// @param [Object] row
//
// @return [Object]
//
// ===========================================================
  _unserialize(row){
    let data;
    const {
      view
    } = row;
    const {
      action
    } = row;
    const {
      letc
    } = row;
    try {
      data = JSON.parse(letc);
    } catch (e) {
      data = null;
    }
    switch (action) {
      case _e.reorder: case _e.add:
        if ((data == null)) {
          return view.collection.reset();
        } else {
          return view.collection.set(data);
        }
      case _e.remove: case _e.change: case _e.update:
        if ((data == null)) {
          return view.parent.collection.reset();
        } else {
          return view.parent.collection.set(data);
        }
      default:
        this.warn(WARNING.bad_value.format(action, rows.cid), this);
        return;
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _restore
//
// @param [Object] cid
//
// @return [Object]
//
// ===========================================================
  _restore(cid){
    const data = this._data[cid];
    if ((data == null)) {
      this.warn(`No history for cid ${cid}`, data);
      return;
    }
    if (cid !== data.cid) {
      this.warn("cid don't match", data);
    }
    this.debug(`RESTORE pointer=${cid}`);
    for (var row of Array.from(data.rows)) {
      this._unserialize(row);
    }
    this.trigger(_e.change);
    return cid;
  }
// ==================== *
//
// ==================== *

// ===========================================================
// log_test
//
// @param [Object] obj
// @param [Object] action
//
// ===========================================================
  log_test(obj, action){
    this.__log__(Visitor, 'test', _a.before);
    return this.__log__(Visitor, 'test', _a.after);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// __log__
//
// @param [Object] rows
// @param [Object] state
//
// @return [Object]
//
// ===========================================================
  __log__(rows, state){
    let cid;
    this._last = 'log';
    if(this._pointer<(this._log.length-1)) {
        this._log = this._log.slice(0, this._pointer+1);
        this._pointer++;
      }
    // before change
    if (state === _a.before) {
      if (this._swap_id === this._last_cid) {
        // current state has already been stored
        return;
      }
      cid = this._record(rows);
    // after change
    } else {
      cid = this._record(rows);
      this._last_cid = cid;
      this._swap_id = cid;
    }
    this._log.push(cid);
    this._pointer=this._log.length-1;
    return this.debug(`STORE pointer=${this._pointer}`,  this._log.length,  this._log);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// beforeChange
//
// @param [Object] rows
//
// ===========================================================
  beforeChange(rows){
    return this.__log__(rows, _a.before);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// afterChange
//
// @param [Object] rows
//
// ===========================================================
  afterChange(rows){
    this.__log__(rows, _a.after);
    return this.trigger(_e.change);
  }

// ===========================================================
// undo
//
// @return [Object]
//
// ===========================================================
  undo(){
    const ptr = this._currentPtr()-1;
    const cid = this._log[ptr];
    if ((cid == null)) {
      _c.info("No more undo information");
      return;
    }
    this._restore(cid);
    this._pointer = ptr;
    this._last = 'undo';
    this.debug(`Backward to cid=${cid}`);
    return cid;
  }
// ==================== *
//
// ==================== *

// ===========================================================
// redo
//
// @return [Object]
//
// ===========================================================
  redo(){
    const ptr = this._currentPtr()+1;
    const cid = this._log[ptr];
    if ((cid == null)) {
      _c.info("No more redo information");
      return;
    }
    this._restore(cid);
    this._pointer = ptr;
    this._last = 'redo';
    this.debug(`Forward to cid=${cid}`);
    return cid;
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _currentId
//
// @return [Object]
//
// ===========================================================
  _currentId(){
    return this._log[this._pointer];
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _currentPtr
//
// @return [Object]
//
// ===========================================================
  _currentPtr(){
    return this._pointer;
  }
}
const __backtrack = new backtrack();
module.exports = __backtrack;
