// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_addressbook_widget_tag_item = function(_ui_) {
  const mode        = _ui_.mget('viewMode');
  const tagItemFig  = `${_ui_.fig.family}`;
  const widgetTag   = _ui_.getParentByKind('widget_tag');
  const type        = widgetTag.mget(_a.type);
  let editIcon = '';

  if (type === _a.contact) {
    editIcon = Skeletons.Button.Svg({
      ico       : 'desktop_sharebox_edit',
      className : `${tagItemFig}__icon edit-icon desktop_sharebox_edit`,
      dataset   : {
        form  : _a.on
      },
      service   : 'edit-tag',
      uiHandler : _ui_
    });
  }

  const name = Skeletons.Note({
    className : `${tagItemFig}__note name`,
    content   : _ui_.mget(_a.name),
    service    : 'show-contact-list',
    uiHandler  : _ui_
  });

  const chat_icon = Skeletons.Button.Svg({
    ico       : "editbox_shapes-circle",//chat_notification" #"chat_note"
    className : `${tagItemFig}__chat_note chat_note`,
    service   : 'chat_note',
    uiHandler : _ui_
  });

  let state = 0;
  if (_ui_.mget('room_count') && (type === _a.chat)) {
    state = 1;
  }

  const a = Skeletons.Box.Y({
    className  : `${tagItemFig}__main`,
    debug      : __filename,
    service    : 'show-contact-list',
    uiHandler  : _ui_,
    kidsOpt    : {
      active   : 0
    },
    kids       : [
      Skeletons.Box.X({
        className  : `${tagItemFig}__container ${mode}-view`,
        kids : [
          Skeletons.Box.X({
            className : `${tagItemFig}__chat_wrapper`,
            sys_pn    : _a.notify,
            state,
            kids      : [
                chat_icon
            ]}),
          name,
          editIcon
        ]})
    ]});

  return a;
};

module.exports = __skl_addressbook_widget_tag_item;