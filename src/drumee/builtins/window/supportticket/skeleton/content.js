
const __skl_addressbook_view_content = function(_ui_) {

  const maxContent = Skeletons.Box.X({   
    className : `${_ui_.fig.family}__max-content ${_ui_.fig.group}__max-content max-content`, 
    sys_pn    : "max-content",
    kids : [
        Skeletons.Note("")
      ]
    });
  
  const view = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__max-view ${_ui_.fig.group}__max-view`,
    sys_pn    : "window-body",
    kids      : [
      require('./common/breadcrumbs')(_ui_),
      require('./common/overlay-wrapper')(_ui_),

      Skeletons.Box.X({
        className : 'support-ticket-list',
        sys_pn    : 'support-ticket-wrapper',
        kids : [
          {
            kind      : 'support_ticket_list',
            className : 'support_ticket_list',
            sys_pn    : 'support_ticket_list'
          }
        ]}),
      
      maxContent
    ]});

  return view;
};

module.exports = __skl_addressbook_view_content;
