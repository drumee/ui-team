const bit_list = require('./list');
class __bit_radio extends bit_list {
  constructor(...args) {
    super(...args);
    this.onChildUpdate = this.onChildUpdate.bind(this);
    this._getValue = this._getValue.bind(this);
  }

  static initClass() {
  //   className : "radio"
  //   ui:
  //     list: _K.tag.ul
  // 
    this.prototype.className  = "radio";
    this.prototype.ui =
      {list: _K.tag.ul};
  }
// ========================
//
// ========================

// ===========================================================
// onChildUpdate
//
// @param [Object] cur
//
// ===========================================================
  onChildUpdate(cur){
    _dbg("_update", this, cur);
    this.collection.each(child=> {
      return child.set(_a.state, 0);
    });
    cur.model.set(_a.state, 1);
    this.render();
    this.toArgs(true);
    if (this._source != null) {
      if (this.get(_a.signal) != null) {
        this._source.triggerMethod(this.get(_a.signal), this.model);
      } else if (this.get(_a.name) != null) {
        this._source.model.set(this.get(_a.name), this.get(_a.value));
      }
    }
    if  (this.parent != null) {
      return this.parent.trigger(_e.update, this);
    } else {
      return this.trigger(_e.update);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _getValue
//
// @return [Object] 
//
// ===========================================================
  _getValue(){
    let value = null;
    //_dbg "toArgs model", @model
    this.children.each(child => {
      if (child.getState() === 1) {
        return value = child.model.get(_a.value);
      }
    });
    return value;
  }
}
__bit_radio.initClass();
module.exports = __bit_radio;
