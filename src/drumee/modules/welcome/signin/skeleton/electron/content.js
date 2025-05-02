/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/signin/skeleton/content.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_welcome_signin_content (_ui_) {
  const contentFig = _ui_.fig.family
  let dataset = _ui_.mget(_a.dataset) || {};
  let username = uiRouter.selectedUsername || null;
  console.log("AAA:1014 11 AA", username)
  let endpoint = _ui_.selectedEndpoint;
  if(endpoint && endpoint.mget){
    username =  endpoint.mget(_a.username);
    console.log("AAA:1014 AA", username)
    if(username == _K.ident.nobody) username = uiRouter.selectedUsername;
  }
  const email = Skeletons.Box.X({
    className  : `${contentFig}__wrapper email`,
    sys_pn     : 'wrapper-ident"',
    dataset,
    kids       : [
      Skeletons.Box.Y({
        className : `${contentFig}__row email`,
        kids : [    
          Skeletons.Button.Svg({
            ico       : 'profile-signup',
            className : `${contentFig}__icon email input-wrapper profile-signup`
          }),

          Skeletons.EntryBox({
            className     : `${contentFig}__entry email with-icon`,
            sys_pn        : 'ref-ident',
            placeholder   : LOCALE.EMAIL,
            mode          : _a.commit,
            value         : username,
            preselect     : 1,
            onlyKeyboard  : 1,
            service       : _e.submit,
            uiHandler     : [_ui_],
            errorHandler  : [_ui_],
            showError     : false
          })
        ]
      })
    ]
  })
  
  const password = Skeletons.Box.X({
    className  : `${contentFig}__wrapper password`,
    kids : [require('../../../skeleton/password').default(_ui_)]
  })
  
  const submit = require('../../../skeleton/common/button').default(_ui_, _e.submit, LOCALE.LOGIN)
  const msgBox = require('../../../skeleton/common/message-box').default(_ui_)

  const helper = Skeletons.Box.Y({
    className  : `${contentFig}__wrapper helper`,
    kids       : [
      Skeletons.Box.X({
        className  : `${contentFig}__row helper no-background`,
        dataset,
        kids       : [
          Skeletons.Note({
            className  : `${contentFig}__note forgot-password helper text-underline`,
            content    : LOCALE.Q_FORGOT_PASSWORD,
            dataset,
            href        : '#/welcome/reset'
          }),

          Skeletons.Note({
            className  : `${contentFig}__note no-account helper text-underline`,
            content    : LOCALE.Q_NO_ACCOUNT,
            dataset,
            service    : 'open-signup'
          })
        ]
      }),

      Skeletons.Box.X({
        className :`${contentFig}__row company-url helper no-background`,
        dataset,
        kids      : [
          Skeletons.Note({
            className : `${contentFig}__note helper text-underline`,
            dataset,
            content : LOCALE.LOGIN_OTHER_POD,
            service : 'prompt-endpoint'
          })
        ]
      })
    ]
  })

  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className  : `${contentFig}__items content`,
    dataset,
    kids       : [
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