// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/email-input-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_email_input_item = function(_ui_) {
  // @debug "__skl_email_input_item", _ui_
  const formFig = _ui_.fig.family;

  let isDefault = 0;
  let deleteState = _a.open;

  const emailValidators = [      
      {reason: LOCALE.ENTER_VALID_EMAIL , comply: Validator.email} //"Please enter a valid Email"
    ];

  if (_ui_.mget('is_default')) {
    isDefault = 1;
    deleteState = _a.closed;
    if (_ui_.mget('isNeedEmail')) {
      emailValidators.push({reason: LOCALE.EMAIL_REQUIRED , comply: Validator.require});
    }
  }
  const emailInput =  Skeletons.EntryBox({
    className     : `${formFig}__entry email form-input`,
    formItem      : _a.email,
    innerClass    : "email",
    interactive   : 1, 
    sys_pn        : "email-input",
    placeholder   : LOCALE.EMAIL,
    value         : _ui_.mget(_a.email) || '',
    uiHandler     : _ui_,
    errorHandler  : [_ui_],
    validators    : emailValidators,
    showError     : 1,
    preselect     : _ui_.mget('preselect') || 0
  });

  const switchCategory = Skeletons.Box.X({
    className   : `${formFig}__wrapper category`,
    kids        : [
      Skeletons.Button.Label({
        className   : `${formFig}__icon input-icon category`,
        icons       : ['desktop_sortby','desktop_sortby'],
        labels      : ["prof.", "priv."],
        state       : _ui_.mget('category') || 0,
        formItem    : _a.category
      })
    ]});

  const radioCheck = Skeletons.Box.X({
    className   : `${formFig}__wrapper is-default-icon`,
    kids        : [
      Skeletons.Button.Svg({
        className   : `${formFig}__icon input-icon radio-icon is-default-icon`,
        ico         : "raw-radio-checked",
        sys_pn      : "default-email",
        state       : isDefault,
        service     : 'tick',
        radio       : 'is_email_default',
        formItem    : 'is_default'
      })
    ]});

  const destroyIcon = Skeletons.Button.Svg({
    ico       : "tools_delete",
    className : `${formFig}__icon destroy-tag tools_delete`,
    service   : _e.destroy,
    sys_pn    : 'trash-icon',   
    uiHandler : _ui_, 
    dataset   : {
      state    : deleteState
    }
  });
  
  const a = Skeletons.Box.Y({
    className  : `${formFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${formFig}__container`,
        kids : [
          emailInput,
          switchCategory,
          radioCheck,
          destroyIcon
        ]})
    ]});

  return a;
};

module.exports = __skl_email_input_item;