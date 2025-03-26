class __media_base extends Marionette.View {
  constructor(...args) {
    super(...args);
    this._respawn = this._respawn.bind(this);
  }

  static initClass() {
    this.prototype.templateName = "#--media-tile"; // _T.media.vignette
    this.prototype.tagName =_K.tag.li;
    this.prototype.model =Backbone.Model;
    this.prototype.events =
      {'click' : '_click'};
    this.prototype.regions =
      {iconRegion     : '#--region-icon'};
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
    this._setup();
    const filetype = this.model.get(_a.filetype);
    const ext = this.model.get(_a.ext);
    switch (filetype) {
      case _a.document: case _a.other:
        if (ext === _a.pdf) {
          this.model.set(_a.extra, _p.pdf);
        }
        break;
      case _a.video:
        this.model.set(_a.extra, _p.film);
        break;
    }
    const description = this.model.get(_a.caption) || this.model.get(_a.filename);
    return this.model.set(_a.description, description);
  }
// ============================
//
// ============================

// ===========================================================
// _click
//
// @param [Object] e
//
// ===========================================================
  _click(e){
    if (this.model.get(_a.filetype) !== _a.folder) {
      return e.preventDefault();
    }
  }
// ========================
//
// ========================

// ===========================================================
// _setup
//
// ===========================================================
  _setup() {
    this.model.set(_a.url, require('options/url/file')(this.model));
    const ctime = this.model.get(_a.createTime);
    const m = Dayjs.unix(ctime);
    this.model.set(_a.age, m.fromNow());
    return this.model.set(_a.date , m.format(_K.defaults.date_format));
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// @param [Object] opt
//
// ===========================================================
  onDomRefresh(opt) {
    //@debug "CCDD onDomRefresh", @iconRegion
    this.icon = new WPP.Media.Icon({
      model:this.model,
      tagName : this._icontagName || _K.tag.a
    });
    this.iconRegion.show(this.icon);
    return this.triggerMethod(_e.ready);
  }
// ============================================
//
// ============================================

// ===========================================================
// _respawn
//
// @param [Object] data
//
// ===========================================================
  _respawn(data) {
    this.model.clear();
    this.model.set(data);
    this._setup();
    this.icon = new WPP.Media.Icon({
      model:new Backbone.Model(data),
      tagName : this._icontagName || _K.tag.a
    });
    //@debug "CCDD _respawn", @iconRegion, @
    return this.iconRegion.show(this.icon);
  }
}
__media_base.initClass();
module.exports = __media_base;
