// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : /src/drumee/builtins/window/account/widget/input/skeleton/entries/address.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_account_widget_input_entries_address = function(_ui_) {
  const formFig = _ui_.fig.family;

  const data = _ui_.mget(_a.value) || {street: '', city: '', country: ''};

  const identifier = Skeletons.Box.X({
    className : `${formFig}__icon-container`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : _ui_.mget(_a.icon),
        className : `${formFig}__icon-picto`,
        uiHandler : _ui_
      })
    ]});

  const content = Skeletons.Box.X({
    className : `${formFig}__form-wrapper address`,
    sys_pn    : 'wrapper-content',
    formItem    : _a.address,
    dataType    : _a.array,
    kids      : [
      Skeletons.Box.Y({
        className  : `${formFig}__address-wrapper`,
        kids       : [
          Skeletons.EntryBox({
            className   : `${formFig}__entry street address`,
            placeholder : LOCALE.NUMBER_STREET,//_a.street
            formItem    : _a.street,
            name        : _a.street,
            interactive : 1,
            value       : data.street,
            uiHandler   : _ui_
          }),
          
          Skeletons.EntryBox({
            className   : `${formFig}__entry city address`,
            placeholder : LOCALE.CITY,
            formItem    : _a.city,
            name        : _a.city,
            interactive : 1,
            value       : data.city,
            uiHandler   : _ui_
          }),
          
          Skeletons.EntryBox({
            className   : `${formFig}__entry country address`,
            placeholder : LOCALE.COUNTRY,//_a.country
            formItem    : _a.country,
            name        : _a.country,
            interactive : 1,
            value       : data.country,
            uiHandler   : _ui_
          })
        ]})
    ]});
  
  const actionItem = Skeletons.Box.X({
    className : `${formFig}__options-wrapper submit-btn`,
    kids      : [
      Skeletons.Note({
        className   : `${formFig}__button-confirm button address clickable`,
        content     : LOCALE.OK,
        service     : _e.submit,
        uiHandler   : _ui_
      })
    ]});

  const a = Skeletons.Box.X({
    className : `${formFig}__container edit-mode`,
    debug     : __filename,
    kids      : [
      identifier,
      content,
      actionItem
    ]});

  return a;
};

module.exports = __skl_account_widget_input_entries_address;
