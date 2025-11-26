const __dock_widget_launchers = function (ui, ismobile) {
  if (ismobile == null) { ismobile = false; }
  let profileType = 'pro';
  if (Visitor.isHubUser()) {
    profileType = _a.hub;
  }

  const button = require('./button');
  const pfx = `${ui.fig.family}__button launcher ${profileType}`;

  const addressbookNotifier = {
    kind: 'addressbook_widget_notification',
    className: `${ui.fig.family}__addressbook-notifier desk-dock`,
    label: LOCALE.CONTACT_INVITATION || 'Contact Invitation',
    service: 'address-book',
    type: 'address-book',
    route: {
      page: 'notification'
    },
    uiHanlder: ui
  };

  const bigChatNotifier = {
    kind: 'bigchat_widget_notification',
    className: `${ui.fig.family}__bigchat-notifier`,
    label: 'Chat Notification',
    service: 'bigchat',
    type: 'bigchat',
    route: {
      page: 'notification'
    },
    uiHanlder: ui
  };

  const kids = [
    button(ui, {
      ico: 'dock-search',
      className: `${pfx} schedule launcher-icon ${ui.fig.family}__icon addressbook`,
      innerClass: 'addressbook',
      sys_pn: 'addressbook-launcher',
      respawn: 'window_addressbook',
      helperName: 'addressbook',
      service: _e.launch
    }, LOCALE.CONTACTS, addressbookNotifier)
  ];

  if (Visitor.canUseVisio()) {
    kids.push(
      button(ui, {
        ico: 'dock-media',
        className: `${pfx} schedule launcher-icon ${ui.fig.family}__icon`,
        service: _e.launch,
        respawn: 'window_schedule',
        helperName: 'external-meeting',
        wicket: 1
      }, LOCALE.EXTERNAL_MEETING)
    );
  }

  kids.push(
    button(ui, {
      ico: 'dock-music',
      className: `${pfx} schedule launcher-icon ${ui.fig.family}__icon bigchat`,
      innerClass: 'bigchat',
      sys_pn: 'bigchat-launcher',
      respawn: 'window_bigchat',
      service: _e.launch,
      helperName: 'bigchat'
    }, LOCALE.CHAT_VIDEO, bigChatNotifier)
  );

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container application launcher ${profileType} ${ui.fig.family}--divider-left`,
    kids: kids
  });

  return a;
};

module.exports = __dock_widget_launchers;
