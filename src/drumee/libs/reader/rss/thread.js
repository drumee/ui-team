const rss_item = require('./item');
class __rss_thread extends Marionette.CollectionView {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.childViewOptions = this.childViewOptions.bind(this);
    this.buildChildView = this.buildChildView.bind(this);
    this.emptyViewOptions = this.emptyViewOptions.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className: _a.widget
  //   childView : rss_item
  //   emptyView : LetcBlank
  //   childViewEventPrefix: _a.rss
  // 
  //   behaviorSet
  //     bhv_renderer:_K.dummyArgs
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = _a.widget;
    this.prototype.childView  = rss_item;
    this.prototype.emptyView  = LetcBlank;
    this.prototype.childViewEventPrefix = _a.rss;
    behaviorSet({
      bhv_renderer:_K.dummyArgs});
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
    this._flow = _a.widget;
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    this.collection = new Backbone.Collection();
    _dbg("initialize RSSITEMreplace", this.model, opt);
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:no}
  }
// ========================
//
// ========================

// ===========================================================
// onRender
//
// ===========================================================
  onRender() {
//      usrAttr = @model.get(_a.userAttributes)
//      if usrAttr?
//        dir = usrAttr[_a.data.direction]
//      dir = dir || @model.get(_a.direction) || _a.vertical
//      @$el.attr _a.data.direction, dir
//      _dbg "KKJJHHGH", dir, @model
    let url = this.model.get(_a.url);
    if (url != null) {
      if (!url.match(_USING.regexp.httpx)) {
        url = `http://${url}`;
      }
      this.socket = new WPP.Pipe({
        method : _RPC.req.rss,
        url
      });
      this.socket.addListener(this);
      return this.socket.read();
    }
  }
// ========================
// onPipeSucceeded
// ========================

// ===========================================================
// onPipeSucceeded
//
// @param [Object] json
//
// @return [Object] 
//
// ===========================================================
  onPipeSucceeded(json) {
    if ((json.data.error != null) || (json.data.errors != null)) {
      const msg = json.data.error || json.data.errors[0].message || LOCALE.INTERNAL_ERROR;
      RADIO_BROADCAST.trigger(_e.error, msg);
      return;
    }
    if ((json.data.channel != null ? json.data.channel.item : undefined) != null) {
      return this.collection.set(json.data.channel.item);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// childViewOptions
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
  childViewOptions(model) {
    return {model};
  }
// ======================================================
//
// ======================================================

// ===========================================================
// buildChildView
//
// @param [Object] model
// @param [Object] view
// @param [Object] options
//
// @return [Object] 
//
// ===========================================================
  buildChildView(model, view, options) {
    return new view(options);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// emptyViewOptions
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
  emptyViewOptions(model) {
    model.set(_a.tooltips, this.model.get(_a.tooltips));
    _dbg("emptyViewOptions", model, this.model, this.model.get(_a.tooltips));
    return {model};
  }
}
__rss_thread.initClass();
module.exports = __rss_thread;
