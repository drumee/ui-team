/* ================================================================== *
 * Copyright Xialia.com  2011-2023
 * FILE : src/drumee/modules/setup/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_setup  (_ui_) {
  const fig = _ui_.fig.family 



  const logo = Skeletons.Box.Y({
    className : `${fig}__wrapper logo`,
    kids      : [
      Skeletons.Box.Y({
        className : `${fig}__logo-container`,
        // href      : `${protocol}://${Host.get('main_domain')}`, // `${location.origin}${bootstrap().endpointPath}`
        kids      : [
          Skeletons.Element({
            className : `${fig}__logo image`,
            tagName : _K.tag.img,
            attrOpt : {
              src : '/-/images/logo/main.png',
              alt : 'Drumee'
            }
          }),
          
          Skeletons.Note({
            className : `${fig}__note logo-slogan`,
            // content   : _content
          })
        ]
      })
    ]
  })

    

  let a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    debug     : __filename,  
    kids      : [
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__background`,
        sys_pn    : 'ref-background'
      }),

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__modal wrapper`,
        name      : 'modal'
      }),
      logo,

      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__container`,
        kids      : [
          require("./form-layout").default(_ui_)
        ]
      })
    ]
  });

  return a;
}

export default __skl_widget_setup