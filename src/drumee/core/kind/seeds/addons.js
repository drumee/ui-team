/* ================================================================== *
#   Copyright Xialia.com  2011-2023
#   FILE : /src/drumee/core/kind/seeds/dynamic.js
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck


// On demand Classes cannot be overloaded

const a = {
}

/**
 * 
 */
function register(kind, ref){
  if (a[kind]) {
    console.warn(`Kind ${kind} already exists. Skipped`);
    return;
  }
  if (_.isFunction(ref.then)) {
    a[kind] = (s, f)=>{
      ref.then((m)=>{
        //console.log("AAA:54", m, ref);
        s(m.default)
      }).catch(f)  
    }
  }
}
/**
 * 
 * @param {*} name 
 * @returns 
 */
function get (name) {
  if(a[name]) return new Promise(a[name]);
  return null;
};
  
module.exports = {get, register};