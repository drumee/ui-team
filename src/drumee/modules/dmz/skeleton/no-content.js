// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/skeleton/no-content.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_no_content (_ui_) {

  const msg = `We are sorry, it seems the link you are visiting has no (more?) content. Maybe they have been removed or expired.`;

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    debug     : __filename,
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__no-content`,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__note`,
            content   : msg
          })
        ]
      })
    ]
  });

  return a;

};

export default __skl_dmz_no_content;
