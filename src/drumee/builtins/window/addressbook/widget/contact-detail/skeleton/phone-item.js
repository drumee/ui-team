// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/phone-item
//   TYPE :
// ==================================================================== *

// ===========================================================
// 
// ===========================================================
const __skl_contact_detail_phone_item = item => {   
  const contactFig  =  'widget-contact-detail';

  const phoneNo = item.areacode + item.phone;

  const phoneItemsOpt = Skeletons.Box.X({
    className   : `${contactFig}__item`,
    debug       : __filename,
    kids        : [
      Skeletons.Note({
        className         : `${contactFig}__note details phone selectable-text-all`,
        content           : phoneNo,
        escapeContextmenu : true
      }),
      
      Skeletons.Note({
        className   : `${contactFig}__note category label`,
        content     : item.category
      })
    ]});
  
  return phoneItemsOpt;
};

module.exports = __skl_contact_detail_phone_item;