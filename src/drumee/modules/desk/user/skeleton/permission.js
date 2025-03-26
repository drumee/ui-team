/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : 
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/share-box/skeleton/outbound/access-control';
}



// ===========================================================
// __sb_access_control
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __sb_access_control = function(manager, type, datat) {
  let button, days, email, hours, perm, style;
  if (datat != null) {
    ({
      email
    } = datat);
    perm  = ~~ (datat.permission || _K.permission.view);
    hours = ~~ datat.hours;
    days  = ~~ datat.days;
  } else {
    email = manager.preset.get(_a.email);
    perm  = ~~ manager.preset.get(_a.permission);
    hours = manager.preset.get(_a.hours); 
    days  = manager.preset.get(_a.days); 
  }
    

  if (type === 'change') {
    button = SKL_Box_V(manager, {
      kids: [
        SKL_Note(_e.share, LOCALE.CLOSE, {
          service   : 'close-preset',
          className : 'share-popup__modal-btn mt-12 mb-15',
          email
        })
      ]
    });
    style = 'plain';
  } else {
    button = SKL_Box_V(manager, {
      kids: []
    });
    style = 'privilege';
  }
  
  const svg_option_icon = {
    width: _K.size.full,
    height: 14,
    padding: 0
  };
  const channel = _.uniqueId();


  const form_one = {
    kind      : KIND.form,
    flow      : _a.vertical,
    name      : 'privilege',
    signal    : _e.ui.event,
    service   : 'preset-permission',
    sys_pn    : 'preset-permission-form',
    handler   : {
      uiHandler   : manager
    },
    kids      : [
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(perm&_K.permission.view),// viewInitial
        label         : LOCALE.VIEW,
        name          : "view",
        reference     : _a.state, // use state instead of value
        service       : 'view',
        buble         : 1,
        className     : 'option__checkbox option__text my-5 u-fd-row'
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(perm&_K.permission.download), //downloadInitial
        label         : LOCALE.DOWNLOAD,
        reference     : _a.state, // use state instead of value
        buble         : 1,
        name          : "download",
        className : 'option__checkbox option__text my-5 u-fd-row'
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(perm&_K.permission.modify), //modifyInitial
        label         : LOCALE.MODIFY,
        reference     : _a.state, // use state instead of value
        buble         : 1,
        name          : "modify",
        className     : 'option__checkbox option__text my-5 u-fd-row' //option__disabled-modify
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        state  : 0,
        label  : "Time limit",
        reference     : _a.state, // use state instead of value
        name   : _a.limit,
        className: 'option__radio option__text my-5 u-fd-row'
      }, svg_option_icon),
      SKL_Box_H(manager, {
        className : 'py-2 pl-24 u-ai-center mb-10',
        kids      : [
          SKL_Entry(manager, null, {
            className   : "option__input mr-5",
            name        : _a.days,
            placeholder : '1',
            value       : days //cmd.model.get(_a.days) #days_value
            // bubble      : 1
          }),
          SKL_Note(null, _a.days, {
            className: 'option__text  mr-5'
          }),
          SKL_Entry(manager, null, {
            className   : "option__input mr-5",
            name        : _a.hours,
            value       : hours, //dhours_value
            placeholder : '1'
          }),
          SKL_Note(null, _a.hours, {
            className: 'option__text'
          })
        ]
      }),
      SKL_Wrapper(null, null, {value:email, name:email})
    ]
  };

  const a = {  
    kind      : KIND.box,
    flow      : _a.vertical,
    name      : 'privilege-block',
    signal    : _e.ui.event,
    className : `option__block option__block--${style} mb-10`,
    kids      : [
      form_one,
      button
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __sb_access_control;
