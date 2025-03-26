const __dock_widget_launchers = function (_ui_, ismobile) {
  if (ismobile == null) { ismobile = false; }
  let profileType = 'pro';
  if (Visitor.isHubUser()) {
    profileType = _a.hub;
  }

  const button_class = `${_ui_.fig.family}__button launcher ${profileType}`;
  const pfx = _ui_.fig.family;

  const addressbookNotifier = {
    kind: 'addressbook_widget_notification',
    className: `${pfx}__addressbook-notifier desk-dock`,
    label: LOCALE.CONTACT_INVITATION || 'Contact Invitation',
    service: 'address-book',
    type: 'address-book',
    route: {
      page: 'notification'
    },
    uiHanlder: _ui_
  };

  let bigChatNotifier = {
    kind: 'bigchat_widget_notification',
    className: `${_ui_.fig.family}__bigchat-notifier`,
    label: 'Chat Notification',
    service: 'bigchat',
    type: 'bigchat',
    route: {
      page: 'notification'
    },
    uiHanlder: _ui_
  };

  const button = require('./button');

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__container application launcher ${profileType}`,
    kids: [
      button(_ui_, {
        ico: 'desktop_contactbook',
        className: `${button_class} schedule launcher-icon`,
        innerClass: 'addressbook',
        sys_pn: 'addressbook-launcher',
        respawn: 'window_addressbook',
        helperName: 'addressbook',
        service: _e.launch
      }, LOCALE.CONTACTS, addressbookNotifier),
      button(_ui_, {
        ico: 'area-code',
        className: `${button_class} schedule launcher-icon`,
        service: _e.launch,
        respawn: 'window_schedule',
        helperName: 'external-meeting',
        wicket: 1
      }, LOCALE.EXTERNAL_MEETING),
      button(_ui_, {
        ico: 'drumee-chat-visio',
        className: `${button_class} schedule launcher-icon`,
        innerClass: 'bigchat',
        sys_pn: 'bigchat-launcher',
        respawn: 'window_bigchat',
        service: _e.launch,
        helperName: 'bigchat'
      }, LOCALE.CHAT_VIDEO,
        bigChatNotifier),
    ]
  });

  return a;
};

module.exports = __dock_widget_launchers;
