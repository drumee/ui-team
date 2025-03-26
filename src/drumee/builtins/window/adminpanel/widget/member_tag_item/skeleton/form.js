// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : ../src/drumee/builtins/window/addressbook/widget/tag-item/skeleton/form
//   TYPE :
// ==================================================================== *

function __skl_member_tagItem_form  (_ui_) {

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
    placeholder : LOCALE.NEW,//NEW_TAG,
    value       : _ui_.mget(_a.name) || '',
    service     : 'save-tag',
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

export default __skl_member_tagItem_form;