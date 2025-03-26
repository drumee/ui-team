/*
 * decaffeinate suggestions:
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
// 
// ===========================================================
const __skl_plus_icon = function(_ui_, name ) {

  const plusIcon = Skeletons.Button.Svg({
    ico         : 'desktop_plus',
    className   : `${`${_ui_.fig.family}`}__icon input-icon plus-icon desktop_plus`,
    service     : 'add-item',
    itemName    : name
  });

  return plusIcon;
};

// ===========================================================
//
// ===========================================================
const __skl_addressbook_widget_contact_form = function(_ui_) {
  
  let inviteCheck, profile_icon;
  const {
    contact
  } = _ui_;

  const formFig = `${_ui_.fig.family}`;

  let fetchTags = 1;
  if (_ui_.mode === _a.new) {
    fetchTags = 0;
  }
  const tagMenu = {
    kind      : 'widget_tag_form_menu',
    sys_pn    : 'tag-form-menu',
    entity_id : contact[_a.id],
    autoSave  : 0,
    fetchTags 
  };


  let title = Skeletons.Box.X({
    className   : `${formFig}__wrapper header`,
    kids        : [
      tagMenu,

      Skeletons.Box.X({
        className   : `${formFig}__wrapper title form-row`,
        kids        : [
          Skeletons.Note({
            className   : `${formFig}__label title`,
            content     : LOCALE.CREATE_CONTACT
          })
        ]})
    ]});

  const displayName = contact[_a.surname] || '';
  const firstname = contact[_a.firstname] || '';
  const lastname  = contact[_a.lastname] || '';
  const fullname  = contact[_a.fullname] || (firstname + ' ' + lastname);

  if ((contact.status === _a.active) || (contact.status === 'informed')) {
    profile_icon = Skeletons.UserProfile({
      className : `${formFig}__profile avatar`,
      id        : contact[_a.entity] || contact['contact_id'] || contact[_a.id],
      firstname : firstname || displayName,
      lastname,
      fullname
    });
  } else {
    profile_icon = Skeletons.Button.Svg({
      ico       : 'desktop_contactbook',
      className : `${formFig}__icon profile-icon desktop_contactbook`
    });
  }

  const header = Skeletons.Box.X({
    className   : `${formFig}__wrapper header`,
    kids        : [
      tagMenu,

      Skeletons.Box.X({
        className : `${formFig}__wrapper profile`,
        kids      : [
          profile_icon,

          Skeletons.Note({
            className : `${formFig}__label fullname title`,
            content   : displayName
          })
        ]})
    ]});

  if (_ui_.mode === _a.edit) {
    title = header;
  }

  const separator = Skeletons.Box.X({
    className : `${formFig}__separator`});

  const name = Skeletons.Box.X({
    className   : `${formFig}__wrapper name form-row no-multiple`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'profile-signup',
        className   : `${formFig}__icon input-icon no-multiple account profile-signup`
      }),
      
      Skeletons.Box.Y({
        className   : `${formFig}__entry-wrapper name`,
        kids        : [
          Skeletons.EntryBox({
            className   : `${formFig}__entry firstname form-input`,
            formItem    : _a.firstname,
            placeholder : LOCALE.FIRSTNAME,
            value       : firstname,
            showError     : 1,
            validators    : [
              { reason: LOCALE.FIRST_NAME_REQUIRED , comply: Validator.require }
            ],
            preselect   : _ui_.mode === _a.new ? 1 : 0
          }),

          Skeletons.EntryBox({
            className   : `${formFig}__entry familyname form-input`,
            formItem    : _a.lastname,
            placeholder : LOCALE.LASTNAME,
            value       : lastname,
            showError   : 1,
            validators  : [
              { reason: LOCALE.LASTNAME_REQUIRED , comply: Validator.require }
            ]}),

          Skeletons.EntryBox({
            className   : `${formFig}__entry familyname form-input`,
            formItem    : _a.surname,
            placeholder : LOCALE.SURNAME,
            maxlength   : 25, 
            value       : contact['given_surname'] || ''
          }),

          Skeletons.Button.Svg({
            ico       : 'info',
            className : `${formFig}__icon-info`,
            tooltips  : { 
              content : LOCALE.CUSTOM_NAME
            }
          })
        ]})
    ]});

  const email = Skeletons.Box.X({
    className   : `${formFig}__wrapper email form-row multiple`,
    kids        : [
      __skl_plus_icon(_ui_, 'email-list'),

      Skeletons.Button.Svg({
        ico         : 'email',
        className   : `${formFig}__icon input-icon multiple email`
      }),
      
      Skeletons.Box.Y({
        formItem      : _a.email,
        sys_pn        : 'email-list',
        dataType      : _a.array,
        className     : `${formFig}__entry-wrapper email`,
        itemName      : 'email-list',
        itemsOpt      : { 
          kind        : 'email_input_item',
          uiHandler   : _ui_, 
          isNeedEmail : contact['is_need_email']
        }})
    ]});

  const phone = Skeletons.Box.X({
    className   : `${formFig}__wrapper phone form-row multiple`,
    kids        : [
      __skl_plus_icon(_ui_, 'phone-list'),

      Skeletons.Button.Svg({
        ico         : 'account_phone',
        className   : `${formFig}__icon input-icon multiple account_phone`
      }),
      
      Skeletons.Box.Y({
        sys_pn      : 'phone-list',
        formItem    : _a.mobile,
        dataType    : _a.array,
        className   : `${formFig}__entry-wrapper phone`,
        itemName    : 'phone-list',
        itemsOpt    : { 
          kind      : 'phoneno_input_item',
          uiHandler : _ui_
        }
      })
    ]});

  const address = Skeletons.Box.X({
    className   : `${formFig}__wrapper address form-row multiple`,
    kids        : [
      __skl_plus_icon(_ui_, 'address-list'),

      Skeletons.Button.Svg({
        ico         : 'ab_address',
        className   : `${formFig}__icon input-icon multiple ab_address`
      }),

      Skeletons.Box.Y({
        sys_pn      : 'address-list',
        className   : `${formFig}__entry-wrapper address`,
        itemName    : 'address-list',
        formItem    : _a.address,
        dataType    : _a.array,
        itemsOpt    : { 
          kind      : 'address_input_item',
          uiHandler : _ui_
        }
      })
    ]});

  const notes = Skeletons.Box.X({
    className   : `${formFig}__wrapper notes form-row no-multiple`,
    kids        : [
      Skeletons.Box.X({
        className   : `${formFig}__entry-wrapper notes`,
        kids        : [
          Skeletons.Entry({
            className   : `${formFig}__entry notes form-input`,
            type        : _a.textarea,
            formItem    : 'comment',
            placeholder : LOCALE.NOTES,
            value       : contact.comment || ''
          })
        ]})
    ]});
  
  const messageWrapper = Skeletons.Wrapper.Y({
    className : `${formFig}__wrapper message`,
    name      : 'messageInputBox'
  });
  
  if ((contact.status === _a.active) || (contact.status === 'informed')) {
    inviteCheck = '';
  } else {
    inviteCheck = Skeletons.Box.X({
      className   : `${formFig}__notes-wrapper invite form-row`,
      kids        : [
        Skeletons.Button.Svg({
          className   : `${formFig}__icon input-icon invite-icon`,
          icons       : ["box-tags", "backoffice_checkboxfill"],
          state       : 0,
          formItem    : _a.invite,
          service     : 'trigger-invite-user'
        }),
        
        Skeletons.Note({
          className   : `${formFig}__label input-label`,
          content     : LOCALE.JOIN_DRUMEE_NETWORK
        })
      ]});
  }
  
  let buttonLabel = LOCALE.ADD;
  if (contact.type === 'my_contact') {
    buttonLabel = LOCALE.MODIFY;
  }
  
  const buttons = Preset.ConfirmButtons(_ui_, 
    { 
      confirmLabel:buttonLabel , 
      cancelService   : 'cancel-edit' 
    },
    {
      sys_pn  : 'submit-button'
    });
  
  const a = Skeletons.Box.Y({
    className  : `${formFig}__main`,
    debug      : __filename,
    sys_pn     : 'contact-form',
    kids       : [
      title,
      separator,

      Skeletons.Box.Y({
        className  : `${formFig}__container`,
        kids : [
          Skeletons.Box.Y({
            className : `${formFig}__form-wrapper`,
            sys_pn    : 'form_list-wrapper',
            kids      : [
              name,
              email,
              phone,
              address,
              notes,
              (() => {
              if (Visitor.canShow('invite-user')) {
                inviteCheck;
                return messageWrapper;
              }
            })()
            ]})
        ]}),

      Skeletons.Box.Y({
        className  : `${formFig}__footer`,
        kids : [buttons]})
    ]});
  
  return a;
};

module.exports = __skl_addressbook_widget_contact_form;
