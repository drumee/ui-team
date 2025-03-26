// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
const __hub_website_main = function(_ui_) {
 
  const svg_options = {
    height  : 86, //40
    width   : 73, //47
    padding : 0
  };

  const close_options = {
    width   : 72,
    height  : 72,
    padding : 24    
  };

  const body = [ 
    Skeletons.Note({
      content   : LOCALE.CREATE_NEW_WEBSITE,
      className : `${_ui_.fig.family}__title`
    }),

    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__container mb-20`,
      sys_pn : _a.body,
      styleOpt: {
        width: 315
      },
      kids:[
        Skeletons.Box.X({
          className : `${_ui_.fig.family}__container-input mb-41`,
          uiHandler     : _ui_, 
          kids: [
            Skeletons.Entry({
              uiHandler       : _ui_,
              className   : "input",
              placeholder : LOCALE.WEBSITE_TITLE,
              errorClass  : 'input-details',
              sys_pn      : 'ref-name',
              service     : 'hub-name',
              mode : _a.interactive,
              preselect   : 1,
              name        : _a.name,
              require     : _a.any
            })
          ]
        }),
        Skeletons.Box.X({
          className  : `${_ui_.fig.family}__container-input`,
          uiHandler      : _ui_,
          kids: [
            Skeletons.Entry({
              uiHandler       : _ui_,
              className   : "input",
              placeholder : LOCALE.DOMAIN_NAME,
              errorClass  : 'input-details',
              sys_pn      : 'ref-ident',
              service     : 'hub-ident',
              mode : _a.interactive,
              name        : _a.ident,
              require     : _a.ident,
              api : {
                service : SERVICE.yp.get_ident_availablility
              }
            }),
            Skeletons.Note(_K.domainName, "domain pl-5 py-2")
          ]
        })
      ]
    }),
    
    Skeletons.Wrapper.Y({
      name      : "tooltips",
      uiHandler     : _ui_,
      className : `${_ui_.fig.family}__wrapper`
    }),

    Skeletons.Box.X({
      uiHandler     : _ui_,
      className : `${_ui_.fig.family}__container-commands u-jc-center`,
      sys_pn    : "ref-commands",
      state     : 0,
      kids      : [
        Skeletons.Box.Y({
          className : `${_ui_.fig.family}__builder from-model u-ai-center u-jc-center`, 
          service   : _e.create,
          mode      : "builder",
          uiHandler     : _ui_,
          kidsOpt   : { 
            active  : 0
          },
          kids      : [
            SKL_SVG("builder_model", {
              className: "mb-35"
            },svg_options),
            Skeletons.Note({
              className : `${_ui_.fig.family}__text text-center`, //"fill-up inline-error"
              content   : LOCALE.CREATE_FROM_MODELS
            }),
            Skeletons.Note({
              content : LOCALE.MOST_ENJOYED,
              className: `${_ui_.fig.family}__text--enjoyed u-jc-center u-ai-center text-center`
            })
          ]
        }),
        Skeletons.Box.Y({
          className : `${_ui_.fig.family}__builder from-scratch u-ai-center u-jc-center`,
          service   : _e.create,
          uiHandler     : _ui_,
          mode      : "creator",
          kidsOpt   : { 
            active  : 0
          },
          kids      : [
            SKL_SVG("builder_scratch", {
              // name     : 'creator'
              className: "mb-35"
            },svg_options),
            Skeletons.Note({
              content  : LOCALE.CREATE_FROM_SCRATCH,
              className : `${_ui_.fig.family}__text text-center`
            })
          ]
        })
      ]
    })
  ];

  const main = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main u-jc-sb u-ai-center`,
    uiHandler      : _ui_,
    debug : __filename,
    kids: [
      Skeletons.Box.Y({
        uiHandler      : _ui_,
        area       : _a.public,
        className  : `${_ui_.fig.family}__container h-100 u-jc-sb u-ai-center`,
        kids  : body
      })
    ]
  });

  const button = Skeletons.Button.Icon({
    className  : `${_ui_.fig.family}__close`,
    ico : "account_cross",
    uiHandler : _ui_,
    service   : _e.close
  }, close_options);  

  const a = [button, main];
  return a; 
};
module.exports = __hub_website_main;
