
//
//-------------------------------------
// 
//-------------------------------------
const _image=function(view){
  let html;
  const m = view.model;
  return html = `\
<div class=\"content-preview full ${m.get(_a.filetype)}\" \
style=\"background: url(${view._url()}) no-repeat 50% 50%; background-size: cover;\"> \
</div>\
`;
};


//-------------------------------------
// 
//-------------------------------------
const _icon=function(view, chartId){
  const m = view.model;
  switch (m.get(_a.filetype)) {
    case _a.image:
      chartId = "editbox_picture";
      break;
    case _a.folder: 
      chartId = _a.folder; 
      break;
    case _a.video:
      chartId = "editbox_video";
      break;
    case _a.document:
      chartId = "editbox_doc";
      break;
    case _a.hub:
      chartId = "editbox_webpage";
      break;
  }
  const html = `\
<svg class=\"full icon ${m.get(_a.filetype)} ${m.get(_a.area)}\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-${chartId}\"></use> \
</svg> \
<div id=\"${view._id}-filename\" class=\"filename\">${m.get(_a.filename)}</div>\
`;
  return html;
};

const HOST_ID = 'host_id';

//-------------------------------------
// __image_preview
//-------------------------------------

class __image_preview extends LetcBlank {

  static initClass() {
    this.prototype.className  = "image-preview";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    return this.model.atLeast({
      format  : _a.vignette});
  }


// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    switch (this.mget(_a.type)) {
      case 'replace': 
        return this.el.innerHTML = require('./template/forbiden');
      default:
        return this.el.innerHTML = require('./template/forbiden');
    }
  }
}
__image_preview.initClass();
      


module.exports = __image_preview;    
