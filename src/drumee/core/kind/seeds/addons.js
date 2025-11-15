// On demand Classes cannot be overloaded

const Builtins = require('./builtins')
const Ondemand = require('./ondemand')

/**
 * 
 */
function register(kind, ref) {
  if (Builtins[kind]) {
    console.warn(`Kind ${kind} already registered, skipped.`);
    return;
  }
  if (_.isFunction(ref.then)) {
    Builtins[kind] = (s, f) => {
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
  if (Builtins[name]) return new Promise(Builtins[name]);
  if (Ondemand[name]) return new Promise(Ondemand[name]);
  return null;
};

module.exports = { get, register };