// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/member-who-can-see/skeleton/search.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_whoCanSee_search (_ui_) {

  const searchFig = `${_ui_.fig.family}`;

  const searchHeader = Skeletons.Box.X({
    className   : `${searchFig}__search search-result-header`,
    kids        : [
      Skeletons.Note({
        className   : `${searchFig}__note search-title`,
        content     : LOCALE.SEARCH_RESULTS
      }),

      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${searchFig}__icon search-close-icon account_cross`,
        service     : 'search-close-result',
        uiHandler   : _ui_
      })
    ]});

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
                className : `${memberListItemFig}__note name`,
                content   : LOCALE.NO_MEMBERS_FOUND
              })
            ]})
        ]})
    ]});
  
  const searchList = Skeletons.List.Smart({
    className   : `${searchFig}__list member-list`,
    placeholder : noMember,
    spinner     : true,
    timer       : 50,
    itemsOpt    : { 
      kind         : 'widget_members_list_item',
      selectedList : _ui_.membersSelected,
      origin       : 'choose-member',
      orgId        : _ui_.mget('orgId'),
      _service     : 'trigger-search-member-select',
      uiHandler    : [_ui_],
    },
    sys_pn      : 'member-search-list',
    api         : _ui_.searchMembers.bind(_ui_)
  });

  const a = Skeletons.Box.Y({
    className   : `${searchFig}__main search-list`,
    debug       : __filename,
    kids        : [
      searchHeader,
      searchList
    ]});

  return a;
};

export default __skl_widget_member_whoCanSee_search;