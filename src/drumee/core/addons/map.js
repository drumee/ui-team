// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/utils
//   TYPE : 
// ==================================================================== *


// --------------------
// Add property to array
// --------------------
Map.prototype.toJSON = function(){
  let t = {};
  for(let [k, v] of this) {
    t[k] = v;
  }
  return t;
}

// --------------------
// 
// --------------------
Map.prototype.last = function(name=_a.value){
  let i = 1;
  if(name == _a.key) i = 0;
  if(name == '*') return Array.from(this)[this.size-1];
  return Array.from(this)[this.size-1][i];
}

// --------------------
// 
// --------------------
Map.prototype.first = function(name=_a.value){
  let i = 1;
  if(name == _a.key) i = 0;
  if(name == '*') return Array.from(this)[0];
  return Array.from(this)[0][i];
}
