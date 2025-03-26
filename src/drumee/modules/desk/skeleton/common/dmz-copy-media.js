// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/skeleton/common/dmz-copy-media.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_desk_common_dmz_copy_media (_ui_, data) {

  const dmzFig = `${_ui_.fig.family}-dmz-copy-media`

  const a = Skeletons.Box.Y({
    className : `${dmzFig}__container`,
    debug     : __filename,
    kids      : [
      Skeletons.Note({
        className : `${dmzFig}__note content sub-1`,
        content   : 'Your Drumee Desktop has been created.'
      }),

      Skeletons.Note({
        className : `${dmzFig}__note content sub-2`,
        content   : 'Do you want to transfer all files of'
      }),

      Skeletons.Note({
        className : `${dmzFig}__note name blue-text `,
        content   : data.name
      }),

      Skeletons.Note({
        className : `${dmzFig}__note sender blue-text`,
        content   : data.sender
      }),
    ]
  });

  return a;

};

export default __skl_desk_common_dmz_copy_media;
