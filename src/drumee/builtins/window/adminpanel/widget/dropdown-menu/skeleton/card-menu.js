/* ================================================================== 
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/builtins/window/bigchat/widget/chat-room/skeleton/common/card-menu.coffee
*   TYPE : Skelton
* =================================================================== **/

/**
 * @typedef MenuItem
 * @type {object}
 * @property {string} id - Id OR Key for the menu item.
 * @property {string} display - Display item for the menu
 * @property {string} service - service on the selection 
 * @property {string} mode - to add the class like enable & disable 
 */

/**
 * To create the Menu items 
 * @param {import('../index').initClass} a ___widget_dropdown_menu instance 
 * @param {MenuItem} opt - Options 
 */

const __skl_dropdown_menu_item = function (_ui_, opt = {}) {
  const menuFig = `${_ui_.fig.family}-menu`;
  const mode = opt.mode || _a.enable

  const menuItem = Skeletons.Box.X({
    className: `${menuFig}__item ${mode}`,
    service: opt.service || 'change_option',
    kidsOpt: {
      active: 0
    },
    dataset: { id: opt.id },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: opt.display || ''
      })
    ]
  });
  return menuItem;
}
/**
 * default Skeleton for dropdown_menu
 * @param {Object}  _ui_ 
 */
const __skl_dropdown_menu = function (_ui_) {

  const menuFig = `${_ui_.fig.family}-menu`;

  const menuTrigger = Skeletons.Box.X({
    className: `${menuFig}__input_wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: `editbox_arrow--down`,
        className: `${menuFig}__icon-dropdown`,
      }),
      Skeletons.Note({
        content: _ui_.selected.display, // default label 
        sys_pn: 'selected_text',
      }),
    ]
  })


  const options = _ui_.mget('options')
    .map((option, index) =>
      __skl_dropdown_menu_item(_ui_, { display: option.display, id: index, mode: option.mode }));

  const menuItems = Skeletons.Box.X({
    className: `${menuFig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${menuFig}__items-wrapper fullwidth`,
        kids: options
      })
    ]
  });

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids: [{
      kind: KIND.menu.topic,
      className: `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow: _a.y,
      opening: _e.click,
      sys_pn: "contact-card-dropdown",
      service: "contact-card-menu",
      persistence: _a.none,
      trigger: menuTrigger,
      items: menuItems
    }]
  });

  return menu;
};


export default __skl_dropdown_menu;