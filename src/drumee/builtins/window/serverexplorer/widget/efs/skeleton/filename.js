// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs/skeleton/filename.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_media_efs_filename (_ui_, ext, m) {
  const filename = m.file;
  
  const a = Skeletons.Note({
    id        : `${m.widgetId}-filename`,
    className : `filename ${ext}`,
    content   : filename
  })

  if (filename && filename.length > 20) {
    a.tooltips = {
      className : `filename-tooltips ${ext}`,
      content   : filename
    }
  }

  return a;
}

export default __skl_media_efs_filename;
