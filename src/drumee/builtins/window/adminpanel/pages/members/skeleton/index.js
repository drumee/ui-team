/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/members/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_members_page  (_ui_) {
  const membersFig = `${_ui_.fig.family}`;

  const mtags = { 
    kind      : 'widget_member_tags',
    className : 'widget_member_tags',
    orgId     : _ui_.orgId
  };
  
  let a = Skeletons.Box.Y({
    className  : `${membersFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${membersFig}__container`,
        kids : [
          require('./breadcrumbs').default(_ui_),
          require('./overlay-wrapper').default(_ui_),
          
          Skeletons.Box.X({
            className : `${membersFig}__wrapper members_tags tags`,
            sys_pn    : 'members_tags',
            kids      : [
              mtags
            ]
          }),

          Skeletons.Box.X({
            className  : `${membersFig}__wrapper members_list list`,
            sys_pn     : 'members_list',
            kids:[]
          }),

          Skeletons.Box.X({
            className  : `${membersFig}__wrapper member_room room`,
            sys_pn     : 'member_room',
            kids:[]
          }),
        ]
      })
    ]
  })

  return a;
}

export default __skl_members_page;