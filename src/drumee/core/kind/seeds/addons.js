// On demand Classes cannot be overloaded

const a = require('./builtins')

/**
 * 
 */
function register(kind, ref) {
  if (a[kind]) {
    console.warn(`Kind ${kind} already exists. Skipped`);
    return;
  }
  if (_.isFunction(ref.then)) {
    a[kind] = (s, f) => {
      ref.then((m) => {
        s(m.default)
      }).catch(f)
    }
  }
}

let ondemand, builtins;
/**
 * 
 * @param {*} name 
 * @returns 
 */
function get(name) {
  if (a[name]) return new Promise(a[name]);

  if (!ondemand) ondemand = require('./ondemand');
  if (ondemand[name]) return new Promise(ondemand[name]);

  if (!builtins) builtins = require('./builtins')
  if (builtins[name]) return new Promise(builtins[name]);

  return null;
};

module.exports = { get, register };