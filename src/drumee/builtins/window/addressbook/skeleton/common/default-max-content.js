// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/view/min-view
//   TYPE : Skelton
// ==================================================================== *

const __skl_addressbook_default_max_content = function(_ui_) {

  const clickText       = Skeletons.Note({
    content   : LOCALE.TO_ADD_CONTACTS_CLICK}); 

  const addContact_text = Skeletons.Note({
    content   : LOCALE.TO_ADD_CONTACTS}); 

  const menuIcon  = Skeletons.Note({
    content: LOCALE.CONTACT_PLUS,
    className : `${_ui_.fig.family}__maxview-content ${_ui_.fig.group}__note add-contacts`
  });


  const view = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__maxview-content ${_ui_.fig.group}__maxview-content`, 
    sys_pn    : "max-view-content",
    kids      : [
      // noContact
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__info-wrapper ${_ui_.fig.group}__info-wrapper info-wrapper`,
        kids:[
          clickText,
          menuIcon,
          addContact_text
        ]})
    ]});
  
  return view;
};

module.exports = __skl_addressbook_default_max_content;
