/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/signin/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_welcome_signin_content(_ui_) {
  const contentFig = _ui_.fig.family
  let dataset = _ui_.mget(_a.dataset) || {};
  const email = Skeletons.Box.X({
    className: `${contentFig}__wrapper email`,
    sys_pn: 'wrapper-ident"',
    dataset,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__row email`,
        kids: [
          Skeletons.Button.Svg({
            ico: 'profile-signup',
            className: `${contentFig}__icon email input-wrapper profile-signup`
          }),

          Skeletons.EntryBox({
            value: _ui_.currentUsername,
            className: `${contentFig}__entry email with-icon`,
            sys_pn: 'ref-ident',
            placeholder: LOCALE.EMAIL,
            mode: _a.commit,
            preselect: 1,
            onlyKeyboard: 1,
            service: _e.submit,
            uiHandler: [_ui_],
            errorHandler: [_ui_],
            showError: false,
          })
        ]
      })
    ]
  })

  const cn = `${contentFig}__wrapper password ${_ui_.fig.group}__row ${_ui_.fig.family}__row`
  const password = Skeletons.Box.X({
    className: `${contentFig}__wrapper password`,
    kids: [require('../../skeleton/password').default(_ui_)]
  })

  const submit = require('../../skeleton/common/button').default(_ui_, _e.submit, LOCALE.LOGIN)
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)
  //let base;
  // if(bootstrap().isElectron){
  //   auth = `${_K.module.welcome}/signin/gateway`;
  // }else{
  //   base = `${protocol}://${bootstrap().main_domain}${location.pathname}`;
  //   auth = `${base}${_K.module.welcome}/signin`;
  // }
  let href = `${_K.module.welcome}/signin/org`;
  let content = LOCALE.LOGIN_OTHER_POD;
  if (Organization.get('domain_id') > 1) {
    let { instance, main_domain } = bootstrap();
    if (instance == 'main') {
      instance = '/-/';
    } else {
      instance = `/-/${instance}/`;
    }

    let base = `${protocol}://${main_domain}${instance}`;
    href = `${base}${_K.module.welcome}/signin`;
    content = LOCALE.LOGIN_PERSONAL_ACCOUNT;
  }

  let helper = '';
  let create_account = '';

  
  if (Platform.get('isPublic')) {
    create_account = Skeletons.Note({
      className: `${contentFig}__note no-account helper text-underline`,
      content: LOCALE.Q_NO_ACCOUNT,
      dataset,
      href:"#/welcome/signup"
      // service: 'open-signup'
    })
  }

  if (Platform.get('arch') == "cloud") {
    helper = Skeletons.Box.Y({
      className: `${contentFig}__wrapper helper`,
      kids: [
        Skeletons.Box.X({
          className: `${contentFig}__row helper no-background`,
          dataset,
          kids: [
            Skeletons.Note({
              className: `${contentFig}__note forgot-password helper text-underline`,
              content: LOCALE.Q_FORGOT_PASSWORD,
              dataset,
              href: '#/welcome/reset'
            }),
            create_account
          ]
        }),

        Skeletons.Box.X({
          className: `${contentFig}__row company-url helper no-background`,
          dataset,
          kids: [
            Skeletons.Note({
              className: `${contentFig}__note helper text-underline`,
              dataset,
              content,
              href,
            })
          ]
        })
      ]
    })
  }

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__items content`,
    dataset,
    kids: [
      email,
      password,
      submit,
      msgBox,
      helper
    ]
  })

  return a;

}

module.exports = __skl_welcome_signin_content;