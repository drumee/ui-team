// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag-item/skeleton/form
//   TYPE : Skeleton
// ==================================================================== *
const __skl_addressbook_widget_tag_item_form = function(_ui_) {
  const tagFormFig = `${_ui_.fig.family}`;

  const destroyIcon = Skeletons.Button.Svg({
    ico       : 'tools_delete',
    className : `${tagFormFig}__icon destroy-tag tools_delete`,
    service   : _e.destroy,
    uiHandler : _ui_
  });

  const tagForm = Skeletons.Entry({
    className   : `${tagFormFig}__entry form-tag`,
    formItem    : 'tag-input',
    placeholder : LOCALE.NEW_TAG,
    value       : _ui_.mget(_a.name) || '',
    service     : 'save-tag',
    formcomplete: _a.off,
    mode        : _a.commit,
    active      : 0,
    preselect   : 1,
    uiHandler   : _ui_
  });

  const a = Skeletons.Box.Y({
    className  : `${tagFormFig}__main form-tag ${_ui_.mget(_a.type)}`,
    debug      : __filename,
    kidsOpt    : {
      active   : 0
    },
    kids       : [
      Skeletons.Box.X({
        className  : `${tagFormFig}__container form-tag ${_ui_.mget(_a.type)}`,
        kids : [
          tagForm,
          destroyIcon
        ]})
    ]});

  return a;
};

module.exports = __skl_addressbook_widget_tag_item_form;