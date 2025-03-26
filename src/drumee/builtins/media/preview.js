
/**
 * 
 * @param {*} view 
 * @returns 
 */
const _image = function (view) {
  const { fullUrl, filetype } = view.actualNode(_a.vignette);
  return html = `
    <div class="content-preview full ${filetype}" fullUrl style="background: url(${fullUrl}) no-repeat 50% 50%; background-size: cover;"></div>`;
};


/**
 * 
 * @param {*} view 
 * @param {*} chartId 
 * @returns 
 */
const _icon = function (view, chartId) {
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
  const html = `
    <svg class="full icon ${m.get(_a.filetype)} ${m.get(_a.area)}"> 
      <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-${chartId}"></use>
    </svg> 
    <div id="${view._id}-filename" class="filename">${m.get(_a.filename)}</div>`;
  return html;
};


class __image_preview extends LetcBlank {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize();
    return this.model.atLeast({
      format: _a.vignette
    });
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.declareHandlers(); //s()
    this.$el.attr(_a.title, this.model.get(_a.filename));
    this.$el.append(this._icon());
    this.$el.addClass(this.model.get(_a.filetype));
    return this.$el.addClass(this.model.get(_a.area));
  }

  /**
   * 
   * @returns 
   */
  _icon() {
    let chartId;
    switch (this.model.get(_a.filetype)) {
      case _a.document: case _a.image:
        chartId = 'file-doc';
        var c = this.model.get(_a.capability);
        if ((c != null) && c.match(/^r.+/)) {
          return _image(this);
        }
        break;
      case _a.video:
        return _image(this);
        break;
      case _a.audio:
        chartId = 'new_musical-not';
        break;
      default:
        chartId = 'file-doc';
    }
    return _icon(this, chartId);
  }
}

module.exports = __image_preview;    
