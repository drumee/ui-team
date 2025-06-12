/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/signin/skeleton/company-url.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_welcome_signin_url(_ui_) {
  const commonFig = _ui_.fig.family;
  const fig = `${commonFig}-url`;
  let host = localStorage.getItem('user_domain');
  let dataset = _ui_.mget(_a.dataset) || {};
  let current_host = null;
  if (host != null) {
    current_host = host.replace(/(\.[a-zA-Z0-9\-_]+){2,2}$/, '');
  }
  const header = Skeletons.Box.Y({
    className: `${fig}__header`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.PLEASE_ENTER_COMPANY_URL,
        dataset,
      }),
    ]
  })
  const url = Skeletons.Box.X({
    className: `${fig}__entry`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__protocol`,
        content: "https://",
      }),

      Skeletons.EntryBox({
        className: `${fig}__input`,
        sys_pn: 'ref-url',
        formItem: 'url',
        placeholder: LOCALE.COMPANY_URL_ADDRESS,
        uiHandler: [_ui_],
        errorHandler: [_ui_],
        validators: [
          { reason: 'URL required', comply: Validator.require }
        ],
        showError: false
      }),

      Skeletons.Note({
        className: `${fig}__domain`,
        content: `.${bootstrap().main_domain}`,
      }),
    ]
  })

  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  const submit = button = Skeletons.Box.X({
    className: `${fig}__button-wrapper no-background`,
    sys_pn: 'button-wrapper',
    service: 'check-company-url',
    kids: [
      Skeletons.Note({
        className: `${commonFig}__button-confirm`,
        content: LOCALE.COMPANY_LOGIN,
        active: 0
      })
    ]
  });

  let base =  `${protocol}://${bootstrap().main_domain}${location.pathname}`;
  let auth = `${base}${_K.module.welcome}/signin`;

  const altLogin = Skeletons.Note({
    className: `${fig}__alt helper text-underline`,
    dataset,
    content: LOCALE.LOGIN_PERSONAL_ACCOUNT,
    href: auth,
  });

  let content = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}`,
    kids: [
      url,
      submit,
      msgBox,
      altLogin,
    ]
  });

  return { header, content };
};

module.exports = __skl_welcome_signin_url
