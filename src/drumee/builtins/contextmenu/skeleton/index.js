
const __item = require('./items');


module.exports = function(ui, trigger, e) {

  let mode;
  const a = Skeletons.Box.Y({
    debug     : __filename,
    kidsOpt   : {
      uiHandler : ui
    },
    kids      : []});
  if (_.isFunction(ui.contextmenuItems)) {
    mode = ui.contextmenuItems(trigger, e);
  } else if (_.isString(ui.contextmenuItems)) {
    mode = ui.contextmenuItems.split(/[, ;:]+/);
  } else if (_.isArray(ui.contextmenuItems)) {
    mode = ui.contextmenuItems;
  }

  if(_.isEmpty(mode)) {
    return [];
  }
  if (_.isString(mode)) {
    mode = mode.split(/[, ;:]+/);
  }
  for (let n of Array.from(mode)) {
    const b = __item(ui, trigger, n);
    if (b) {
      a.kids.push(b);
    }
  }
  
  if(localStorage.getItem('debugContextmenu')) {
    const list = localStorage.getItem('debugContextmenu').split(/[ ,;:]+/);
    for (let item of Array.from(list)) { 
      a.kids.push(__item(ui, trigger, item));
    }
  }
  return a;
};