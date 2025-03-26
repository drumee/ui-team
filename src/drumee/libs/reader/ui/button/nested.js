class __btn_nested extends Marionette.CollectionView {
  constructor(...args) {
    this.mould = this.mould.bind(this);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this._buildAnim = this._buildAnim.bind(this);
    this._toggle = this._toggle.bind(this);
    this.onAlsoClick = this.onAlsoClick.bind(this);
    this.onAddChild = this.onAddChild.bind(this);
    this._reset = this._reset.bind(this);
    this._close = this._close.bind(this);
    this.getData = this.getData.bind(this);
    this.onChildDestroy = this.onChildDestroy.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onEndForward = this.onEndForward.bind(this);
    this.onEndBackward = this.onEndBackward.bind(this);
    this.onRadioToggle = this.onRadioToggle.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.templateName = _T.button.nested;
    this.prototype.className  = "widget button-nested";
    this.prototype.childViewContainer = _K.tag.ul;
    this.prototype.childView = LetcBlank;
    this.prototype.childViewEventPrefix = _a.child;
    this.prototype.ui = {
      wrapper : '.items-wrapper',
      list    : _K.tag.ul,
      search  : 'input',
      label   : '.label'
    };
  
    this.prototype.events   =
      {click : Backbone.View.prototype.triggerHandlers};
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    // Force to automatically create collection
    opt.kids = opt.kids || [];
    super.initialize(opt);

    this.model.atLeast({
      initial       : _a.closed,
      justify       : _a.left,
      picto         : _K.char.empty,
      wrapperClass  : _K.char.empty,
      innerClass    : _K.char.empty,
      listClass     : _K.char.empty,
      listFlow      : _a.vertical,
      opening       : _a.vertical,
      label         : "nested button",
      widgetId      : _.uniqueId('btn-nested-'),
      flow          : _a.y
    });
    const anim =  require('./slide-y')();
    anim.on_reverse = 'nop';
    this.model.set(_a.anim, anim);
    RADIO_BROADCAST.on(_e.item.click, this._reset);
    RADIO_BROADCAST.on(_e.document.click, this._reset);
    return RADIO_BROADCAST.on(_e.ui.click, this._reset);
  }

// ===========================================================
// mould
//
// ===========================================================
  mould(){
    this.debug("debug mould",this.get(_a.state));
    return this.render();
  }

// ===========================================================
// onBeforeDestroy
//
// ===========================================================
  onBeforeDestroy() {
    RADIO_BROADCAST.off(_e.item.click, this._reset);
    RADIO_BROADCAST.off(_e.document.click, this._reset);
    return RADIO_BROADCAST.off(_e.ui.click, this._reset);
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.debug("ZEZEZEZEZ 2222", this);
    this.declareHandlers(); //s({part:@, ui:@}, {recycle:yes})
    this._items = this.get(_a.items) || this.get(_a.kids) || [];
    if (this.model.get(_a.initial) === _a.open) {
      return this.ui.wrapper.attr(_a.data.state, _a.open);
    } else {
      return this.ui.wrapper.attr(_a.data.state, _a.closed);
    }
  }

// ===========================================================
// _buildAnim
//
// @return [Object]
//
// ===========================================================
  _buildAnim(){
    let anim, ph;
    if (this.get(_a.slide) === _a.vertical) {
      const height = this.ui.list.height();
      ph = this.$el.height();
      anim = {
        start: {
          y    : -height,
          ease : Back.easeOut,
          alpha: 0
        },
        to   : {
          y    : 0,
          ease : Back.easeOut,
          alpha: 1
        }
      };
    } else {
      const width = this.ui.list.width();
      ph = this.$el.width();
      anim = {
        start: {
          x    : -width,
          ease : Back.easeOut,
          alpha: 0
        },
        to   : {
          x,
          ease : Back.easeOut,
          alpha: 1
        }
      };
    }
    return anim;
  }

// ===========================================================
// _toggle
//
// @param [Object] origin
//
// ===========================================================
  _toggle(origin){
    this.debug(">>_toggle ZRZRZRZRRZZR", origin, this);
    if (this.collection.length) {
      this.collection.reset();
      //@triggerMethod "backward"
    } else {
      this.collection.cleanSet(this._items);
    }
      //@triggerMethod "forward"
    return this.trigger(_a.radio);
  }

// ===========================================================
//
// ===========================================================
  onAlsoClick(e){
    this.debug(">>onAlsoClick ZRZRZRZRRZZR", e, this);
    return this._toggle(this);
  }

// ===========================================================
// onAddChild
//
// @param [Object] child
//
// ===========================================================
  onAddChild(child) {
    this.ui.wrapper.attr(_a.data.state, _a.open);
    if (this._countDown != null) {
      return this._countDown();
    }
  }

// ===========================================================
// _reset
//
// @param [Object] src
//
// @return [Object]
//
// ===========================================================
  _reset(src){
    //_dbg "<<FFFFFF _reset  ", @, src
    if ((src != null) && (this.cid === src.cid)) {
      return;
    }
    //_dbg "<<FFFFFF _reset  ", @cid, src.cid
    return this._close();
  }

// ===========================================================
// _close
//
// ===========================================================
  _close(){
    return this.triggerMethod(_e.close);
  }

// ===========================================================
// getData
//
// @return [Object]
//
// ===========================================================
  getData(){
    return this._export;
  }

// ===========================================================
// onChildDestroy
//
// @param [Object] child
//
// ===========================================================
  onChildDestroy(child) {
    return this.ui.wrapper.attr(_a.data.state, _a.closed);
  }

// ===========================================================
// onChildBubble
//
// @param [Object] origin
//
// ===========================================================
  onChildBubble(origin){
    this.debug("AZAZTTTTTTRRR onChildBubble", origin, this);
    return this._toggle(origin);
  }

// ===========================================================
// onEndForward
//
// @param [Object] origin
//
// ===========================================================
  onEndForward(origin){
    return this.debug("debugonEndForward ", origin);
  }
    //@collection.cleanSet @_items

// ===========================================================
// onEndBackward
//
// @param [Object] origin
//
// ===========================================================
  onEndBackward(origin){
    return this.debug("debug onEndBackward", origin);
  }
    //@collection.reset()

// ===========================================================
// onRadioToggle
//
// @param [Object] state
//
// ===========================================================
  onRadioToggle(state){
    this.debug("onRadio", state, this);
    if (state === _a.off) {
      return this._close();
    }
  }

// ===========================================================
// onChildCallback
//
// @param [Object] child
// @param [Object] args
//
// ===========================================================
  onChildCallback(child, args) {
    if (_.isFunction(child.getData)) {
      this._export = child.getData();
    }
    return this.trigger(_e.callback);
  }
    //_dbg ">>MM _a.nested onChildCallback", child, args

// ===========================================================
// onChildFound
//
// @param [Object] child
// @param [Object] args
//
// ===========================================================
  onChildFound(child, args) {
    this._adding = true;
    _.extend(this.options.kidsOpt,
      {kind : child.get('targetType') || KIND.button.anchor});
    this.options.kidsMap  =
      {label : 'locale_en'};
    _dbg(">>MM _a.nested onChildFound", child, args, this);
    return this.collection.cleanSet(args);
  }
}
__btn_nested.initClass();

module.exports = __btn_nested;
