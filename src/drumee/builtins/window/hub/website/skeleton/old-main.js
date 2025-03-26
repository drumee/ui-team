// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/counter/project/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __hub_slk_main
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const __hub_slk_main = function(_ui_) {
 
  const svg_options = {
    height  : 86, //40
    width   : 73, //47
    padding : 0
  };

  const close_options = {
    width   : 48,
    height  : 48,
    padding : 16    
  };

  const invitation = { 
    kind      : 'invitation',
    signal    : _e.ui.event,
    service   : _e.update,
    mode      : 'mini',
    preselect : 0,
    dataset   : {
      editable : 0
    },
    authority : 1, // Only to supress warning
    handler   : {
      uiHandler   : _ui_
    }
  };

  const body = [
    Skeletons.Box.X({
      className : "u-jc-center mb-63",
      kids: [
        Skeletons.Note({
          content   : LOCALE.CREATE_NEW_PROJECT_ROOM, //LOCALE.CREATE_SHAREROOM
          sys_pn    : _a.header,
          className : `${_ui_.fig.family}__title`
        }),
        Skeletons.Button.Svg({
          ico       : "desktop_information--new",
          tooltips  : {
            content : "Only authorized contacts can access to project room"
          },
          className   : `${_ui_.fig.family}__info ml-20 u-ai-center`
        })
      ]
    }),        
    Skeletons.Box.Y({
      className : "mb-20",
      sys_pn    : _a.body,
      uiHandler     : _ui_,
      styleOpt  : {
        width   : 300
      }, //220 #192 #315
      kids:[
        Skeletons.Box.X({
          className: `${_ui_.fig.family}__container add-website__input-block mb-28`,
          kids: [
            Skeletons.Entry({
              cn          : "input--inline input--small",
              placeholder : LOCALE.PROJECT_NAME,
              sys_pn      : _a.name,
              mode : _a.interactive,
              preselect   : 1,
              uiHandler       : _ui_,
              service     : _a.name
            })
          ]
        }),
        Skeletons.Box.Y({
          className: `${_ui_.fig.family}__container add-website__input-block`,
          kids: [
            invitation
            // Skeletons.Note({
            //   content : "Add later"
            //   className: "invitation--skip py-2"
            // })
          ]
        })
      ]
    }),
    Skeletons.Wrapper.Y({
      name      : "availability",
      part      : _ui_,
      className : "availability"
    }),
    // Skeletons.Box.X({
    //   wrapper : 1
    //   sys_pn  : "availability"
    //   cn      : "account-form__label popup__text--small popup__text--danger"
    // })
    Skeletons.Box.X({
      className : `${_ui_.fig.family}__container-commands u-jc-center`,
      sys_pn    : "ref-commands",
      dataset   : {
        active  : 0
      },
      kids      : [
        Skeletons.Note({
          content :  LOCALE.CREATE,
          cn      : 'btn--confirm',
          service : _e.create,
          uiHandler   : _ui_
        })
      ]
    })
  ];

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main popup__inner`,
    uiHandler : _ui_,
    debug : __filename,
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Box.Y({
        uiHandler : _ui_,
        area    : _a.private,
        className  : `${_ui_.fig.family}__container-body h-100 u-jc-sb u-ai-center`,
        kids  : body
      })
      // Skeletons.Button.Icon({
      //   cn  : "popup__close"
      //   ico :"account_cross"
      //   uiHandler : _ui_
      //   service   : _e.close
      // }, close_options)        
    ]
  });
  return a;
};
module.exports = __hub_slk_main;
