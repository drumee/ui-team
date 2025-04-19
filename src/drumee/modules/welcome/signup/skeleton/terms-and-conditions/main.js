// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/modules/welcome/signup/skeleton/terms-and-conditions/main.js
//   TYPE : Skeleton
// ==================================================================== *

// ==================================================
//
// ===========================================================
function __skl_welcome_signup_terms_and_conditions (_ui_) {
  const conditionsFig = `${_ui_.fig.family}-terms-and-conditions`
  let path = bootstrap().appRoot;
  if(__BUILD__=='production') path = '/';
  //https://tunnel.drumee.com/termsandconditions/en/CGU_Drumee.html
  
  let l = Visitor.language();
  if(!/(fr|en)/.test(l)){
    l = 'fr';
  }
  let source = `https://${_K.host.cdn}${path}termsandconditions/${l}/CGU_Drumee`;
  _ui_.debug(`AAA:189 source=${source}`);
  const download = Skeletons.Box.X({
    className   : `${conditionsFig}__download`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'download',
        className   : `${conditionsFig}__icon download`,
        service     : _e.download,
        uiHandler   : _ui_,
        href        : `${source}.pdf`,
        target      : '_blank'
      })
    ]
  });

  const title = Skeletons.Box.X({
    className   : `${conditionsFig}__title`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'feather',
        className   : `${conditionsFig}__icon feather`,
        service     : _e.close,
        uiHandler   : _ui_
      }),

      Skeletons.Note({
        className : `${conditionsFig}__note title`,
        content   : LOCALE.GENERAL_CONDITIONS_OF_USE
      })
    ]
  });

  const close = Skeletons.Box.X({
    className   : `${conditionsFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${conditionsFig}__icon close account_cross`,
        service     : _e.close,
        uiHandler   : _ui_
      })
    ]
  });
  
  const header = Skeletons.Box.X({
    className : `${conditionsFig}__header`,
    kids      : [
      download,
      title,
      close
    ]
  });

  const body = Skeletons.Box.X({
    className : `${conditionsFig}__body`,
    kids      : [
      Skeletons.Box.Y({
        className : `${conditionsFig}__body-content`,
        kids      :  [
          Skeletons.Box.Y({
            className : `${conditionsFig}__wrapper cgu`,
            kids      : [
              {
                kind      : KIND.iframe,
                className : `${conditionsFig}__iframe cgu`,
                source : `${source}.html`
              },
              
              Skeletons.Box.X({
                className : `${conditionsFig}_buttons-wrapper`,
                kids      : [
                  Preset.ConfirmButtons(_ui_,
                    { 
                      confirmLabel   : LOCALE.ACCEPT,
                      confirmService : 'accept-conditions',
                      cancelLabel    : LOCALE.REFUSE,
                      cancelService  : _e.close
                    },
                    {
                      sys_pn  : 'submit-button'
                    })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const content = Skeletons.Box.Y({
    className : `${conditionsFig}__content`,
    kids      : [
      header,
      body
    ]
  });

  const a = Skeletons.Box.X({
    className : `${conditionsFig}__main u-jc-center u-ai-center`,
    debug     : __filename, 
    kids      : [
      Skeletons.Box.Y({
        className : `${conditionsFig}__container`,
        kids      : [
          content
        ]
      })
    ]
  });

  return a;
};

export default __skl_welcome_signup_terms_and_conditions;
