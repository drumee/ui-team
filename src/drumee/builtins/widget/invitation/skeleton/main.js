const __invitation_main = function (_ui_) {

  let a;
  if (_ui_.editable) {
    a = require('./maiden')(_ui_);
  } else {
    a = Skeletons.Note();
  }
  return a;
};
module.exports = __invitation_main;
