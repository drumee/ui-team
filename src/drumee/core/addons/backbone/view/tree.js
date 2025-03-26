const { timestamp } = require("core/utils")

// ========================
//
// ========================
Backbone.View.prototype.getIndex = function() {
  if (((this.parent != null ? this.parent.collection : undefined) == null)) {
    return -1;
  }
  return this.parent.collection.findIndex(this.model);
};

// ========================
//
// ========================
Backbone.View.prototype.contains = function(e) {
  let p = e.parent; 
  while (p) { 
    if (p.cid === this.cid) {
      return true; 
    }
    p = p.parent;
  }
  return false; 
};

// ========================
//
// ========================
Backbone.View.prototype.getParentByKind = function(kind) {
  let p = this.parent; 
  while (p) { 
    if (p.mget(_a.kind) === kind) {
      return p; 
    }
    p = p.parent;
  }
  return null;
};


// ========================
//
// ========================
Backbone.View.prototype.getSiblings = function(index) {
  if (!this.parent) {
    return [];
  }
  if (index != null) {
    return this.parent.children.findByIndex(index);
  }
  return this.parent._getImmediateChildren();
};


// # ========================
// #
// # ========================
// Backbone.View.prototype.report = (error, stack, data) ->
//   if window.Exception?
//     opt = 
//       url       : location.href
//       error     : error
//       stack     : stack
//       name      : @constructor.name
//       timestamp : timestamp()
//     if data?
//       opt =  _.merge(opt, data)
//     Exception.wakeup(opt)
//   else 
//     console.warn "Exception hanlder not available", error, stack, data
