/// <reference path="../../../../../../../../../@types/index.d.ts" />

import ___members_page from "../..";


/**
 * @param {___members_page} ui
 * @param {{ errorstatus: string[]; firstname: string; lastname: string; email: string; ident: string; areacode:string; mobile: string; }} row
 */
export function AddRow(ui, row) {
  let nameError = ''
  let emailError = ''
  let identError = ''
  let areaCodeError = ''
  let mobileError = ''
  // if (_.includes(row.errorstatus, 'EMPTY_NAMES')){
  //   nameError = 'require';
  // }
  // if (_.includes(row.errorstatus, 'EMPTY_EMAIL')){
  //   nameError = 'require';
  // }
  // if(_.includes(row.errorstatus, 'EMAIL_NOT_AVAILABLE')){
  //   emailError = 'email-not-available';
  // }
  // if (_.includes(row.errorstatus, 'EMPTY_IDENT')){
  //   identError = 'require';
  // }
  // if(_.includes(row.errorstatus, 'IDENT_NOT_AVAILABLE')){
  //   identError = 'ident-not-available';
  // }
  // if(_.includes(row.errorstatus, 'EMPTY_AREACODE')){
  //   areaCodeError = 'require';
  // }
  // if(_.includes(row.errorstatus, 'EMPTY_MOBLIE')){
  //   mobileError = 'require';
  // }
  // if(_.includes(row.errorstatus, 'INVALID_PHONE_FORMAT')){
  //   mobileError = 'phone-not-available';
  // }
  // if(row.errorstatus) {
  //   let emailDuplicate = row.errorstatus.find((row) => {
  //     return /EMAIL_DUPLICATE  \([0-9]*\)/.test(row)
  //    })
  //   if(emailDuplicate){
  //     emailError = 'email-duplicate';
  //   }
  // }



  return Skeletons.Box.X({
    className: `${ui.fig.family}__import-list-table-row`,
    kids: [
      AddItem(ui, row.email, "content"),
      AddItem(ui, row.firstname, "content"),
      AddItem(ui, row.lastname, "content"),
      AddItem(ui, row.status, _a.status, row.error),
      // AddItem(ui, row.ident, "content", identError),
      // AddItem(ui, row.areacode, "content",areaCodeError),
      // AddItem(ui, row.mobile, "content",mobileError),
    ]
  });

}

/**
 * @param {___members_page} ui
 * @param {string} content
 * @param {'header'|'content'|'footer'} classType
 * @param {string} errorClass
 */
export function AddItem(ui, content = "", classType = "content", error = 0) {
  let item = Skeletons.Note({
    className: `item-${classType}`,
    content
  })
  let dataset = { error }
  if (classType == _a.status) {
    let ico = "checked-circle";
    if (error == "1") {
      ico = 'ban';
    }
    item = Skeletons.Button.Label({
      ico,
      label: content,
      innerClass: ico,
      className: `item-${classType} ${ico}`,
    })
  }
  return Skeletons.Box.X({
    dataset,
    className: `${ui.fig.family}__import-list-item-${classType} table-${classType}`,
    kids: [item]
  });
}


/**
 * @param {___members_page} ui
 */
function __skl_import_members_drag_page(ui) {
  let table = Skeletons.Box.Y({
    className: `${ui.fig.family}__import-list-table`,
    sys_pn: 'import-list-table',
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__import-list-table-row`,
        kids: [
          AddItem(ui, LOCALE.EMAIL, 'header'),
          AddItem(ui, LOCALE.FIRSTNAME, 'header'),
          AddItem(ui, LOCALE.LASTNAME, 'header'),
          AddItem(ui, LOCALE.STATUS, 'header'),
          // AddItem(ui, LOCALE.IDENT, 'header'),
          // AddItem(ui, LOCALE.AREA_CODE_REQUIRED, 'header'),
          // AddItem(ui, LOCALE.PHONE, 'header'),
        ]
      })
    ]
  })


  return Skeletons.Box.Y({
    className: `${ui.fig.family}__import-list-wrapper`,
    kids: [
      table
    ]
  })
}

export default __skl_import_members_drag_page;