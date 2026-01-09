// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/view/max-view
//   TYPE : Skelton
// ==================================================================== *

const __skl_addressbook_view_content = function(_ui_) {
  const contacts = { 
    kind      : "widget_contacts",
    className : "widget_contacts"
  };

  // Search input below topbar
  const searchInput = require('../common/search')(_ui_);

  const view = Skeletons.Box.Y({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__max-view ${_ui_.fig.group}__max-view`, 
    sys_pn    : "max-view",
    kids      : [
      require('../common/overlay-wrapper')(_ui_),
      searchInput,
      Skeletons.Box.X({ 
        className : "contact-wrapper",         
        sys_pn    : "contact-wrapper",
        kids : [
          contacts
        ]})
    ]});

  
  return view;
};

module.exports = __skl_addressbook_view_content;
