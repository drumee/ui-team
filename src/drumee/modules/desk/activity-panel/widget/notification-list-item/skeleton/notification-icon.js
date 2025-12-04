/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : src/drumee/modules/desk/wm/notification/widget/notification-list-item/skeleton/notification-icon.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_notification_list_entity_item_personal = function(_ui_,category,icon) {
  if (icon == null) { icon = ''; }
  const entityFig = `${_ui_.fig.family}-entity`;
  if (icon === '') {
    switch (category) {
      case _a.chat:
        icon = 'drumee-chat-visio';
        break;
      case "teamchat":
        icon = 'drumee-chat-visio';
        break;
      case _a.ticket:
        icon = 'drumee-chat-visio';
        break;
      case _a.contact:
        icon = 'drumee-add-contact';
        break;
      case _a.media:
        icon = 'dock-minifyer';
        break;
      case 'agenda':   // To Do used for agenda
        icon = 'drumee-calendar';
        break;
    }
  }


  const notificationCount = _ui_.getNotificationCount(category);

  const a = Skeletons.Box.X({
    className : `${entityFig}__notification`,
    dataset   : { 
      state     : notificationCount.cnt ? _a.open : _a.closed
    },
    kids      : [
      Skeletons.Box.X({
        className : `${entityFig}__container`,
        kids      : [
          Skeletons.Button.Svg({
            ico       : icon,
            className : `${entityFig}__icon notification ${category}`,
            service   :  `open-${category}`
          }),
          Skeletons.Note({
            service    : "counter",
            sys_pn     : "counter",
            className  : `${entityFig}__digit `,
            innerClass : `${_ui_.fig.group}__btn-counter`,
            content    : (notificationCount.cnt > 9) ? '9+' : notificationCount.cnt,
            service   :  `open-${category}`,
            state      : (notificationCount.cnt > 1) ? 1 : 0
            // dataset    : 
            //   state    : if (notificationCount.cnt > 1) then _a.open else _a.closed
          })
        ]})
    ]});
  
  return a;
};

module.exports = __skl_notification_list_entity_item_personal;