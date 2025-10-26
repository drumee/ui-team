// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/html
//   TYPE : protype extension
// ==================================================================== *

const VIEW_STYLE = "color: blue; font-weight: bold;"
const VERBOSE_STYLE = "color: orange; font-weight: bold;"
const GOSSIP_STYLE = "color: grey; font-weight: bold;"
const MODEL_STYLE = "color: green; font-weight: bold;"
const COLLECTION_STYLE = "color: orange; font-weight: bold;"
const { log } = require("../../utils");


const { LOG_NAME, LOG_LEVEL } = require("../../utils/constants");
const { info, debug, verbose, gossip } = LOG_NAME;

/**
 * 
 * @param  {...any} args 
 */
Backbone.Collection.prototype.info = function (l) {
  const name = this.constructor.name;
  if (log(info)) {
    console.log(`%c${name}:`, COLLECTION_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Model.prototype.info = function (...args) {
  const name = this.constructor.name;
  if (log(info)) {
    console.log(`%c${name}:`, MODEL_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.View.prototype.info = function (...args) {
  const name = this.constructor.name;
  if (log(info)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Collection.prototype.debug = function (l) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, COLLECTION_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Model.prototype.debug = function (...args) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, MODEL_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.View.prototype.debug = function (...args) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};


/**
 * 
 * @param  {...any} args 
 */
Backbone.Collection.prototype.verbose = function (l) {
  const name = this.constructor.name;
  if (log(verbose)) {
    console.log(`%c${name}:`, VERBOSE_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Model.prototype.verbose = function (...args) {
  const name = this.constructor.name;
  if (log(verbose)) {
    console.log(`%c${name}:`, VERBOSE_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.View.prototype.verbose = function (...args) {
  const name = this.constructor.name;
  if (log(verbose)) {
    console.log(`%c${name}:`, VERBOSE_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Collection.prototype.gossip = function (l) {
  const name = this.constructor.name;
  if (log(gossip)) {
    console.log(`%c${name}:`, GOSSIP_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.Model.prototype.gossip = function (...args) {
  const name = this.constructor.name;
  if (log(gossip)) {
    console.log(`%c${name}:`, GOSSIP_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Backbone.View.prototype.gossip = function (...args) {
  const name = this.constructor.name;
  if (log(gossip)) {
    console.log(`%c${name}:`, GOSSIP_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Marionette.Behavior.prototype.debug = function (...args) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Function.prototype.info = function (...args) {
  const name = this.constructor.name;
  if (log(info)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Function.prototype.debug = function (...args) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};

/**
 * 
 * @param  {...any} args 
 */
Window.prototype.debug = function (...args) {
  const name = this.constructor.name;
  if (log(debug)) {
    console.log(`%c${name}:`, VIEW_STYLE, ...args)
  }
};

/**
 * No operation
 */
window.noOperation = function () { };


/**
 * 
 * @param {*} v 
 */
window.setLogLevel = function (v) {
  let name;
  if (typeof (v) == 'number') {
    VERBOSITY = v;
    localStorage.logLevel = VERBOSITY;
    for (let k in LOG_LEVEL) {
      if (LOG_LEVEL[k] == v) {
        name = k;
        break;
      }
    }
  } else if (typeof (v) == 'string' && LOG_LEVEL[v]) {
    VERBOSITY = LOG_LEVEL[v];
    localStorage.logLevel = VERBOSITY;
    name = v;
  }
  console.log(`Log level is ${name} (${VERBOSITY})`)
};

