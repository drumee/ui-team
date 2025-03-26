class __history_handler extends Backbone.Model {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.log = this.log.bind(this);
    this._old_log = this._old_log.bind(this);
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
    this._old_undo = this._old_undo.bind(this);
    this.undo = this.undo.bind(this);
    this._old_redo = this._old_redo.bind(this);
    this.redo = this.redo.bind(this);
    this.restart = this.restart.bind(this);
    this._onChange = this._onChange.bind(this);
  }

  initialize() {
    this._log = [];
    this._pointer = 0;
    return this.set({
      active  : 0});
  }
    //@on _e.change, @_onChange
// ==================== *
//
// ==================== *

// ===========================================================
// log
//
// @param [Object] snapshot
//
// @return [Object] 
//
// ===========================================================
  log(snapshot){
    if (!this.get(_a.active)) {
      return;
    }
    if(this._pointer<(this._log.length-1)) {
        this._log = this._log.slice(0, this._pointer+1);
        this._pointer++;
      }
    this._log.push(snapshot);
    this._pointer=this._log.length-1;
    return this.debug(`STORE pointer=${this._pointer}`,  this._log.length,  this._log);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _old_log
//
// @param [Object] str
//
// @return [Object] 
//
// ===========================================================
  _old_log(str){
    if (!this.get(_a.active)) {
      return;
    }
    if (this._pointer > (this._log.length - 1)) {
      this._pointer = (this._log.length - 1);
    }
    this._log = this._log.splice(0, this._pointer+1);
    this._log.push(str);
    this._pointer = this._log.length - 1;
    return this.debug(`LOG pointer=${this._pointer}`,  this._log.length,  this._log);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// stop
//
// ===========================================================
  stop(){
    this.debug("LOG stop");
    return this.set(_a.active, 0);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// start
//
// ===========================================================
  start(){
    this.debug("LOG start");
    return this.set(_a.active, 1);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _old_undo
//
// @return [Object] 
//
// ===========================================================
  _old_undo(){
    this._pointer--;
    if (this._pointer < 0) {
      this._pointer = 0;
    }
    return this._log[this._pointer];
  }
// ==================== *
//
// ==================== *

// ===========================================================
// undo
//
// @return [Object] 
//
// ===========================================================
  undo(){
    if (this._pointer>0) {
      const cur = this._log[this._pointer-1];
      this._pointer--;
      this.debug(('undo '+this._log.length+" "+this._pointer));
      return cur;
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _old_redo
//
// @return [Object] 
//
// ===========================================================
  _old_redo(){
    this._pointer++;
    if (this._pointer >= (this._log.length - 1)) {
      this._pointer = (this._log.length - 1);
    }
    return this._log[this._pointer];
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
    const cur = this._log[this._pointer+1];
    if (cur) {
      this._pointer++;
      this.debug(('redo '+this._log.length+" "+this._pointer));
      return cur;
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// restart
//
// ===========================================================
  restart(){
    this._log = [];
    this._pointer = 0;
    return this.set({
      active  : 1,
      entry   : null
    });
  }
// ==================== *
//
// ==================== *

// ===========================================================
// _onChange
//
// @return [Object] 
//
// ===========================================================
  _onChange(){
    if (!this.get(_a.active)) {
      return;
    }
    this.debug("_onChange");
    return (() => {
      const result = [];
      const object = this.changedAttributes();
      for (var k in object) {
        var v = object[k];
        switch (k) {
          case _a.entry:
            this._log.push(v);
            this._pointer = this._log.length - 1;
            break;
        }
        result.push(this.debug("_onChange", k,v));
      }
      return result;
    })();
  }
}
module.exports = __history_handler;
