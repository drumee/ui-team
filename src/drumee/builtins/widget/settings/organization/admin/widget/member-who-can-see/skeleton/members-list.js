// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-who-can-see/skeleton/members-list.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_whoCanSee_members_list (_ui_) {
  const membersListFig = `${_ui_.fig.family}`;

  const search = Skeletons.Entry({
    className   : `${membersListFig}__search`,
    placeholder : LOCALE.SEARCH_MEMBER,
    sys_pn      : 'member-search-input',
    formItem    : _a.search,
    mode        : _a.interactive,
    interactive : 1,
    preselect   : 1,
    service     : _e.search,
    uiHandler   : _ui_
  });
  
  const searchWrapper = Skeletons.Box.X({
    className : `${membersListFig}__search-wrapper`,
    sys_pn    : 'search-wrapper',
    dataset   : { mode: _a.closed },
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'magnifying-glass',
        className : `${membersListFig}__icon search-icon magnifying-glass`,
        service   : 'toggle-search',
        uiHandler : _ui_
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
    className   : `${membersListFig}__list members-list`,
    placeholder : noMember,
    spinner     : true,
    formItem    : _a.member,
    dataType    : _a.array,
    timer       : 50,
    itemsOpt    : {
      kind         : 'widget_members_list_item',
      origin       : 'choose-member',
      selectedList : _ui_.membersSelected,
      orgId        : _ui_.mget('orgId'),
      _service     : 'trigger-who-can-see',
      memberCheck  : _ui_.mget('fetchService'),
      dataset      : { mode: _a.open },
      uiHandler    : _ui_
    },
    sys_pn      : 'members-list',
    api         : _ui_.getAllMembers.bind(_ui_)
  });

  const actionItems = Skeletons.Box.Y({
    className  : `${membersListFig}__action-items action-items`,
    kids: [
      Skeletons.Note({
        className  : `${membersListFig}__note action-item select-all text-underline`,
        content    : LOCALE.SELECT_ALL,
        type       : 'select-all',
        service    : 'toggle-all-members-selection',
        uiHandler  : [_ui_]
      }),
      
      Skeletons.Note({
        className  : `${membersListFig}__note action-item clear-all text-underline`,
        content    : LOCALE.CLEAR_ALL,
        type       : 'clear-all',
        service    : 'toggle-all-members-selection',
        uiHandler  : [_ui_]
      })
    ]
  })

  const a = Skeletons.Box.Y({
    className   : `${membersListFig}__selection-content`,
    debug       : __filename,
    sys_pn      : 'choose-members-content',
    dataset     : {
      mode  : _a.open
    },
    kids        : [
      searchWrapper,
      membersList,
      actionItems
    ]});

  return a;
};

export default __skl_widget_member_whoCanSee_members_list;