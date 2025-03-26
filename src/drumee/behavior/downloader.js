class __bhv_downloader extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this._bubble = this._bubble.bind(this);
    this._download = this._download.bind(this);
  }

  static initClass() {
    this.prototype.events =
      {click   : '_bubble'};
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    if (this.view.get('download') != null) {
      return this.events.click = '_download';
    }
  }
// ========================
//
// ========================

// ===========================================================
// _bubble
//
// @param [Object] e
//
// ===========================================================
  _bubble(e) {
    return this.view._bubble(e);
  }
// ========================
//
// ========================

// ===========================================================
// _download
//
// @param [Object] e
//
// ===========================================================
  _download(e) {
    const link = document.createElement(_K.tag.a);
    link.style.display = _a.none;
    document.body.appendChild(link);
    link.setAttribute(_a.href, require('options/url/link')(this.view.model, _a.slide));
    link.setAttribute(_a.download, this.view.model.get(_a.filename));
    link.setAttribute(_a.id, this.view.model.get(_a.nodeId));
    link.click();
    return this.debug("downloadable", link);
  }
}
__bhv_downloader.initClass();
module.exports = __bhv_downloader;
