// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const _file_icon = require('./map');


//-------------------------------------
// 
//-------------------------------------
const __icon_name=function(m){
  let chartId, ext;
  switch (m.filetype) {
    case _a.image:
      chartId = "desktop_picture";
      break;
    case _a.folder: 
      chartId = _a.folder; 
      break;
    case _a.video:
      switch (m.mimetype) {
        case _a.audio:
          chartId = "desktop_musicfile";
          break;
        default:
          chartId = "desktop_videofile";      
      }
      break;
    case _a.stream: 
      chartId = 'drumee-phone-cam';//'desktop_confcalls'
      break;
    case "music": case "audio":
      chartId = "desktop_musicfile";
      break;
    case _a.document: case _a.stylesheet: case _a.script: case _a.web: case _a.schedule: case _a.settings:
      try { 
        chartId = _file_icon(m.ext.toLocaleLowerCase());
      } catch (e) {
        chartId = "documents_different"; //"desktop_docfile"
        ({
          ext
        } = m);
      }
      break;
    case _a.hub:
      switch (m.area) {
        case _a.public:
          chartId = "desktop_public";
          break;
        case _a.share:
          chartId = "drumee-invitations";
          break;
        default: 
          chartId = "two-users";
      }
      break;
    case _a.error:
        chartId = "header_question";
        m.imgCapable = false;
      break;
    default: 
      chartId = "desktop_docfile";
      ({
        ext
      } = m);
  }
  return {chartId, ext};
};

module.exports = __icon_name;    

