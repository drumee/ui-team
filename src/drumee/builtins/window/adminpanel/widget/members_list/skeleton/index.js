/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/adminpanel/widget/members_list/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_members_list  (_ui_) {
  const listFig = _ui_.fig.family;

  let tagName = LOCALE.ALL_MEMBERS

  let tagType = 'allMembers';

  if (_ui_._currentTag && _ui_._currentTag.mget(_a.name)) {
    tagName = _ui_._currentTag.mget(_a.name);
    tagType = _ui_._currentTag.mget(_a.type);
  }

  const header = Skeletons.Box.X({
    className : `${listFig}__header`,
    kids      : [
      Skeletons.Note({
        className   : `${listFig}__note title`,
        content     : tagName
      }),

      require('./add-menu').default(_ui_)
    ]
  });

  const separator = Skeletons.Box.X({
    className : `${listFig}__separator`
  });

  const contentFig = `${listFig}-content`;
  let noContentText = LOCALE.NO_MEMBERS_YET
  if (_ui_._type === 'allAdmins') {
    noContentText = LOCALE.NO_ADMINS_YET
  }

  const content = Skeletons.Box.X({
    className     : contentFig,
    radio         : 'member_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${contentFig}__items`,
        kids      : [
          Skeletons.Box.X({
            className : `${contentFig}__item`,
            kids      : [

              Skeletons.Button.Svg({
                ico       : "editbox_list-circle",
                className : `${contentFig}__icon default-avatar editbox_list-circle`,
              }),
              
              Skeletons.Note({
                className : `${contentFig}__note name`,
                content   : noContentText
              })
            ]})
        ]})
    ]});
  
  const memberList = Skeletons.List.Smart({
    className   : `${contentFig}__item list`,
    placeholder : content,
    spinner     : true,
    timer       : 50,
    sys_pn      : 'list-members',
    api         : _ui_.getAllMembers.bind(_ui_),
    itemsOpt    : { 
      kind      : 'widget_members_list_item',
      type      : _ui_._type,
      orgId     : _ui_.mget('orgId'),
      service   : "show-member-detail",
      radio     : 'member_selected_'+_ui_.mget(_a.widgetId),
      uiHandler : [_ui_]
    }
  });

  let a = Skeletons.Box.Y({
    className  : `${listFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${listFig}__container`,
        kids : [
          header,
          separator,
          memberList
        ]
      })
    ]
  })

  return a;
}

export default __skl_members_list;