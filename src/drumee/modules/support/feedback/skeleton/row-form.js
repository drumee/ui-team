/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/local-row
//   TYPE :
// ==================================================================== *

// ===========================================================
// _form (local-row)
//
// @param [Object] manager
//
// ===========================================================


const __locale_row = function(manager, target) {
  let service;
  let data = target.model.get('data');
  if ((data == null)) {
    data = {};
    service = "add-locale-row";
  } else { 
    service = "update-locale-row";
  }

  const bar = SKL_Box_H(manager, {
    className: "w-100 mb-30 my-22 u-jc-center",
    kids: [
      SKL_Note(null, LOCALE.CANCEL, {
        className: "btn btn--cancel mx-22",
        service : _e.close
      }),
      SKL_Note(null, LOCALE.CHANGE, {
        className : "btn btn--confirm mx-22",
        sys_pn    : "commit-button",
        service   : _e.submit
      })
    ]
  });
  
  const form = {
    kind      : KIND.form,
    flow      : _a.y,
    //howIn    : _a.context
    className : "u-jc-center translation-form",
    handler   : {
      ui      : manager,
      part    : manager
    },
    signal    : _e.ui.event,
    service,
    sys_pn    : "row-form",
    name      : "locale_row",
    kids      : [
      SKL_Box_V(manager, {
        className: "u-jc-center",
        sys_pn    : "row-form-content",
        name      : _a.id, 
        value     : data.id,
        kids: require('./entries')(manager, data)
      }),
      bar
    ]
  };
  const a = {
    kind: KIND.box,
    flow: _a.y,
    className: 'translation-locale--popup',
    kids: [ form ],
    styleOpt : {
      left   : (window.innerWidth/2) - 234
    }
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'builtins/admin/skeleton/local-row'); }

  return a;
};
module.exports = __locale_row;
