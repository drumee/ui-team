// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/core/utils
//   TYPE : 
// ==================================================================== *

/**
 * 
 */
 Number.prototype.printf = function (...args) {
  return this.toString().printf(...args);
}

/**
 * 
 */
Number.prototype.px = function (...args) {
  return this.toString() + 'px';
}

/**
 * 
 */
Number.prototype.rem = function (...args) {
  return this.toString() + 'rem';
}

/**
 * 
 */
Number.prototype.em = function (...args) {
  return this.toString() + 'em';
}

/**
 * 
 */
Number.prototype.deg = function (...args) {
  return this.toString() + 'deg';
}
