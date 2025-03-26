const ANIM='bhv_anim';
//########################################
// Wrapper
//
//########################################
class __bhv_wrapper extends Marionette.Behavior {
// ==================== *
//
// ==================== *

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this._handleEmptyNess = this._handleEmptyNess.bind(this);
    this._remove = this._remove.bind(this);
    this._add = this._add.bind(this);
    this.onRemoveChild = this.onRemoveChild.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this.onRender = this.onRender.bind(this);
  }

  _handleEmptyNess(evt){
    const c = this.view.collection;
    const l = this.view.children.last();
    if (l != null ? l.isKindLoader : undefined) {
      if (evt === _e.remove) {
        this.el.setAttribute(_a.data.state, _a.closed);
      }
      return;
    }
    if (c.length === 0) {
      this.el.setAttribute(_a.data.state, _a.closed);
      return;
    }
    return this.el.setAttribute(_a.data.state, _a.open);
  }

// ===========================================================
//
// ===========================================================
  _remove(){
    return this._handleEmptyNess(_e.remove);
  }

// ===========================================================
//
// ===========================================================
  _add(){
    return this._handleEmptyNess(_e.add);
  }


// ===========================================================
//
// ===========================================================
  onRemoveChild(child) {
    return this._handleEmptyNess();
  }
    
// ===========================================================
//
// ===========================================================
  onDestroy(a) {
    const c = this.view.collection;
    c.off(_e.remove, this._remove.bind(this));
    c.off(_e.reset, this._remove.bind(this));
    return c.off(_e.add, this._add.bind(this));
  }

// ===========================================================
//
// ===========================================================
  onRender(a) {
    const state = this.view.model.get(_a.initialState) || this.view.model.get(_a.state);
    const c = this.view.collection;
    if (state != null) {
      this.el.setAttribute(_a.data.state, state);
    } else {
      if (c.length) { 
        this.el.setAttribute(_a.data.state, _a.open);
      } else { 
        this.el.setAttribute(_a.data.state, _a.closed);
      }
    }

    c.on(_e.remove, this._remove.bind(this));
    c.on(_e.reset, this._remove.bind(this));
    return c.on(_e.add, this._add.bind(this));
  }
}


module.exports = __bhv_wrapper;
