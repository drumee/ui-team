const { supportAvatar, isSupportEntity } = require("libs/support");

/**
 * Header for the selected contact's chat panel.
 * @param {View} ui    - The chat_p2p widget
 * @param {View} contact - The selected chat_contact_item view
 * @returns Skeleton
 */
module.exports = function (ui, contact) {
  const fig = ui.fig.family;

  // Desktop close button — closes the whole panel. Lives in the chat
  // header here, but is hidden on mobile/tablet (≤1024px) where the close
  // button moves into the sidebar header instead (see skeleton/index.js).
  const closeBtn = Skeletons.Button.Svg({
    ico: 'account_cross',
    className: `${fig}__header-btn ${fig}__chat-close-btn`,
    service: 'close-chat',
    uiHandler: [ui]
  });

  // Mobile/tablet back button — returns from the chat pane to the inbox
  // sidebar. Hidden on desktop via CSS (both panes show side-by-side there).
  const backBtn = Skeletons.Button.Svg({
    ico: 'arrow-left',
    className: `${fig}__header-btn ${fig}__back-btn`,
    service: 'back-to-list',
    uiHandler: [ui]
  });

  if (!contact) {
    return Skeletons.Box.X({
      className: `${fig}__header ${fig}__header--empty`,
      kids: [
        Skeletons.Box.X({
          className: `${fig}__header-actions`,
          kids: [closeBtn]
        })
      ]
    });
  }

  const fname = contact.mget(_a.firstname) || '';
  const lname = contact.mget(_a.lastname) || '';
  const fullname = contact.mget(_a.fullname) || `${fname} ${lname}`.trim();
  const displayName = contact.mget('display') || fullname;
  const entityId = contact.mget('entity_id');
  const isContact = contact.mget('flag') === _a.contact;

  const cached = (window.Wm && Wm.getContactStatus && Wm.getContactStatus(entityId)) || null;
  const onlineState = (cached && cached.status != null) ? cached.status : contact.mget(_a.online);

  const statusLabel = (state) => {
    const s = ~~state;
    if (s === 1) return LOCALE.ACTIVE_NOW;
    if (s === 2) return LOCALE.AWAY;
    return LOCALE.OFFLINE;
  };

  // Two different support questions, and they want opposite treatments:
  //  - talking TO support (the user's side): presence is replaced with an
  //    expectation line. An "Offline" dot on the support contact reads as
  //    "nobody will answer", which is not what it means.
  //  - answering support (the admin's side): presence is exactly what they
  //    want to know — is this person still at their desk?
  const talkingToSupport = isSupportEntity(entityId);
  const isSupportThread =
    _.isFunction(ui._isSupportRow) && ui._isSupportRow(contact);

  // Support gets the product's own mark, not auto-coloured initials — see
  // supportAvatar(). Only on the user's side: to the agent ANSWERING support
  // the peer is a person, and their avatar and presence are the useful thing.
  const profileIcon = talkingToSupport
    ? supportAvatar(`${fig}__header-support-avatar`)
    : isContact
      ? Skeletons.UserProfile({
        className: `${fig}__header-profile`,
        id: entityId,
        firstname: fname,
        lastname: lname,
        fullname,
        online: onlineState,
        live_status: 1,
        sys_pn: 'header-profile'
      })
      : Skeletons.Button.Svg({
        ico: 'raw-drumee_projectroom',
        className: `${fig}__header-profile icon raw-drumee_projectroom`
      });

  const statusNote = talkingToSupport
    ? Skeletons.Note({
        // Deliberately NOT `__header-status`: _onPeerData finds the presence
        // element by that class and rewrites its text on every peer status
        // broadcast, which would replace this line with "Offline".
        className: `${fig}__header-support-note`,
        content: LOCALE.SUPPORT_AVAILABILITY
      })
    : (isContact ? Skeletons.Note({
        className: `${fig}__header-status`,
        sys_pn: 'header-status',
        dataset: { online: onlineState == null ? '' : onlineState },
        content: statusLabel(onlineState)
      }) : null);

  const info = Skeletons.Box.X({
    className: `${fig}__header-info`,
    kids: [
      backBtn,
      profileIcon,
      Skeletons.Box.Y({
        className: `${fig}__header-text`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__header-name-row`,
            kids: [
              Skeletons.Note({
                className: `${fig}__header-name`,
                content: displayName
              }),
              // Only on the agent's side. Talking TO support, the Drumee mark
              // and the name already say what this conversation is, and the
              // badge just repeats them; answering support, it is the one
              // thing marking a stranger's message as a request for help.
              isSupportThread && !talkingToSupport ? Skeletons.Note({
                className: `${fig}__support-pill`,
                content: LOCALE.SUPPORT_LABEL
              }) : null
            ]
          }),
          statusNote
        ]
      })
    ]
  });

  const flag = contact.mget(_a.flag);
  // `_a.support` is the legacy ticket flag; talkingToSupport covers the live
  // support conversation. Neither offers calls.
  const callable = flag !== _a.support && !talkingToSupport;

  const videoBtn = callable ? Skeletons.Button.Svg({
    ico: 'video',
    className: `${fig}__header-btn`,
    service: 'video-call',
    uiHandler: [ui]
  }) : null;

  const phoneBtn = callable ? Skeletons.Button.Svg({
    ico: 'telephone_handset',
    className: `${fig}__header-btn`,
    service: 'audio-call',
    uiHandler: [ui]
  }) : null;

  const actions = Skeletons.Box.X({
    className: `${fig}__header-actions`,
    kids: [
      videoBtn,
      phoneBtn,
      // `show-more` has no handler in chat_p2p — the button is inert. Leave it
      // where it has always been, but keep it out of the support thread rather
      // than offer a user in need of help a control that does nothing.
      talkingToSupport ? null : Skeletons.Button.Svg({
        ico: 'menu_expand',
        className: `${fig}__header-btn`,
        service: 'show-more',
        uiHandler: [ui]
      }),
      closeBtn
    ]
  });

  return Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [info, actions]
  });
};
