const bit_item = require('./item');
class __bit_list extends Marionette.CollectionView {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onChildReady = this.onChildReady.bind(this);
    this.onChildUpdate = this.onChildUpdate.bind(this);
    this._getValue = this._getValue.bind(this);
    this.toArgs = this.toArgs.bind(this);
    this._rsync = this._rsync.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.onPipeFailed = this.onPipeFailed.bind(this);
  }

  static initClass() {
  //   templateName: _T.list.label
  //   className : "bit-list" #_C.flow.v
  //   ui:
  //     list  : _K.tag.ul
  //     label : 'span.list-label'
  //   childView : bit_item
  //   emptyView : bit_item
  //   childViewContainer: _K.tag.ul
  //   childViewEventPrefix: _a.child
  // 
  //   behaviorSet
  //     bhv_renderer : _K.string.empty
  // 
    this.prototype.templateName = _T.list.label;
    this.prototype.className  = "bit-list"; //_C.flow.v
    this.prototype.ui = {
      list  : _K.tag.ul,
      label : 'span.list-label'
    };
    this.prototype.childView  = bit_item;
    this.prototype.emptyView  = bit_item;
    this.prototype.childViewContainer = _K.tag.ul;
    this.prototype.childViewEventPrefix = _a.child;
    behaviorSet({
      bhv_renderer : _K.string.empty});
  // =================== *
  // Proxied
  // =================== *
    this.prototype.childViewOptions  = PROXY_CORE.childViewOptions;
    this.prototype.emptyViewOptions  = PROXY_CORE.emptyViewOptions;
    this.prototype.buildChildView    = PROXY_CORE.buildChildView;
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
  initialize(opt){
    this.collection = new Backbone.Collection();
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    this.model.set(this.getOption(_a.modelArgs));
    return this.model.atLeast({
      flow       : _a.vertical,
      listClass  : this.get(_a.listClass),//__C.padding.px5
      innerClass : this.get(_a.innerClass) || _C.align.mid_right,
      bits       : this.get(_a.bits),
      name       : this.get(_a.name),
      label      : this.get(_a.label) || _K.char.empty
    });
  }
 // ========================
//
// ========================

// ===========================================================
// onRender
//
// ===========================================================
  onRender(){
    this.$el.addClass(_a.widget);
    this.ui.list.addClass(_a.widget);
    this.$el.attr(_a.data.flow, this.model.get(_a.flow));
    if (_.isEmpty(this.get(_a.label))) {
      return (this.ui.label != null ? this.ui.label.attr(_a.data.hide, _a.yes) : undefined);
    }
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    const bits =  this.get(_a.bits);
    if (_.isArray(bits)) {
      this.collection.cleanSet(bits);
    } else if (_.isEmpty(bits)) {
      const opt = require('skeleton/tick-box/list')(this.model);
      this.debug(">>>qqq  DQDQDSinitialize", this.model.get(_a.value), opt,this);
      this.collection.cleanSet(opt.bits);
    }
    this._childReady = _.after(this.collection.length, this.toArgs);
    return this._source = this.get(_a.source);
  }
// ========================
//
// ========================

// ===========================================================
// onChildReady
//
// ===========================================================
  onChildReady() {
    //_dbg "DQDQDS onChilReady _setup = value"
    return this._childReady();
  }
// ========================
//
// ========================

// ===========================================================
// onChildUpdate
//
// ===========================================================
  onChildUpdate(){
    _dbg("DQDQDS onChildUpdate", this);
    this.render();
    this.toArgs(true);
    //@fireEvent 'bit:list:update', @model
    this.fireEvent(_e.update, this.model);
    return (this._source != null ? this._source.triggerMethod(_e.model.update, this.model) : undefined);
  }
// ========================
//
// ========================

// ===========================================================
// _getValue
//
// @return [Object] 
//
// ===========================================================
  _getValue(){
    const bits = [];
    //_dbg "toArgs Bit.List = ", @collection
    this.children.each(child => {
      return bits.push(child.getState());
    });
    const value =  parseInt(bits.join(_K.string.empty),2);
    return value;
  }
// ========================
//
// ========================

// ===========================================================
// toArgs
//
// @param [Object] sync=no
//
// @return [Object] 
//
// ===========================================================
  toArgs(sync){
    if (sync == null) { sync = false; }
    const value = this._getValue();
    const name = this.model.get(_a.name);
    const args = {};
    args[name] = value;
    this.model.set(_a.value, value);
    this.model.set(name, value);
    if (sync) {
      this._rsync(args);
    }
    if (value != null) {
      this.ui.list.attr(_a.data.error,_K.string.zero);
    } else {
      this.ui.list.attr(_a.data.error,_K.string.one);
      return null;
    }
    return args;
  }
// ========================
//
// ========================

// ===========================================================
// _rsync
//
// @param [Object] args
//
// ===========================================================
  _rsync(args){
    const api = this.getOption(_a.api) || this.getOption(_a.pipe);
    if (api != null) {
      this.socket = new WPP.Pipe(api);
      this.socket.set(args);
      this.socket.addListener(this);
      return this.socket.post();
    }
  }
// ========================
//
// ========================

// ===========================================================
// onPipeSucceeded
//
// @param [Object] json
//
// ===========================================================
  onPipeSucceeded(json) {
    //_dbg "toArgs Bit.List = ", json
    return this.fireEvent(_e.model.update, json, this.socket);
  }
// ========================
//
// ========================

// ===========================================================
// onPipeFailed
//
// @param [Object] json
//
// ===========================================================
  onPipeFailed(json) {
     return RADIO_BROADCAST.trigger(_e.error, json.responseJSON);
   }
}
__bit_list.initClass();
module.exports = __bit_list;
