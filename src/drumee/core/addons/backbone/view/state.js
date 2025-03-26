const { toOnOff, toggleState } = require("core/utils")

Backbone.View.prototype.setState = function(state, recursive) {
  if (recursive == null) { recursive = 0; }
  if (state === null) { 
    state = this.model.get(_a.state);
  }
  state = toggleState(state);
  if(this.mget('radioRecursive')) { 
    recursive = 1;
  }
  this.el.setAttribute(_a.data.radio, toOnOff(state));
  if (this.el.getAttribute(_a.data.radiotoggle) != null) {
    this.el.setAttribute(_a.data.radiotoggle, toOnOff(state));
  }
  this.el.setAttribute(_a.data.state, state);
  this.model.set(_a.state, state);
  if (_.isFunction(this._syncState)) {
    this._syncState(state);
  }
  if (recursive && (this.children != null ? this.children.length : undefined)) {
    return Array.from(this.children.toArray()).map((c) =>
      c.setState(state, recursive));
  }
};

// ========================
//
// ========================
Backbone.View.prototype.getState = function() {
  return this.model.get(_a.state);
};

// ========================
//
// ========================
Backbone.View.prototype.toggleState = function() {
  return this.setState(~~!this.getState());
};
