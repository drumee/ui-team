
const __skl_contact_detail_show = function (_ui_) {

  let actionMenu, profile_icon, tag;
  const contact = _ui_.mget(_a.contact);
  const { family } = _ui_.fig;
  const {
    status
  } = contact;

  const firstname = contact[_a.firstname] || '';
  const lastname = contact[_a.lastname] || '';
  const fullname = contact[_a.fullname] || (firstname + ' ' + lastname);

  switch (status) {
    case _a.active: case _a.informed:
      profile_icon = Skeletons.UserProfile({
        className: `${family}__profile avatar`,
        id: contact[_a.entity] || contact['contact_id'] || contact[_a.id],
        firstname: firstname || contact[_a.surname],
        lastname,
        fullname
      });
      break;
    case _a.memory:
      profile_icon = Skeletons.Button.Svg({
        ico: 'desktop_drumeememo',
        className: `${family}__icon profile-icon ${status} desktop_drumeememo`
      });
      break;

    case _a.sent:
      profile_icon = Skeletons.Button.Svg({
        ico: 'drumee_user_hourglass',//'user-help'
        className: `${family}__icon profile-icon ${status} user-help`
      });
      break;

    default:
      profile_icon = Skeletons.Button.Svg({
        ico: 'account_contacts',
        className: `${family}__icon profile-icon ${status} account_contacts`
      });
  }

  const optionMenu = Skeletons.Box.X({
    className: `${family}__option-menu-wrapper`,
    kids: [
      contact.is_blocked === 1 ?
        Skeletons.Note({
          className: `${family}__note blocked`,
          content: LOCALE.CONTACT_BLOCKED
        })
        :
        (tag = {
          kind: 'widget_tag_form_menu',
          entity_id: contact[_a.id]
        })
    ]
  });

  const userProfile = Skeletons.Box.X({
    className: `${family}__profile-wrapper`,
    kids: [
      profile_icon,

      Skeletons.Note({
        className: `${family}__note fullname label`,
        content: contact[_a.surname]
      })
    ]
  });

  if (!Visitor.isMimicActiveUser()) {
    actionMenu = require('./action-menu')(_ui_, contact);
  } else {
    actionMenu = Skeletons.Box.X({
      className: `${family}__action-menu-wrapper`,
      kids: [
        // if not Visitor.isMimicActiveUser()
        //   require('./action-menu')(_ui_, contact)
      ]
    });
  }

  const header = Skeletons.Box.X({
    className: `${family}__wrapper header`,
    kids: [
      optionMenu,
      userProfile,
      actionMenu
    ]
  });

  const separator = Skeletons.Box.X({
    className: `${family}__separator`
  });

  const name = Skeletons.Box.X({
    className: `${family}__wrapper name`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'profile-signup',
        className: `${family}__icon profile-signup`
      }),

      Skeletons.Box.Y({
        className: `${family}__items name`,
        kids: [
          firstname ?
            Skeletons.Note({
              className: `${family}__note firstname selectable-text`,
              content: firstname,
              escapeContextmenu: true
            }) : undefined,

          lastname ?
            Skeletons.Note({
              className: `${family}__note familyname selectable-text`,
              content: lastname,
              escapeContextmenu: true
            }) : undefined
        ]
      })
    ]
  });

  if (!(contact != null ? contact.email : undefined)) {
    contact[_a.email] = [];
  }
  if (_.isString(contact != null ? contact.email : undefined)) {
    contact[_a.email] = [{ email: contact[_a.email], is_default: 1 }];
  }

  const emailItems = require('./email-item');
  const email = Skeletons.Box.X({
    className: `${family}__wrapper email`,
    kids: [
      Skeletons.Button.Svg({
        ico: "email",
        className: `${family}__icon email`
      }),

      (contact.email != null ? contact.email.length : undefined) ?
        Skeletons.Box.Y({
          className: `${family}__items email`,
          kids: (contact[_a.email] != null ? contact[_a.email].map(emailItems) : undefined)
        }) : undefined
    ]
  });

  const phoneItems = require('./phone-item');
  const phone = Skeletons.Box.X({
    className: `${family}__wrapper phone`,
    kids: [
      Skeletons.Button.Svg({
        ico: "account_phone",
        className: `${family}__icon account_phone`
      }),

      (contact.mobile != null ? contact.mobile.length : undefined) ?
        Skeletons.Box.Y({
          className: `${family}__items phone`,
          kids: (contact[_a.mobile] != null ? contact[_a.mobile].map(phoneItems) : undefined)
        }) : undefined
    ]
  });

  const addressItems = require('./address-item');
  let address = Skeletons.Box.X({
    className: `${family}__wrapper address`,
    kids: [
      Skeletons.Button.Svg({
        ico: "ab_address",
        className: `${family}__icon ab_address`
      })
    ]
  });

  if (contact.address != null ? contact.address.length : undefined) {
    address = Skeletons.Box.Y({
      className: `${family}__wrapper address`,
      kids: (contact[_a.address] != null ? contact[_a.address].map(addressItems) : undefined)
    });
  }

  const commentTxt = contact[_a.comment] || '';
  const comment = Skeletons.Box.X({
    className: `${family}__wrapper comment`,
    kids: [
      Skeletons.Note({
        className: `${family}__note comment details selectable-text`,
        content: commentTxt.nl2br(),
        escapeContextmenu: true
      })
    ]
  });

  let inviteWrapper = '';
  if ((contact.is_archived !== 1) && ((status === _a.sent) || (status === _a.memory))) {
    let _content;
    let inviteInfo = '';
    if (status === _a.sent) {
      _content = LOCALE.RESEND_INVITE;//'Resend Invite'
      inviteInfo = Skeletons.Note({
        className: `${family}__note invite-info details`,
        content: LOCALE.INVITED_CONTACT_ALREADY
      });

    } else if (status === _a.memory) {
      _content = LOCALE.INVITE_TO_JOIN_DRUMEE_NETWORK;

    } else if (contact.is_drumate) {
      _content = LOCALE.SEND_CONNECTION_REQUEST;
    }

    inviteWrapper = Skeletons.Box.Y({
      className: `${family}__wrapper invite-wrapper`,
      kids: [
        inviteInfo,
        Skeletons.Box.X({
          className: `${family}__wrapper invite-button`,
          sys_pn: 'wrapper-notifier',
          kids: [
            Skeletons.Note({
              className: `${family}__note invite-button details ${status}`,
              content: _content,
              service: 'resend-invite',
              uiHandler: _ui_
            })
          ]
        })
      ]
    });
  }

  const a = Skeletons.Box.Y({
    className: `${family}__container`,
    debug: __filename,
    kids: [
      header,
      separator,

      Skeletons.Box.Y({
        className: `${family}__show`,
        kids: [
          name,
          email,
          phone,
          address,
          contact[_a.comment] ?
            comment : undefined,
          Visitor.canShow('invite-user') ?
            inviteWrapper : undefined
        ]
      })
    ]
  });

  return a;
};


module.exports = __skl_contact_detail_show;
