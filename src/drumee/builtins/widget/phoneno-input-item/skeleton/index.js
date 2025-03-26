// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/phoneno-input-item/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_phoneno_input_item = function(_ui_) {
  const formFig = _ui_.fig.family;

  let _areaCodeVal = _ui_.mget(_a.areacode) || '+';
  _areaCodeVal = _areaCodeVal.replace('+', '');

  const areaCode = Skeletons.Box.X({
    className : `${formFig}__area-code`,
    kids      : [
      Skeletons.Note({
        className : `${formFig}__note area-code`,
        content   : '+'
      }),
      
      Skeletons.EntryBox({
        className     : `${formFig}__entry area-code form-input`,
        interactive   : 1,
        formItem      : 'areacode',
        innerClass    : _a.area,
        placeholder   : LOCALE.AREA,
        uiHandler     : _ui_,
        errorHandler  : [_ui_],
        value         : _areaCodeVal,
        showError     : 1,
        validators    : [
          {reason: LOCALE.AREA_CODE_REQUIRED , comply: Validator.phone} //Area code required'
        ]})
    ]});

  const phoneInput =  Skeletons.EntryBox({
    className     : `${formFig}__entry phoneno-item form-input`,
    interactive   : 1,
    formItem      : _a.phone,
    innerClass    : _a.phone,
    placeholder   : LOCALE.PHONE,
    uiHandler     : _ui_,
    errorHandler  : [_ui_],
    value         : _ui_.mget(_a.phone) || '',
    showError     : 1,
    validators    : [
      {reason: LOCALE.VALID_PHONE_NO , comply: Validator.phone}
    ]});
  
  const switchCategory = Skeletons.Box.X({
    className   : `${formFig}__wrapper category`,
    kids        : [
      Skeletons.Button.Label({
        className   : `${formFig}__icon input-icon category`,
        icons       : ['desktop_sortby','desktop_sortby'],
        labels      : ['prof.', 'priv.'],
        state       : _ui_.mget('category') || 0,
        formItem    : _a.category
      })
    ]});

  const destroyIcon = Skeletons.Button.Svg({
    ico       : 'tools_delete',
    className : `${formFig}__icon destroy-tag tools_delete`,
    service   : _e.destroy,
    uiHandler : _ui_
  });

  const a = Skeletons.Box.Y({
    className  : `${formFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${formFig}__container`,
        kids : [
          areaCode,
          phoneInput,
          switchCategory,
          destroyIcon
        ]})
    ]});
  
  return a;
};

module.exports = __skl_phoneno_input_item;