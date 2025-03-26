// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/address-item
// ==================================================================== *

const __skl_contact_detail_address_item = item => {   
  const family  =  'addressbook-widget-contact-detail';

  const addressItemsOpt = Skeletons.Box.X({
    className  : `${family}__items address`,
    debug      : __filename,
    kids       : [
      Skeletons.Button.Svg({
        ico         : "ab_address",
        className   : `${family}__icon ab_address`
      }), //account_phone"

      Skeletons.Box.Y({
        className         : `${family}__address selectable-text`,
        kids       : [
          Skeletons.Note({
            className         : `${family}__note address details street`,
            content           : item.street,
            escapeContextmenu : true
          }),
          
          Skeletons.Note({
            className         : `${family}__note details address city`,
            content           : item.city,
            escapeContextmenu : true
          }),
          
          Skeletons.Note({
            className         : `${family}__note details address country`,
            content           : item.country,
            escapeContextmenu : true
          })
        ]}),
      
      Skeletons.Note({
        className   : `${family}__note category label`,
        content     : item.category
      })
    ]});
  
  return addressItemsOpt;
};

module.exports = __skl_contact_detail_address_item;