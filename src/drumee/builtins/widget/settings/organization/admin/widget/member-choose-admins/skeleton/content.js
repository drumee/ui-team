// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE :/src/drumee/builtins/window/adminpanel/widget/member-choose-admins/skeleton/content.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_chooseAdmins_content (_ui_) {

  const contentFig = `${_ui_.fig.family}`;

  const search = Skeletons.Entry({
    className   : `${contentFig}__search`,
    formItem    : _a.search,
    sys_pn      : 'member-search-input',
    placeholder : LOCALE.SEARCH_MEMBER,
    mode        : _a.interactive,
    interactive : 1,
    preselect   : 1,
    service     : _e.search,
    uiHandler   : _ui_
  });
  
  const searchWrapper = Skeletons.Box.X({
    className  : `${contentFig}__search-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico       : 'magnifying-glass',
        className : `${contentFig}__icon search-icon magnifying-glass`,
      }),
      search
    ]
  })
  
  const memberListItemFig = 'widget-members-listItem';    // do not remove
  const noMember = Skeletons.Box.X({
    className     : `${memberListItemFig}__main`,
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${memberListItemFig}__container`,
        kids      : [
          Skeletons.Box.X({
            className : `${memberListItemFig}__list`,
            kids      : [

              Skeletons.Button.Svg({
                ico       : 'editbox_list-circle',
                className : `${memberListItemFig}__icon display-icon default-icon editbox_list-circle`
              }),
              
              Skeletons.Note({
                className : `${memberListItemFig}__note name choose-admin`,
                content   : LOCALE.NO_MEMBERS_FOUND
              })
            ]})
        ]})
    ]});

  const membersList = Skeletons.List.Smart({
    className   : `${contentFig}__list members-list`,
    placeholder : noMember,
    spinner     : true,
    formItem    : 'members',
    dataType    : _a.array,
    timer       : 50,
    itemsOpt    : {
      kind        : 'widget_members_list_item',
      type        : 'choose-admin',
      selectedList : _ui_._selectedMembers,
      orgId       : _ui_.mget('orgId'),
      _service    : 'trigger-admin-select',
      uiHandler   : [_ui_]
    },
    sys_pn      : 'members-list',
    api         : _ui_.getNonAdminMembers.bind(_ui_)
  });

  const a = Skeletons.Box.Y({
    className   : `${contentFig}__members-content`,
    debug       : __filename,
    sys_pn      : 'choose-admin-content',
    kids        : [
      searchWrapper,
      membersList
    ]});

  return a;
};

export default __skl_widget_chooseAdmins_content;