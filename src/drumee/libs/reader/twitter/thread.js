class __twit_thread extends Marionette.CollectionView {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.childViewOptions = this.childViewOptions.bind(this);
    this.buildChildView = this.buildChildView.bind(this);
    this.emptyViewOptions = this.emptyViewOptions.bind(this);
  }

  static initClass() { //TwitterFeed.
  //   templateName: _T.wrapper.raw
  //   className: "twitter-feed #{_a.widget}"
  //   childView : require('./item')
  //   emptyView : LetcBlank
  //   childViewEventPrefix: _a.twit
  //   childViewContainer: _K.tag.ul
  // 
  //   behaviorSet
  //     bhv_renderer      : _K.char.empty
  //     bhv_renderer : _K.char.empty
  //     bhv_renderer  : _K.char.empty
  //     bhv_spin    : _K.char.empty
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = `twitter-feed ${_a.widget}`;
    this.prototype.childView  = require('./item');
    this.prototype.emptyView  = LetcBlank;
    this.prototype.childViewEventPrefix = _a.twit;
    this.prototype.childViewContainer = _K.tag.ul;
    behaviorSet({
      bhv_renderer      : _K.char.empty,
      bhv_renderer : _K.char.empty,
      bhv_renderer  : _K.char.empty,
      bhv_spin    : _K.char.empty
    });
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
      this.model = new dui.Model.Twitter(opt);
    }
    this.collection = new Backbone.Collection();
    return _dbg("initialize TWITreplace", this.model, opt);
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
//      dir = dir || @model.get(_a.direction) || _a.hirzontal
//      @$el.attr _a.data.direction, dir
    let pipe;
    const screen_name = this.model.get(_a.screen_name);
    if (_.isEmpty(screen_name)) {
      pipe =
        {method : _RPC.req.twitter};
    } else {
      pipe = {
        method : _RPC.req.twitter,
        args   : screen_name.split(_USING.regexp.comma)
      };
    }
    this.socket = new WPP.Pipe(pipe);
    this.socket.addListener(this);
    return this.socket.read();
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
    const dir = this.model.get(_a.data.direction);
    if (dir != null) {
      this.$el.attr(_a.data.direction, dir);
    }
    _.map(json.data, function(el){
      if (dir != null) {
        el.userAttributes = {};
        el.userAttributes[_a.data.direction] = dir;
      }
      return el;
    });
    return this.collection.set(json.data);
  }
    //_dbg "onPipeSucceeded", @collection
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
// @param [Object] childModel
// @param [Object] ChildViewClass
// @param [Object] childViewOptions
//
// @return [Object] 
//
// ===========================================================
  buildChildView(childModel, ChildViewClass, childViewOptions) {
    return new ChildViewClass(childViewOptions);
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
__twit_thread.initClass();
module.exports = __twit_thread;
