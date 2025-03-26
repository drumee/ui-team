// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/invite-notification/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_addressbook_widget_invite_notification = function(_ui_) {
  const inviteFig = _ui_.fig.family;

  const data = _ui_.mget('notificationList');
  const cIndex = _ui_.mget('currentIndex') || 0;
  const cData = data[cIndex];
  
  const navigator = Skeletons.Box.X({
    className   : `${inviteFig}__navigator`,
    kids        : [
      Skeletons.Button.Svg({
        ico       : 'arrow--map',
        className : `${inviteFig}__icon left navigate arrow--map`,
        service   : 'navigate-notification',
        type      : _a.prev,
        uiHandler : _ui_
      }),
      
      Skeletons.Note({
        className : `${inviteFig}__note invite-count`,
        content   : cIndex + 1
      }),

      Skeletons.Button.Svg({
        ico       : 'arrow--pages',
        className : `${inviteFig}__icon right navigate arrow--pages`,
        service   : 'navigate-notification',
        type      : _a.next,
        uiHandler : _ui_
      })
    ]});
  
  const header = Skeletons.Box.X({
    className   : `${inviteFig}__header`,
    kids        : [
      navigator,
      
      Skeletons.Button.Svg({
        ico         : "account_cross",
        className   : `${inviteFig}__icon close account_cross`,
        service     : _e.close,
        uiHandler   : _ui_
      })
    ]});
  
  const name = Skeletons.Box.X({
    className   : `${inviteFig}__name`,
    kids        : [
      Skeletons.Note({
        className : `${inviteFig}__note fullname`,
        content   : cData.fullname || cData.email
      })
      ]});
  
  let message = '';
  if (cData.status !== "informed") {
    message = Skeletons.Box.Y({
      className   : `${inviteFig}__message`,
      kids        : [
        Skeletons.Note({
          className : `${inviteFig}__note title`,
          content   : LOCALE.MESSAGE
        }),
        
        Skeletons.Note({
          className : `${inviteFig}__note content`,
          content   : cData.message || LOCALE.ACCEPT_CONTACT_AND_JOIN_DRUMEE
        })
      ]});
  }

  const content =  Skeletons.Box.Y({
    className : `${inviteFig}__content`,
    kids      : [
      name,
      require('./static-text')(_ui_, cData.status),
      message
    ]});
  
  const a = Skeletons.Box.X({
    className  : `${inviteFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${inviteFig}__container`,
        kids       : [
          header,
          content,
          require('./buttons')(_ui_, cData.status)
        ]})
    ]});

  return a;
};

module.exports = __skl_addressbook_widget_invite_notification;