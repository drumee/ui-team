// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *
// channel = _.uniqueId('step-')
const _block = require('../step');

const __account_data_backup_steps = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const a = Skeletons.Box.X({
    className : `${pfx}__steps`,
    sys_pn    : "steps-box",
    partHandler : [_ui_],
    kids      : [ 
      _block(_ui_, 1, LOCALE.BACKUP_PREPARE),
      _block(_ui_, 2, LOCALE.BACKUP_DOWNLOAD)
    ]});
  return a; 
};

module.exports = __account_data_backup_steps;
