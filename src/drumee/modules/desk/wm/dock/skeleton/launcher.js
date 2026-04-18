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
    kind: 'chat_p2p_widget_notification',
    className: `${ui.fig.family}__chat-p2p-notifier`,
    label: 'Chat Notification',
    service: 'toggle-chat',
    type: 'chat-p2p',
    route: {
      page: 'notification'
    },
    uiHanlder: ui
  };

  const kids = [
    // button(ui, {
    //   ico: "dock-note",
    //   className: `${pfx} note big`,
    //   service: "add-note",
    //   helperName: 'note'
    // }, LOCALE.NOTE),
    // button(ui, {
    //   ico: "logo",
    //   className: `${pfx} note big`,
    //   service: "my-plan",
    //   helperName: 'note'
    // }, LOCALE.SUBSCRIPTION),
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



  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__container application launcher ${profileType} `,
    kids: kids
  });

  return a;
};

module.exports = __dock_widget_launchers;
