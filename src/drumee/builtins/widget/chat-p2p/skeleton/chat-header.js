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

  const profileIcon = isContact
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

  const info = Skeletons.Box.X({
    className: `${fig}__header-info`,
    kids: [
      backBtn,
      profileIcon,
      Skeletons.Box.Y({
        className: `${fig}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__header-name`,
            content: displayName
          }),
          isContact ? Skeletons.Note({
            className: `${fig}__header-status`,
            sys_pn: 'header-status',
            dataset: { online: onlineState == null ? '' : onlineState },
            content: statusLabel(onlineState)
          }) : null
        ]
      })
    ]
  });

  const flag = contact.mget(_a.flag);
  const callable = flag !== _a.support;

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
      Skeletons.Button.Svg({
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
