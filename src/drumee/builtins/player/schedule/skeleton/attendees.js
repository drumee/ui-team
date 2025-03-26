// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/player/schedule/skeleton/attendees.coffee
//   TYPE : 
// ==================================================================== *

const __skl_schedule_details = function(_ui_) {
    //uiHandler : [_ui_]    
    
    //sys_pn    : "ref-invitation"
  let buttonsList, rowClass;
  const pfx = _ui_.fig.family;

  if (_ui_._attendeesMode !== _a.edit) {
    rowClass = 'view-mode';
    buttonsList = [
      Skeletons.Note({
        content : LOCALE.MODIFY_LIST, //'Modify List',
        className : "button text secondery",
        service   : 'edit-attendees'
      })
      
    ];
  } else { 
    rowClass = 'edit-mode';
    buttonsList = [
      Skeletons.Note({
        content : LOCALE.CANCEL, //'Cancel',
        className : "button text secondery",
        service   : 'cancel-edit-attendees'
      }),
      Skeletons.Note({
        content : LOCALE.SAVE_LIST, //'Save List'
        className : "button text primary",
        service   : 'save-attendees'
      })
    ];
  }

  const buttons = Skeletons.Box.X({
    className   : `${pfx}__buttons`,
    kids        : buttonsList
  });
 
  const attendees = Skeletons.Box.X({
    className   : `${pfx}__container attendees `,
    kids        : [
      Skeletons.Button.Svg({
        ico       : "desktop_contact",//two-users"
        className : `${pfx}__icon contact`
      }),
      {
        kind          : 'widget_simple_invitation',
        selectedEmail : _ui_.mget(_a.attendees) || [],
        sys_pn        : 'widget_invitation-email',
        uiHandler     : [_ui_],
        preselect     : 1,
        mode          : _ui_._attendeesMode || _a.readonly,
      }
    ]});

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${pfx}__attendees-main`, 
    kids        : [
      attendees,
      buttons
    ]});
  
  return a;
};
  
module.exports = __skl_schedule_details;
