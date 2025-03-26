// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/address-input-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_address_input_item = function(_ui_) {
  // @debug "__skl_address_input_item", _ui_
  const formFig = _ui_.fig.family;

  const addressIcon = Skeletons.Button.Svg({
    ico         : "ab_address",
    className   : `${formFig}__icon input-icon multiple ab_address`
  });

  const streetInput = Skeletons.Entry({
    className   : `${formFig}__entry street form-input`,
    formItem    : _a.street,
    placeholder : LOCALE.NUMBER_STREET, //_a.street
    uiHandler   : _ui_,
    value       : _ui_.mget(_a.street) || ''
  });
  
  const zipInput = Skeletons.Entry({
    className   : `${formFig}__entry zip form-input`,
    formItem    : _a.city,
    placeholder : LOCALE.ZIP_CODE_CITY, //"Zip Code - City"
    uiHandler   : _ui_,
    value       : _ui_.mget(_a.city) || ''
  });
  
  const countryInput = Skeletons.Entry({
    className   : `${formFig}__entry country form-input`,
    formItem    : _a.country,
    placeholder : LOCALE.COUNTRY,
    uiHandler   : _ui_,
    value       : _ui_.mget(_a.country) || ''
  });

  const switchCategory = Skeletons.Box.X({
    className   : `${formFig}__wrapper category`,
    kids        : [
      Skeletons.Button.Label({
        className   : `${formFig}__icon input-icon category`,
        icons       : ['desktop_sortby', 'desktop_sortby'],
        labels      : ["prof.", "priv."],
        state       :  _ui_.mget('category') || 0,
        formItem    : _a.category
      })
    ]});
  
  const destroyIcon = Skeletons.Button.Svg({
    ico       : "tools_delete",
    className : `${formFig}__icon destroy-tag tools_delete`,
    service   : _e.destroy,
    uiHandler : _ui_
  }); 
  
  const addressItems = Skeletons.Box.X({
    className   : `${formFig}__entry-wrapper address-items`,
    kids        : [
      Skeletons.Box.Y({
        className : 'form-input',
        kids      : [
          streetInput,
          zipInput,
          countryInput  
        ]}),
      
      switchCategory,
      destroyIcon
    ]});


  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          //addressIcon
          addressItems
        ]})
    ]});

  return a;
};
module.exports = __skl_address_input_item;