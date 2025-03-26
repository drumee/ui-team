// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form-items/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_addressbook_widget_contact_formItems = function(_ui_) {
  //@debug "__skl_addressbook_widget_contact_formItems", _ui_
  const formItemFig = `${_ui_.fig.family}`;
  const tagName = _ui_.mget(_a.name);

  const checkBox = Skeletons.Button.Svg({
    className   : `${formItemFig}__icon checkbox`,
    icons       : ["editbox_shapes-roundsquare", "available"], //"editbox_shapes-square" "box-tags""backoffice_checkboxfill, editbox_list-square
    formItem    : 'tag',
    state       : _ui_.getStatus() || 0,
    service     : 'trigger-tag-select',
    //label       : tagName
    value       : _ui_.mget('tag_id'),
    uiHandler   : _ui_
  });
    //labelFirst  : 1
  const name = Skeletons.Note({
    className : `${formItemFig}__note name`,
    content   : tagName
  });

  const a = Skeletons.Box.Y({
    className  : `${formItemFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${formItemFig}__container`,
        kids       : [
          name,
          checkBox
        ]})
    ]});

  return a;
};

module.exports = __skl_addressbook_widget_contact_formItems;