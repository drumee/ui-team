
// -----------------------------------------

const slkOtp = function (_ui_, args ) {
  let prefix = _ui_.fig.family;
  let {otp} = Visitor.profile();
  let button;
  // if(!otp || otp == 0){
  //   button = Skeletons.Note({
  //     className: `${prefix}__status button enable`,
  //     content: LOCALE.ENABLE,
  //     service : _e.enable
  //   })
  // }else{
  //   button = Skeletons.Note({
  //     className: `${prefix}__status button disable`,
  //     content: LOCALE.DISBALE,
  //     service : _e.disable
  //   })
  // }
  let items = require('./items')(_ui_)
  return Skeletons.Box.Y({
    className: `${prefix}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${prefix}__content`,
        sys_pn : _a.content,
        kids: items
      }),
    ]
  });

};

module.exports = slkOtp;
