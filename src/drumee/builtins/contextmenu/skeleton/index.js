
const __item = require('./items');

const __window_contextmenu = function(_ui_, trigger, e) {

  let mode;
  const a = Skeletons.Box.Y({
    debug     : __filename,
    kidsOpt   : {
      uiHandler : _ui_
    },
    kids      : []});
  if (_.isFunction(_ui_.contextmenuItems)) {
    mode = _ui_.contextmenuItems(trigger, e);
  } else if (_.isString(_ui_.contextmenuItems)) {
    mode = _ui_.contextmenuItems.split(/[, ;:]+/);
  } else if (_.isArray(_ui_.contextmenuItems)) {
    mode = _ui_.contextmenuItems;
  }

  if(_.isEmpty(mode)) {
    return [];
  }
  if (_.isString(mode)) {
    mode = mode.split(/[, ;:]+/);
  }
  for (let n of Array.from(mode)) {
    const b = __item(_ui_, trigger, n);
    if (b) {
      a.kids.push(b);
    }
  }
  
  if(localStorage.getItem('debugContextmenu')) {
    const list = localStorage.getItem('debugContextmenu').split(/[ ,;:]+/);
    for (let item of Array.from(list)) { 
      a.kids.push(__item(_ui_, trigger, item));
    }
  }
  return a;
};

module.exports = __window_contextmenu;