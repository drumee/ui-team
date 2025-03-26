// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/view/max-view
//   TYPE : Skelton
// ==================================================================== *

const __skl_addressbook_view_content = function(_ui_) {
  let breadcrumb;
  
  const tags = { 
    kind      : "widget_tag",
    className : "widget_tag",
    type      : _a.contact,
    sys_pn    : "widget_tag"
  };

  
  const contacts = { 
    kind      : "widget_contacts",
    className : "widget_contacts"
  };

  const contactDetail = { 
    kind      : "widget_contact_detail",
    className : "widget_contact_detail",
    sys_pn    : "contact_detail"
  };
  
  const maxContent = Skeletons.Box.X({   
    className : `${_ui_.fig.family}__max-content ${_ui_.fig.group}__max-content max-content`, 
    sys_pn    : "max-content"
  });


  const view = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__max-view ${_ui_.fig.group}__max-view`, 
    sys_pn    : "max-view",
    kids      : [
      (breadcrumb = require('../common/breadcrumbs')(_ui_)),
      require('../common/overlay-wrapper')(_ui_),
      Skeletons.Box.X({ 
        className : "tags-list",         
        sys_pn    : "tags",
        kids : [
          tags
        ]}),
      
      Skeletons.Box.X({ 
        className : "contact-wrapper",         
        sys_pn    : "contact-wrapper",
        kids : [
          // contacts
        ]}),
      maxContent
    ]});

  
  return view;
};

module.exports = __skl_addressbook_view_content;
