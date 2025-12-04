// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/wm/notification/widget/notification-list-item/skeleton/personal.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_notification_list_entity_item_personal = function(_ui_) {
  const entityFig = `${_ui_.fig.family}-entity`;

  const firstName = _ui_.mget(_a.firstname) || '';
  const lastName = _ui_.mget(_a.lastname) || '';
  const fullName = (firstName + lastName);
  let displayName = _ui_.mget('display_name') || fullName || _ui_.mget('email_id');

  let icon = Skeletons.UserProfile({
    className   : `${entityFig}__profile`,
    id          : _ui_.mget('drumate_id'),
    firstname   : firstName,
    lastname    : lastName,
    fullname    : fullName
  });

  if  (_ui_.mget('hub_id') === 'Support Ticket') {
    displayName = `#${_ui_.mget('display_name')}`;

    icon = Skeletons.Profile({
      className : `${entityFig}__profile customer`,
      id        : _.uniqueId('ticket-'),
      firstname : 'Support',
      lastname  : 'Ticket',
      fullname  : 'Support Ticket'
    });
  }


  const name = Skeletons.Note({
    className : `${entityFig}__note name`,
    content   : displayName
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

      require('./notification-icon')(_ui_, _a.ticket),
      require('./notification-icon')(_ui_, "teamchat"),
      require('./notification-icon')(_ui_, _a.chat),
      require('./notification-icon')(_ui_, _a.contact),
      // require('./notification-icon')(_ui_,'agenda')
      (!Visitor.get('is_support')) ?
        (_ui_.canShowinfo()) ?
          Skeletons.Button.Svg({
            ico       : 'info',
            className : `${entityFig}__icon-info`,
            service   : '',
            tooltips  : { 
              content : LOCALE.NOTIFICATION_CONTACT_REMOVE_INFO || 'To remove contact notification click on contact first to see it.'
            }
          })
        :
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
            ]}) : undefined
    ]});
  
  return a;
};

module.exports = __skl_notification_list_entity_item_personal;