/**
 * Header for the selected contact's chat panel.
 * @param {View} ui    - The chat_p2p widget
 * @param {View} contact - The selected chat_contact_item view
 * @returns Skeleton
 */
module.exports = function (ui, contact) {
  const fig = ui.fig.family;

  const closeBtn = Skeletons.Button.Svg({
    ico: 'account_cross',
    className: `${fig}__header-btn`,
    service: 'close-chat',
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

  const profileIcon = isContact
    ? Skeletons.UserProfile({
        className: `${fig}__header-profile`,
        id: entityId,
        firstname: fname,
        lastname: lname,
        fullname,
        online: contact.mget(_a.online),
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
      profileIcon,
      Skeletons.Box.Y({
        className: `${fig}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__header-name`,
            content: displayName
          }),
          Skeletons.Note({
            className: `${fig}__header-status`,
            sys_pn: 'header-status',
            content: LOCALE.ACTIVE_NOW
          })
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
