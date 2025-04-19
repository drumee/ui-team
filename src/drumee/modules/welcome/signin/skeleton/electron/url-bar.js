/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/signin/skeleton/company-url.js
 * TYPE : Skeleton
 * ===================================================================**/

function __welcome_signin_url_bar(_ui_) {
  const commonFig = _ui_.fig.family;
  const fig = `${commonFig}-url-bar`;
  let host = localStorage.getItem('user_domain');
  let current_host = null;
  if (host != null) {
    current_host = host.replace(/(\.[a-zA-Z0-9\-_]+){2,2}$/, '');
  }
  const header = Skeletons.Box.Y({
    className: `${fig}__header`
  });

  let proto = Skeletons.Note({
    className: `${fig}__protocol`,
    content: "https://",
  })

  let entry = Skeletons.EntryBox({
    className: `${fig}__input`,
    sys_pn: 'ref-url',
    formItem: 'url',
    placeholder: LOCALE.ENTER_POD_URL,
    uiHandler: [_ui_],
    errorHandler: [_ui_],
    service : "join-endpoint",
    validators: [
      { reason: 'URL required', comply: Validator.require }
    ],
    showError: false
  })

  const submit = button = Skeletons.Box.X({
    className: `${fig}__button-wrapper no-background`,
    sys_pn: 'button-wrapper',
    service: 'check-company-url',
    kids: [
      Skeletons.Note({
        className: `${commonFig}__button-confirm`,
        content: "Go",
        service: "join-endpoint",
      })
    ]
  });


  let nav = Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__nav`,
    kids: [
      proto,
      entry,
      submit,
    ]
  });

  const hist = Skeletons.List.Smart({
    className: `${fig}__history`,
    sys_pn: 'history-wrapper',
    itemsOpt :{
      kind : 'welcome_signin_history',
      service : "select-endpoint",
      uiHandler : [_ui_]
    },
    kids : []
  });

  const msgBox = require('../../../skeleton/common/message-box').default(_ui_)
  let tips = '';
  const { endpoint } = bootstrap();
  if(!endpoint){
    tips = require("./no-endpoint")(_ui_);
  }
  let content = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__content`,
    kids: [
      nav,
      msgBox,
      tips,
      hist,
    ]
  });


  return { header, content };
};

module.exports = __welcome_signin_url_bar;
