// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_contact_item = function (_ui_) {

  let profile_icon;
  const fname = _ui_.mget(_a.firstname) || '';
  const lname = _ui_.mget(_a.lastname) || '';
  const fullname = _ui_.mget(_a.fullname) || (fname + " " + lname);
  const displayName = _ui_.mget(_a.surname) || _ui_.mget('display');

  const contentFig = _ui_.fig.family;

  if (_ui_.mget('flag') === 'share') {
    profile_icon = Skeletons.Button.Svg({
      ico: 'raw-drumee_projectroom',
      className: `${contentFig}__icon raw-drumee_projectroom`
    });
  } else {
    const status = _ui_.mget('status');
    switch (status) {
      case _a.active: case _a.informed:
        profile_icon = Skeletons.UserProfile({
          className: `${contentFig}__profile`,
          id: _ui_.mget(_a.entity) || _ui_.mget(_a.id) || _ui_.mget('drumate_id'),
          firstname: fname || displayName,
          lastname: lname,
          fullname,
          auto_color: 1,
          online: _ui_.mget(_a.online),
          live_status: 1
        });
        break;
      case _a.memory:
        profile_icon = Skeletons.Button.Svg({
          ico: 'desktop_drumeememo',
          className: `${contentFig}__icon profile-icon ${status} desktop_drumeememo`
        });
        break;
      case _a.sent:
        profile_icon = Skeletons.Button.Svg({
          ico: 'drumee_user_hourglass',//'user-help'
          className: `${contentFig}__icon profile-icon ${status} user-help`
        });
        break;
      default:
        profile_icon = Skeletons.Button.Svg({
          ico: 'account_contacts',
          className: `${contentFig}__icon profile-icon ${status} account_contacts`
        });
    }
  }

  // Contact info section
  const nameLabel = Skeletons.Note({
    className: `${contentFig}__label`,
    content: LOCALE.NAME || "Name"
  });

  const nameValue = Skeletons.Note({
    className: `${contentFig}__value`,
    content: displayName
  });

  const nameRow = Skeletons.Box.X({
    className: `${contentFig}__row`,
    kids: [
      nameLabel,
      nameValue
    ]
  });

  const emailLabel = Skeletons.Note({
    className: `${contentFig}__label`,
    content: LOCALE.EMAIL || "Email"
  });

  const emailValue = Skeletons.Note({
    className: `${contentFig}__value`,
    content: _ui_.mget(_a.email) || "Public folder"
  });

  const emailRow = Skeletons.Box.X({
    className: `${contentFig}__row`,
    kids: [
      emailLabel,
      emailValue
    ]
  });

  const phoneLabel = Skeletons.Note({
    className: `${contentFig}__label`,
    content: LOCALE.PHONE || "Phone"
  });

  const phoneValue = Skeletons.Note({
    className: `${contentFig}__value`,
    content: _ui_.mget(_a.phone) || _ui_.mget('updated_at') || ""
  });

  const phoneRow = Skeletons.Box.X({
    className: `${contentFig}__row`,
    kids: [
      phoneLabel,
      phoneValue
    ]
  });

  const contactInfo = Skeletons.Box.Y({
    className: `${contentFig}__info`,
    kids: [
      nameRow,
      emailRow,
      phoneRow
    ]
  });

  // Action buttons
  const editButton = Skeletons.Button.Label({
    className: `${contentFig}__edit-btn`,
    label: LOCALE.EDIT_CONTACT || "Edit contact",
    ico: "edit",
    service: 'edit-contact',
    uiHandler: _ui_
  });

  const removeButton = Skeletons.Button.Label({
    className: `${contentFig}__remove-btn`,
    label: LOCALE.REMOVE_CONTACT || "Remove contact",
    ico: "trash",
    service: 'remove-contact',
    uiHandler: _ui_
  });

  const actionButtons = Skeletons.Box.X({
    className: `${contentFig}__actions`,
    kids: [
      editButton,
      removeButton
    ]
  });

  const a = Skeletons.Box.Y({
    className: `${contentFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__container`,
        kids: [
          Skeletons.Box.Y({
            className: `${contentFig}__avatar-wrapper`,
            kids: [
              profile_icon
            ]
          }),
          contactInfo,
          actionButtons
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_contact_item;