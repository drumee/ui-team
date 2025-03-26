// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/index
//   TYPE :
// ==================================================================== *

const __skl_addressbook_widget_contact_detail = function(_ui_) {
  // @debug "__skl_addressbook_widget_contact_detail", _ui_, contact
  
  let contactDetail;
  const contact = _ui_.mget(_a.contact);
  const contactFig = `${_ui_.fig.family}`;

  if (contact.is_mycontact === 0) {
    contactDetail = require('./invite')(_ui_);
  } else {
    contactDetail = require('./show')(_ui_);
  }

  const a = Skeletons.Box.Y({
    className  : `${contactFig}__main`,
    debug      : __filename,
    kids       : [
      contactDetail
    ]});
  
  return a;
};


module.exports = __skl_addressbook_widget_contact_detail;
