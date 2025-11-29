// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/wm/notification/widget/notification-list-item/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_notification_list_item_index = function(_ui_) {
  let entity;
  const pfx = _ui_.fig.family;

  switch (_ui_.mget(_a.area)) {
    case _a.personal:
      entity = require('./personal')(_ui_);
      break;
    case _a.private:
      entity = require('./private')(_ui_);
      break;
    case _a.share:
      entity = require('./share')(_ui_);
      break;
    case _a.public:
      entity = require('./public')(_ui_);
      break;
  }

  const a = Skeletons.Box.Y({
    className : `${pfx}__main`,
    debug     : __filename,
    sys_pn    : 'notification-list-item-container',
    kids      : [
      Skeletons.Box.X({
        className : `${pfx}__list`,
        kids      : [
          entity
        ]})
    ]});

  return a;
};

module.exports = __skl_notification_list_item_index;
