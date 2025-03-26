class comment_panel extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._play = this._play.bind(this);
    this._showWriter = this._showWriter.bind(this);
    this._showCaption = this._showCaption.bind(this);
    this._showComments = this._showComments.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.templateName = "#media-comment";
    this.prototype.className  = `${_C.flowV} xia-comment`;
    this.prototype.regions = {
      spinnerRegion   : '#region-spinner',
      captionRegion   : '#region-caption',
      shareRegion     : '#region-share',
      writerRegion    : '#region-writer',
      threadRegion    : '#region-thread'
    };
    behaviorSet({
      socket:1});
  }
    //bhv__dispatchRest : _K.char.empty
// =================== *
//
// =================== *

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    if (!this.model) {
      this.model = new Backbone.Model();
    }
    this.model.set({
      oid: 0,
      nid: 0,
      caption: LOCALE.COMMENTS_IDLE
    });
    return RADIO_BROADCAST.on(_e.media.show, this._play);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    return RADIO_BROADCAST.off(_e.media.show, this._play);
  }
// ================== *
// _click
// ================== *

// ===========================================================
// _click
//
// @param [Object] e
//
// ===========================================================
  _click(e) {
    return e.stopPropagation();
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    _dbg("<<ggCOMMENT onDomRefresh", this.model);
    return this.$el.toggleClass('center-in-column');
  }
//============================
//
//===========================

// ===========================================================
// _play
//
// @param [Object] model
//
// ===========================================================
  _play(model) {
    this.$el.toggleClass('center-in-column');
    _dbg("<<ggCOMMENT _play", this.model, model);
    this._showWriter(model);
    this._showCaption(model);
    return this._showComments(model);
  }
// ========================
//
// ========================

// ===========================================================
// _showWriter
//
// @param [Object] model
//
// ===========================================================
  _showWriter(model){
    this.writerRegion.$el.removeClass('list-header');
    this.writerRegion.$el.addClass('border-light');
    const opt = dui.request(_REQ.media.form.inline, model, _a.comment);
    opt.className = `${_C.bg.white} ${_C.full_width} ${_C.box_shadow} ${_C.padding.px20}`;
    const form = new FormPrompt(opt);
    form.addListener(this);
    return this.writerRegion.show(form);
  }
// ========================
//
// ========================

// ===========================================================
// _showCaption
//
// @param [Object] model
//
// ===========================================================
  _showCaption(model){
    _dbg("<<ggCOMMENT _showCaption", model);
    const caption = new dui.Media.Caption.View({
      model});
    return this.captionRegion.show(caption);
  }
// ========================
//
// ========================

// ===========================================================
// _showComments
//
// @param [Object] model
//
// ===========================================================
  _showComments(model){
    const oid = model.get(_a.ownerId);
    const nid = model.get(_a.nodeId);
    const method = _RPC.comment.list;
    const opt = dui.request(_REQ.media.comment.options, oid, nid, method);
    this.comment = new Letc.AutoList(opt);
    this.comment.addListener(this);
    return this.threadRegion.show(this.comment);
  }
//  # ============================
//  #
//  # ===========================

// ===========================================================
// #    onFormSucceeded
//
// @param [Object] data
//
// ===========================================================
//    onFormSucceeded:(data)=>
//      _dbg "<<ggCOMMENT onFormSucceeded", data
//      model = new Backbone.Model data
//      model.set _a.area, Host.get(_a.area)
//      @comment.feed model
// ============================================
//
// ============================================

// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
  __dispatchRest(method, data) {
    const model = new Backbone.Model(data);
    model.set(_a.area, Host.get(_a.area));
    return this.comment.feed(model);
  }
}
comment_panel.initClass();
module.exports = comment_panel;
