// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/skeleton/content.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_dmz_content = function(_ui_, data) {
  const username = data[0].sender;
  const msg = `Your friend <span class=\"dmz__label--bold\">${username}</span> shared a document`;
  const a = Skeletons.Box.Y({
    debug     : __filename, 
    styleOpt  : { 
      width   : _K.size.half
    },
    className : "u-ai-center px-20 dmz__with-sep",
    kids      : [
      Skeletons.Box.X({
        className   : "mb-33",
        kidsOpt     : { 
          className : "dmz__label"
        },          
        kids: [
          Skeletons.Note(msg + " shared a document with you. Click to download it!")
        ]
      }),

      Skeletons.Box.Y({
        className   : "mb-33",
        sys_pn      : "browser-wraper",
        kids        : [require('./grid')(_ui_, data)]
      }),

      Skeletons.Note({
        content    : LOCALE.DOWNLOAD,
        service    : _e.download,
        className  : "dmz__btn dmz__btn--primary"
      })
    ]
  });

  return a;
};
module.exports = __skl_dmz_content;
