/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/papercontactlist.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_domain_form (_ui_){

  const content = Skeletons.Box.X({
    className     : `${_ui_.fig.family}__items`,
    radio         : 'member_selected_'+_ui_.mget(_a.widgetId),
    isPlaceholder : true,
    kids      : [
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__items`,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.family}__item`,
            kids      : [

              Skeletons.Button.Svg({
                ico       : "editbox_list-circle",
                className : `${_ui_.fig.family}__icon default-avatar editbox_list-circle`,
              }),
              
              Skeletons.Note({
                className : `${_ui_.fig.family}__note name`,
                content   : LOCALE.NO_CONTACT//'No contacts'
              })
            ]})
        ]})
    ]});

  const memberList = Skeletons.List.Smart({
    className   : `${_ui_.fig.family}__item list`,
    placeholder : content,
    spinner     : true,
    timer       : 50,
    sys_pn      : 'list-members-complete',
    api         : _ui_.getAllApi.bind(_ui_),
    itemsOpt    : { 
      kind      : 'contact_item',
      service   : "add-to-notification",
      uiHandler : [_ui_],
      mode      : _ui_.mode
    }
  });

  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__papercontact-list`,
    debug      : __filename,
    kids       : [
      memberList
    ]
  })
  return a;
}
export default __skl_domain_form;