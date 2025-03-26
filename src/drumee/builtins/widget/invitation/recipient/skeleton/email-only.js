// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/invitation/recipient/skeleton/email-only
//   TYPE : 
// ==================================================================== *

const __invitation_recipient_email_only=function(manager){
  const data = manager.model.toJSON();
  const a = SKL_Box_V(this, {
    className: `${data.figPrefix}__inner`,//"sharee-contact__user-details"
    debug    : __filename,
    kidsOpt: {
      active      : 0
    },
    kids: [
      SKL_Note(null, manager.email, {
        className: `${data.figPrefix}__item`//'tmp__ sharee-contact__user-email'
      })
    ]
  });

  return a;
};
module.exports = __invitation_recipient_email_only;
