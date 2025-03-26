// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/form/skeleton/content.js
//   TYPE : Skeleton
// ==================================================================== *
const __row = function (_ui_, iconName, opt) {
  const formFig = _ui_.fig.family;
  const icon = Skeletons.Button.Svg({
    ico: iconName,
    className: `${formFig}__icon input-icon-prefix`
  });
  opt.cn = opt.cn || '';
  let cn = opt.cn || '';
  delete opt.cn;
  const a = Skeletons.Box.Y({
    className: `${formFig} row-wrapper input-wrapper ${cn}`,
    kids: [
      Skeletons.EntryBox({
        className: `${formFig}__entry with-icon`,
        formItem: 'name',
        sys_pn: 'ref-name',
        uiHandler: _ui_,
        prefix: icon,
        errorHandler: [_ui_],
        showError: true,
        ...opt
      }),
    ]
  });
  return a;
};

const __api_contact_form = function (_ui_) {
  const formFig = _ui_.fig.family;
  const compOpt = {
    placeholder: LOCALE.COMPANY_NAME,
    preselect: 1,
    cn: 'company r1',
    formItem: 'company_name',
    validators: [
      {
        reason: LOCALE.REQUIRE_THAT_FIELD.format(LOCALE.COMPANY_NAME.toLowerCase()),
        comply: Validator.require
      }
    ]
  };
  const userOpt = {
    placeholder: LOCALE.CNAME,
    formItem: 'contact_name',
    cn: 'contact r1',
    validators: [
      {
        reason: LOCALE.REQUIRE_THAT_FIELD.format(LOCALE.CNAME.toLowerCase()),
        comply: Validator.require
      }
    ]
  };

  const emailOpt = {
    mode: _a.commit,
    placeholder: LOCALE.PRO_EMAIL,
    cn: 'email r2',
    formItem: 'email',
    validators: [
      {
        reason: LOCALE.ENTER_VALID_EMAIL,
        comply: Validator.email
      },
      {
        reason: LOCALE.REQUIRE_THAT_FIELD.format(LOCALE.EMAIL.toLowerCase()),
        comply: Validator.require
      }
    ]
  };

  const phoneOpt = {
    placeholder: LOCALE.PRO_PHONE,
    comply: _a.none,
    formItem: 'phone',
    cn: 'phone r2',
  };

  const messageOpt = {
    placeholder: LOCALE.MESSAGE,
    type: _a.textarea,
    cn: 'message r3',
    formItem: 'message',
    validators: [
      {
        reason: LOCALE.REQUIRE_THAT_FIELD.format(LOCALE.MESSAGE.toLowerCase()),
        comply: Validator.require
      }
    ]
  };

  const formElements = Skeletons.Box.G({
    className: `${_ui_.fig.family}__form-content`,
    kids: [
      __row(_ui_, 'company', compOpt),
      __row(_ui_, 'account_contacts', userOpt),
      __row(_ui_, _a.email, emailOpt),
      __row(_ui_, 'telephone_handset', phoneOpt),
      __row(_ui_, 'editbox_pencil', messageOpt)
    ]
  });

  const button = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__form-button-wrapper`,
    sys_pn: "go-button-wrapper",
    kids: [
      Skeletons.Box.X({
        className: `${formFig}_go_btn_wrapper`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__form-button action-btn`,
            service: _e.submit,
            content: LOCALE.SEND
          })
        ]
      })
    ]
  });

  const errorMessage = Skeletons.Box.X({
    className: `${_ui_.fig.family}__row ${_ui_.fig.group}__error-wrapper`,
    sys_pn: "error-message-wrapper",
    dataset: {
      state: _a.closed
    },
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.group}__error-message`,
        sys_pn: "error-message",
        content: ""
      })
    ]
  });
  let link, notice;
  if (_ui_.mget('privacyContent')) {
    notice = Skeletons.Box.X({
      className: `${_ui_.fig.family}__notice-container`,
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.family}__notice-text`,
          content: _ui_.mget('privacyContent'),
        })
      ]
    });
  } else if (/default/i.test(_ui_.mget('privacyPolicy'))) {
    link = '<a href="https://drumee.com/engegements-protection-vie-privee/">charte de confidentialité</a>'
    notice = Skeletons.Box.X({
      className: `${_ui_.fig.family}__notice-container`,
      kids: [
        Skeletons.Note({
          className: `${_ui_.fig.family}__notice-text`,
          content: `Conformément à la ${link} vos coordonnées restent totalement confidentielles et ne sont communiquées à personne.`,
        })
      ]
    });
  }

  const form = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__form-container`,
    kids: [
      formElements,
      button,
      errorMessage
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [
      form,
    ]
  });
  if (notice) a.kids.push(notice);
  return a;
};
module.exports = __api_contact_form; 
