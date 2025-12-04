// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/wm/notification/widget/notification-list-item/skeleton/share.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_notification_list_entity_item_share = function(_ui_) {
  const entityFig = `${_ui_.fig.family}-entity`;

  const icon = Skeletons.Button.Svg({
    ico       : 'raw-drumee-folder-orange',
    className : `${entityFig}__icon share`
  });//orange

  const name = Skeletons.Note({
    className : `${entityFig}__note name`,
    content   : _ui_.mget('display_name')
  });
  
  const time = Skeletons.Note({
    className : `${entityFig}__note time`,
    content   : Dayjs.unix(_ui_.mget(_a.ctime)).format("HH:mm")
  });

  const a = Skeletons.Box.X({
    className : `${entityFig}__container`,
    debug     : __filename,
    kids      : [
      icon,
      Skeletons.Box.Y({
        className : `${entityFig}__content`,
        kids      : [
          name,
          time
        ]}),
      
      Skeletons.Box.X({
        className : `${entityFig}__notification`,
        kids      : [
          require('./notification-icon')(_ui_,_a.media)
        ]}),
      
      Skeletons.Box.X({
        className : `${entityFig}__delete-notification delete-notification`,
        kidsOpt   : {
          active    : 0
        },
        service   : 'delete-entity',
        uiHandler : _ui_,
        kids      : [
          Skeletons.Button.Svg({
            ico       : 'drumee-trash',
            className : `${entityFig}__icon delete-notification-icon`
          })
        ]})
    ]});
  
  return a;
};

module.exports = __skl_notification_list_entity_item_share;