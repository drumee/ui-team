// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/search/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_members_search (_ui_) {
  
  const searchFig = `${_ui_.fig.family}`;

  const searchHeader = Skeletons.Box.X({
    className   : `${searchFig}__header`,
    kids        : [
      Skeletons.Note({
        className   : `${searchFig}__title`,
        content     : LOCALE.SEARCH_RESULTS
      }),

      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${searchFig}__icon close-icon account_cross`,
        service     : _e.close,
        uiHandler   : _ui_
      })
    ]
  });

  const memberFig = 'widget-members-list-content';
  const noMember = Skeletons.Box.X({
    className     : `${memberFig}`,
    radio         : 'member_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${memberFig}__items`,
        kids      : [
          Skeletons.Box.X({
            className : `${memberFig}__item`,
            kids      : [
              Skeletons.Button.Svg({
                ico       : 'editbox_list-circle',
                className : `${memberFig}__icon default-avatar editbox_list-circle`
              }),
              
              Skeletons.Note({
                className : `${memberFig}__note name`,
                content   : LOCALE.NO_MEMBERS_FOUND //'No members found'
              })
            ]})
        ]})
    ]});
  
  const searchList = Skeletons.List.Smart({
    className   : `${searchFig}__item list`,
    placeholder : noMember,
    spinner     : true,
    sys_pn      : 'list-members',
    api         : _ui_.getCurrentApi.bind(_ui_),
    itemsOpt    : { 
      kind      : 'widget_members_list_item',
      service   : 'show-member-detail',
      uiHandler : [_ui_]
    }
  });


  const a = Skeletons.Box.X({
    className   : `${searchFig}__main search-result`,
    debug       : __filename,
    kids        : [
      Skeletons.Box.Y({
        className  : `${searchFig}__container`,
        kids       : [
          searchHeader,
          searchList
        ]})
    ]
  });

  return a;

};

export default __skl_widget_members_search;