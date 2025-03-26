/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/adminpanel/pages/members/skeleton/import/members-list.js
 * TYPE : Skeleton
 * ===================================================================**/
/// <reference path="../../../../../../../../../@types/index.d.ts" />

import ___members_page from "../..";


/**
 * @param {___members_page} _ui_
 * @param {{ errorstatus: string[]; firstname: string; lastname: string; email: string; ident: string; areacode:string; mobile: string; }} row
 */
export function AddRow(_ui_, row) {
  let nameError = ''
  let emailError = ''
  let identError = ''
  let areaCodeError = ''
  let mobileError = ''
  if (_.includes(row.errorstatus, 'EMPTY_NAMES')){
    nameError = 'require';
  }
  if (_.includes(row.errorstatus, 'EMPTY_EMAIL')){
    nameError = 'require';
  }
  if(_.includes(row.errorstatus, 'EMAIL_NOT_AVAILABLE')){
    emailError = 'email-not-available';
  }
  if (_.includes(row.errorstatus, 'EMPTY_IDENT')){
    identError = 'require';
  }
  if(_.includes(row.errorstatus, 'IDENT_NOT_AVAILABLE')){
    identError = 'ident-not-available';
  }
  if(_.includes(row.errorstatus, 'EMPTY_AREACODE')){
    areaCodeError = 'require';
  }
  if(_.includes(row.errorstatus, 'EMPTY_MOBLIE')){
    mobileError = 'require';
  }
  if(_.includes(row.errorstatus, 'INVALID_PHONE_FORMAT')){
    mobileError = 'phone-not-available';
  }
  if(row.errorstatus) {
    let emailDuplicate = row.errorstatus.find((row) => {
      return /EMAIL_DUPLICATE  \([0-9]*\)/.test(row)
     })
    if(emailDuplicate){
      emailError = 'email-duplicate';
    }
  }
  


  return Skeletons.Box.X({
    className: `${_ui_.fig.family}__import-list-table-row`,
    kids: [
      AddItem(_ui_, row.firstname, "content", nameError),
      AddItem(_ui_, row.lastname, "content"),
      AddItem(_ui_, row.ident, "content", identError),
      AddItem(_ui_, row.email, "content", emailError),
      AddItem(_ui_, row.areacode, "content",areaCodeError),
      AddItem(_ui_, row.mobile, "content",mobileError),
    ]
  });

}

/**
 * @param {___members_page} _ui_
 * @param {string} content
 * @param {'header'|'content'|'footer'} classType
 * @param {string} errorClass
 */
export function AddItem(_ui_, content = "", classType = "content", errorClass = '') {
  let error ='';
  if (errorClass) {
    error = 'error';
  }
  return Skeletons.Box.X({
    className: `${_ui_.fig.family}__import-list-item-${classType} table-${classType} ${error} ${errorClass}`,
    kids: [
      Skeletons.Note({
        className: `item-${classType}`,
        content: content
      })
    ]
  });
}


/**
 * @param {___members_page} _ui_
 */
function __skl_import_members_drag_page(_ui_) {
  let table = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__import-list-table`,
    sys_pn: 'import-list-table',
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__import-list-table-row`,
        kids: [
          AddItem(_ui_, LOCALE.FIRSTNAME, 'header'),
          AddItem(_ui_, LOCALE.LASTNAME, 'header'),
          AddItem(_ui_, LOCALE.IDENT, 'header'),
          AddItem(_ui_, LOCALE.EMAIL, 'header'),
          AddItem(_ui_, LOCALE.AREA_CODE_REQUIRED, 'header'),
          AddItem(_ui_, LOCALE.PHONE, 'header'),
        ]
      })
    ]
  })


  let a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__import-list-wrapper fullwidth`,
    kids: [
      table
    ]
  })

  return a;
}

export default __skl_import_members_drag_page;