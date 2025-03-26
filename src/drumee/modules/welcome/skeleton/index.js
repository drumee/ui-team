// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/modules/welcome/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_welcome (_ui_, opt) {

  const a = Skeletons.Box.Y({
    debug : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids        : [
      // Skeletons.Box.Y({
      //   className : `${_ui_.fig.family}__background`,
      //   sys_pn : 'ref-background'
      // }),

      require('./topbar').default(_ui_),

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__modal wrapper`,
        name      : 'modal',
      }),

      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__container`,
        kids : [opt]
      })
    ]
  });

  return a;
};

export default __skl_welcome;
