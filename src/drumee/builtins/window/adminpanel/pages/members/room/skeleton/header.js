// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/room/skeleton/header.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_members_room_header (ui) {
  const headerFig = `${ui.fig.family}-header`;
  
  let titleContent, titleIcon, actionIcon, drumateId, roleAutoSave, roleFetch;
  
  if (ui.mget(_a.type) == 'member_create') {
    titleContent = LOCALE.CREATE_MEMBER //'Create a member'
    roleAutoSave = 0
    roleFetch = 0

  } else {
    const data = ui.mget(_a.member) || ui._currentData.model.attributes || ''

    const fname = data.firstname  || '';
    const lname = data.lastname  || '';
    const fullname = data.fullname || (fname  + " " + lname);
    titleContent = fullname
    drumateId = data.drumate_id

    titleIcon = Skeletons.UserProfile({
      className : `${headerFig}__profile`,
      id        : drumateId,
      firstname : fname,
      lastname  : lname,
      fullname  : fullname
    });

    if (ui._type == 'member_detail') {
      actionIcon = Skeletons.Box.X({
        className   : `${headerFig}__wrapper options-right`,
        kids        : [
          require('./action-menu').default(ui, data)
        ]
      });
    }
  }
 
  const title = Skeletons.Box.X({
    className   : `${headerFig}__title`,
    kids        : [
      titleIcon,

      Skeletons.Note({
        className   : `${headerFig}__note title`,
        content     : titleContent
      })
    ]
  });

  if (ui._type == 'member_edit') {
    roleAutoSave = 0
    roleFetch = 1
  }

  const roleMenu = {
    kind       : 'widget_member_roles_menu',
    sys_pn     : 'member-role-menu',
    className  : `${headerFig}__wrapper options-left`,
    userId     : drumateId,
    orgId      : ui.mget('orgId'),
    autoSave   : roleAutoSave,
    fetchRoles : roleFetch
  }
  
  const a = Skeletons.Box.X({
    className   : headerFig,
    debug      : __filename,
    sys_pn      : 'members_room_header',
    kids        : [
      roleMenu,
      title,
      actionIcon
    ]
  })
  
  return a;
};

export default __skl_members_room_header;