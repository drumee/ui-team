const _file_icon = require('./map');


const __icon_name = function (m) {
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
    case "music":
    case "audio":
      chartId = "desktop_musicfile";
      break;
    case _a.note:
    case "drumee.note":
      chartId = "raw-ab_notes";
      m.imgCapable = false;
      break;
    case _a.web:
      if (m.dataType == "drumee.note") {
        m.imgCapable = false;
        return { chartId: "raw-ab_notes", ext };
      }
    case _a.document:
    case _a.stylesheet:
    case _a.script:
    case _a.schedule:
    case _a.settings:
      let extension = m.ext.toLocaleLowerCase();
      try {
        chartId = _file_icon(extension);
        if (m.ext === 'txt') {
          ({ ext } = m);
        }
      } catch (e) {
        chartId = "documents_different"; //"desktop_docfile"
        ({ ext } = m);
      }
      if (chartId == extension) {
        ext = extension;
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
    case 'markdown':
      chartId = "raw-markdown";
      m.imgCapable = false;
      break;
    case 'app-data':
      if (/^diagram/.test(m.dataType)) {
        chartId = "diagram";
      } else {
        chartId = "raw-json";
      }
      break;
    default:
      chartId = "desktop_docfile";
      if (/json/.test(m.mimetype)) {
        ext = null;
      } else {
        ({ ext } = m);
      }
  }
  return { chartId, ext };
};

module.exports = __icon_name;

