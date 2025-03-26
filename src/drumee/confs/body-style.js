// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE :src/drumee/confs/body-style
//   TYPE :
// ==================================================================== *

const __body_style = function(name) {
  //@debug "ZZZ32 888 ", name
  let a = {'background-color' : 'rgb(248, 250, 252)'};
  switch (name) {
    case 'creator':
      a = {'background-color' : 'rgb(248, 250, 252)'};
      break;
    case 'preview':
      a = {'background-color' : 'rgb(255, 255, 255)'};
      break;
    default: 
      a = {'background-color' : 'rgb(248, 250, 252)'};
  }
  //@debug "ZZZ32 16 ", a
  return a; 
};
module.exports = __body_style;
