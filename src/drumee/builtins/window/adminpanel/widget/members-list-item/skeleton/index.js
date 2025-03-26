/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/members-list-item/js/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 */
function __skl_widget_members_listItem  (_ui_) {
  const mListItemFig = _ui_.fig.family;

  let options, checkBox;

  const type = _ui_._type

  const fname = _ui_.mget(_a.firstname)  || ''
  const lname = _ui_.mget(_a.lastname)  || ''
  const fullname = _ui_.mget(_a.fullname) || fname  + " " + lname
  const displayName = fullname || ''

  const profile_icon = Skeletons.UserProfile({
    className : `${mListItemFig}__profile`,
    id        : _ui_.mget('drumate_id') || _ui_.mget(_a.id) ,
    firstname : fname || displayName,
    lastname  : lname,
    fullname  : fullname,
  });

  const name = Skeletons.Note({
    className : `${mListItemFig}__note name ${_ui_._type}`,
    content   : displayName
  })

  if ((_ui_._type == 'choose-admin') || (_ui_._type == 'choose-member')) {
    name.service = _ui_.mget('_service');
    name.trigger = 'item';
    name.uiHandler = _ui_;
  }
  
  if ((_ui_._type == 'choose-admin') || (_ui_._type == 'choose-member')) {
    const _state = _ui_.getUserState()
    checkBox = Skeletons.Button.Svg({
      className   : `${mListItemFig}__icon option-icons checkbox`,
      icons       : ["editbox_shapes-roundsquare", "available"],// box-tags backoffice_checkboxfill, editbox_shapes-roundsquare
      sys_pn      : 'member-item-checkbox',
      state       : _state,
      value       : _ui_.mget('drumate_id') || _ui_.mget(_a.id),
      formItem    : 'selector',
      service     : _ui_.mget('_service'),
      trigger     : 'checkbox',
      uiHandler   : _ui_,
      type        : _ui_._type
    })
  }

  if ((Visitor.id != _ui_.mget('drumate_id')) && (type == 'allAdmins') && Visitor.domainCan(_K.permission.admin)) {
    options = Skeletons.Box.X({
      className  : `${mListItemFig}__options options-wrapper`,
      kidsOpt    : {
        active: 1
      },
      kids: [
        Skeletons.Button.Svg({
          ico         : 'tools_delete',
          className   : `${mListItemFig}__icon option-icons remove-admin tools_delete`,
          service     : 'remove-admin',
          uiHandler   : _ui_
        }),

        require('./settings-menu').default(_ui_)
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