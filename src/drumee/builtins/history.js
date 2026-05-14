class __history_handler extends Backbone.Model {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.log = this.log.bind(this);
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
    this.undo = this.undo.bind(this);
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

  /**
   * 
   * @param {*} snapshot 
   * @returns 
   */
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


  /**
   * 
   * @returns 
   */
  stop(){
    return this.set(_a.active, 0);
  }

  /**
   * 
   * @returns 
   */
  start(){
    return this.set(_a.active, 1);
  }


  /**
   * 
   * @returns 
   */
  undo(){
    if (this._pointer>0) {
      const cur = this._log[this._pointer-1];
      this._pointer--;
      return cur;
    }
  }


  /**
   * 
   * @returns 
   */
  redo(){
    const cur = this._log[this._pointer+1];
    if (cur) {
      this._pointer++;
      return cur;
    }
  }

  /**
   * 
   * @returns 
   */
  restart(){
    this._log = [];
    this._pointer = 0;
    return this.set({
      active  : 1,
      entry   : null
    });
  }

  /**
   * 
   * @returns 
   */
  _onChange(){
    if (!this.get(_a.active)) {
      return;
    }
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
