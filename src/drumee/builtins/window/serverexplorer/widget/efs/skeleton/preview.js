// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/minifyer/skeleton/preview.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {Letc} _ui_
 * @param {String} ext
 * @param {Letc} m 
 * @returns
 */
function __skl_media_efs_preview (_ui_, ext, m) {

  let chartId = 'desktop_docfile';
  switch (ext) {
    case _a.document:
      chartId = "desktop_docfile";
      break;
    case _a.folder:
      chartId = _a.folder;
      break;
    default:
      chartId = "desktop_docfile";
  }

  // _ui_.debug('_media_preview 16', ext, chartId, m);

  const a = Skeletons.Button.Svg({
    ico       : chartId,
    className : `full preview-icon ${ext}`,
  })

  return a;

  // let html = `\
  //   <svg id=\"efs-preview\" class=\"full icon ${ext}\"> \
  //     ${Template.Xmlns(chartId)} \
  //   </svg>\
  // `;

  // return html;
}

export default __skl_media_efs_preview;



// # when _a.image
// #       chartId = "desktop_picture"
// # when _a.video
// #   switch m.mimetype
// #     when _a.audio
// #       chartId = "desktop_musicfile"
// #     else
// #       chartId = "desktop_videofile"      
// # when "music", "audio"
// #   chartId = "desktop_musicfile"