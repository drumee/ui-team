
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} ui 
 */
function __skl_widget_members_listItem  (ui) {
  const mListItemFig = ui.fig.family;

  let options, checkBox;

  const type = ui.mget(_a.type)

  const fname = ui.mget(_a.firstname)  || ''
  const lname = ui.mget(_a.lastname)  || ''
  const fullname = ui.mget(_a.fullname) || fname  + " " + lname
  const displayName = fullname || ''

  const profile_icon = Skeletons.UserProfile({
    className : `${mListItemFig}__profile`,
    id        : ui.mget('drumate_id') || ui.mget(_a.id) ,
    firstname : fname || displayName,
    lastname  : lname,
    fullname  : fullname,
  });

  const name = Skeletons.Note({
    className : `${mListItemFig}__note name ${type}`,
    content   : displayName
  })

  if ((type == 'choose-admin') || (type == 'choose-member')) {
    name.service = ui.mget('_service');
    name.trigger = 'item';
    name.uiHandler = ui;
  }
  
  if ((type == 'choose-admin') || (type == 'choose-member')) {
    const _state = ui.getUserState()
    checkBox = Skeletons.Button.Svg({
      className   : `${mListItemFig}__icon option-icons checkbox`,
      icons       : ["editbox_shapes-roundsquare", "available"],// box-tags backoffice_checkboxfill, editbox_shapes-roundsquare
      sys_pn      : 'member-item-checkbox',
      state       : _state,
      value       : ui.mget('drumate_id') || ui.mget(_a.id),
      formItem    : 'selector',
      service     : ui.mget('_service'),
      trigger     : 'checkbox',
      uiHandler   : ui,
      type        : type
    })
  }

  if ((Visitor.id != ui.mget('drumate_id')) && (type == 'allAdmins') && Visitor.domainCan(_K.permission.admin)) {
    options = Skeletons.Box.X({
      className  : `${mListItemFig}__options options-wrapper`,
      kidsOpt    : {
        active: 1
      },
      kids: [
        Skeletons.Button.Svg({
          ico         : 'tools_delete',
          className   : `${mListItemFig}__icon option-icons prompt-remove-admin tools_delete`,
          service     : 'prompt-remove-admin',
          uiHandler   : ui
        }),

        require('./settings-menu').default(ui)
      ]
    })
  }

  let container = Skeletons.Box.X({
    className  : `${mListItemFig}__container`,
    kids : [
      profile_icon,
      name,
      options,
      checkBox
    ]
  })
  
  let a = Skeletons.Box.Y({
    className  : `${mListItemFig}__main`,
    debug      : __filename,
    kids       : [
      container
    ]
  })

  return a;
}

export default __skl_widget_members_listItem