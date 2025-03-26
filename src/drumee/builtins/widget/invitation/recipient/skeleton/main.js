// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/common/contact-found
//   TYPE : 
// ==================================================================== *

const __invitation_recipient=function(_ui_){
  // item_avatar = SKL_Note(null, '', { 
  //   active    : 0
  //   className :    "share-info__avatar"
  //   styleOpt  :
  //     'background-image'   : "url(#{_ui_.url})"
  //     'background-size'    : "cover"
  //     'background-repeat'  : "no-repeat"
  //     'background-position': _K.position.center
  // })
  const item_text = Skeletons.Box.Y({
    className : "sharee-contact__user-details",
    debug     : __filename,
    kidsOpt   : {
      active      : 0
    },
    kids: [
      Skeletons.Note(_ui_.name,'sharee-contact__user-fullname'),
      Skeletons.Note(_ui_.email,'sharee-contact__user-email')
    ]});

  const a = [item_text];
  return a;
};
module.exports = __invitation_recipient;
