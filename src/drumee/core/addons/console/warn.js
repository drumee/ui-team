// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/debug
//   TYPE :
// ==================================================================== *

const STYLE = "color: orange; font-weight: bold;"

/**
 * 
 * @param  {...any} args 
 */
Backbone.Collection.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};

/**
 * 
 * @param  {...any} args 
 */
/**
 * 
 * @param  {...any} args 
 */
Backbone.Model.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};

/**
 * 
 * @param  {...any} args 
 */
Marionette.Behavior.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.View.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};

/**
 * 
 * @param  {...any} args 
 */
Function.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};

/**
 * 
 * @param  {...any} args 
 */
Window.prototype.warn = function (...args) {
  console.warn(`%c${this.constructor.name}:`, STYLE, ...args);
};
