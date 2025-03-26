// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : /src/drumee/builtins/window/account/widget/input/skeleton/entries/name.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_account_widget_input_entries_name = function(_ui_) {
  const formFig = _ui_.fig.family;

  const _name =_ui_.mget(_a.name);

  const identifier = Skeletons.Box.X({
    className : `${formFig}__label-container`,
    kids      : [
      Skeletons.Note({
        content   : _ui_.mget(_a.label),
        className : `${formFig}__label-text`,
        sys_pn    : 'ref-label',
        uiHandler : _ui_
      })
    ]});

  const content = Skeletons.Box.X({
    className : `${formFig}__form-wrapper ${_name}`,
    sys_pn    : 'wrapper-content',
    kids      : [
      Skeletons.EntryBox({
        className   : `${formFig}__entry ${_name}`,
        placeholder : LOCALE[_name.toUpperCase()],
        formItem    : _name,
        name        : _name,
        interactive : 1,
        value       : _ui_.mget(_a.value),
        uiHandler   : _ui_
      })
    ]});
  
  const actionItem = Skeletons.Box.X({
    className : `${formFig}__options-wrapper submit-btn`,
    kids      : [
      Skeletons.Note({
        className   : `${formFig}__button-confirm button clickable`,
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

module.exports = __skl_account_widget_input_entries_name;
