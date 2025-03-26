/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/backbone/view
//   TYPE :
// ==================================================================== *

const Matrix = require('transformation-matrix');

//########################################
// View.Style
//########################################
// ========================
//
// ========================
Backbone.View.prototype.cover = function() {
  // Hide the object
  //
  return this.$el.attr(_a.data.hide, _a.yes);
};

// ========================
//
// ========================
Backbone.View.prototype.uncover = function() {
  return this.$el.attr(_a.data.hide, _a.no);
};

// ========================
//
// ========================
Backbone.View.prototype.getZindex = function() {
  const i = parseInt(this.style.get(_a.zIndex));
  if (_.isFinite(i)) {
    return i;
  }
  return 0;
};

// ========================
//
// ========================
Backbone.View.prototype.isRotated = function() {
  let t = this.style.get(_a.transform);
  if ((t == null)) { 
    return 0;
  }
  try { 
    t = Matrix.fromString(t);
    const angle = Math.round(Math.atan2(t.b, t.a) * (180/Math.PI));   
    return angle;
  } catch (e) {
    return 0;
  }
  return 0;
};

// ========================
//
// ========================
Backbone.View.prototype.isFlipped = function(axis) {
  let t;
  try {
    t = Matrix.fromString(this.style.get(_a.transform));
  } catch (error) { 
    t = Matrix.identity();
  }
  switch (axis) {
    case _a.horizontal: case _a.x:
      return t.a < 0; //is -1
      break;
    case _a.vertical: case _a.y:
      return t.d < 0; // is -1
      break;
  }
  return false;
};


// ========================
//
// ========================
Backbone.View.prototype.setStyle = function(opt) {
  return (this.$el != null ? this.$el.css(opt) : undefined);
};

// ========================
//
// ========================
Backbone.View.prototype.updateStyle = function(opt) {
  if (_.isArray(opt)) {
    this.warn("Invalid arguments : array passed");
    return;
  }
  if (_.isString(opt)) {
    this.style.set(arguments['0'], arguments['1']);
  } else {
    this.style.set(opt);
  }
  this.refresh();
  return this.triggerMethod(_e.refresh);
};


// ========================
//
// ========================
Backbone.View.prototype.getStyle = function() {
  return this.style.toJSON();
};

// ========================
//
// ========================
Backbone.View.prototype.getActualStyle = function(name) {
  if (name != null) {
    return window.getComputedStyle(this.el)[name];
  }
  return window.getComputedStyle(this.el);
};

// ========================
//
// ========================
Backbone.View.prototype.getActualStyles = function(names) {
  let style;
  if (Utils.Text.isSelected()) {
    style = window.getComputedStyle(document.getSelection().focusNode.parentElement);
  } else {
    style = window.getComputedStyle(this.el);
  }
  if ((names == null)) {
    return style;
  }
  const opt = {};
  for (var k of Array.from(names)) {
    var value = style[k];
    if (value != null) {
      value  = value.replace(/(^[\'\"])|([\'\"]$)/g, _K.char.empty);
      opt[k] = value;
    }
  }
  return opt;
};

// ========================
//
// ========================
Backbone.View.prototype.renderPseudo=function(){
  if (!this.mget(_a.pseudo)) {
    return;
  }
  return Array.from(this.$el.find("[data-pseudo]")).map((el) =>
    el.pseudoStyle());
};


