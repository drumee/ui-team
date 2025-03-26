// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz (_ui_, opt) {

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    debug     : __filename,  
    kids      : [
      // Skeletons.Box.Y({
      //   className : `${_ui_.fig.family}__background`,
      //   sys_pn    : 'ref-background'
      // }),

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__modal wrapper`,
        name      : 'modal'
      }),

      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__container`,
        kids      : [opt]
      })
    ]
  });

  return a;

};

export default __skl_dmz;
