class __composite_pulldown extends WPP.Composite.Box {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onBeforeAddChild = this.onBeforeAddChild.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this._toggle = this._toggle.bind(this);
    this._reset = this._reset.bind(this);
    this._pulldown = this._pulldown.bind(this);
    this._stretch = this._stretch.bind(this);
    this._getAnim = this._getAnim.bind(this);
    this._open = this._open.bind(this);
    this._close = this._close.bind(this);
    this._afterClose = this._afterClose.bind(this);
    this._afterOpen = this._afterOpen.bind(this);
    this.getData = this.getData.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "widget pulldown"
  // 
  //   behaviorSet
  //     bhv_renderer : _K.char.empty
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = "widget pulldown";
    behaviorSet({
      bhv_renderer : _K.char.empty});
  }
//    bhv_greensock  : _K.char.empty
//    bhv_button     : _K.char.empty
// ============================
//
// ===========================

// ===========================================================
// onAfterInitialize
//
// @param [Object] opt
//
// ===========================================================
  onAfterInitialize(opt) {
    //Type.setMapName(_a.reader)
    this.model.atLeast({
      state   : 0,
      justify : _a.center,
      picto   : _K.char.empty,
      menuClass : _K.char.empty,
      listClass : _K.char.empty,
      listFlow  : _a.vertical,
      slide     : _a.vertical,
      flow      : _a.vertical,
      openStyle : 'pulldown',
      slide     : _a.vertical
    });
    this.declareHandlers(); //s {ui:@, part:@}
    return RADIO_BROADCAST.on(_e.document.click, this._reset);
  }
// ========================
// DdDtsry
// ========================

// ===========================================================
// onBeforeDestroy
//
// ===========================================================
  onBeforeDestroy() {
    return RADIO_BROADCAST.off(_e.document.click, this._reset);
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeAddChild
//
// @param [Object] child
//
// ===========================================================
  onBeforeAddChild(child) {
    return child.initHandlers(this._handler);
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //anchor = @get(_a.anchor)
    //@debug ">>EEZZ12 onDomRefresh", @get(_a.kids)
    // set default skeleton
    if ((this.get(_a.kids) == null)) {
      return this.collection.set(require("skeleton/pulldown/menu")(this));
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// @return [Object] 
//
// ===========================================================
  onPartReady(child, pn, section) {
    //@debug ">2>EEZZ12 onPartReady", child, pn, section
    //if section isnt _a.sys
    //  return
    this[`$${pn}$`] = child;
    switch (pn) {
      case _a.list:
        // backup height
        return child.on(_e.show, ()=> {
          this.debug("_e.show", child);
          //child.model.set _a.height, child.$el.height()
          this.model.set(_a.height, child.$el.height());
          this.model.set(_a.width, child.$el.width());
          this.model.set(_a.padding._, parseInt(child.$el.css(_a.padding._)));
          if (this.model.get(_a.state)) {
            return child.$el.attr(_a.data.state, _a.open);
          } else {
            child.$el.attr(_a.data.state, _a.closed);
            return child.$el.outerHeight(0);
          }
        });
      default:
        return child.onChildBubble = this.onChildBubble;
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildBubble
//
// ===========================================================
  onChildBubble() {
    return this._toggle();
  }
// ========================
//
// ========================

// ===========================================================
// _toggle
//
// @return [Object] 
//
// ===========================================================
  _toggle(){
    if ((this.$list$ == null)) {
      _c.error("Bad skeleton : *list* require");
      return;
    }
    //@debug "_toggle", @get(_a.state), @
    if (this.model.get(_a.state)) {
      this._close();
      return;
    }
    return this._open();
  }
// ========================
//
// ========================

// ===========================================================
// _reset
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _reset(src){
    try {
      if (src._handler.ui.cid === this.cid) {
        //@debug "_reset nop", src, @
        // nop : already open by child bubble
        return;
      }
      if (src.cid === this.cid) {
        //@debug "_reset _toggle", src, @
        this._toggle();
        return;
      }
    } catch (error) {}
    //@debug "_reset _close", src, @
    return this._close();
  }
// ========================
//
// ========================

// ===========================================================
// _pulldown
//
// @return [Object] 
//
// ===========================================================
  _pulldown(){
    let anim, ph, width;
    if (this.get(_a.slide) === _a.vertical) {
      ph = this.$label$.$el.outerHeight();
      width = this.$label$.$el.width() - parseInt(this.$list$.$el.css(_a.margin.left));
      this.debug(">>A _pulldown", this.$label$.$el.innerWidth(), this.$list$.$el.width(), this.$el.width());
      anim = {
        start: {
          y    : 0,
          //ease : Back.easeOut
          alpha: 0,
          height : _a.auto,
          width  : this.$label$.$el.width(), //@$list$.$el.width()
          position : _a.absolute
        },
        to   : {
          y    : ph,
          //ease : Back.easeOut
          alpha: 1
        }
      };
    } else {
      width = this.get(_a.width); //@$list$.$el.width()
      ph = this.$el.width();
      anim = {
        start: {
          x    : -width,
          ease : Back.easeOut,
          alpha: 1
        },
        to   : {
          x    : 0,
          ease : Back.easeOut,
          alpha: 0
        }
      };
    }
    this.debug("_pulldown", anim);
    return anim;
  }
// ========================
//
// ========================

// ===========================================================
// _stretch
//
// @return [Object] 
//
// ===========================================================
  _stretch(){
    let anim, height;
    if (this.get(_a.slide) === _a.vertical) {
      height = this.get(_a.height);
      this.debug(">>A _stretch", this, this.get(_a.flow), this.$label$.$el.innerWidth(), this.$list$.$el.width(), this.$el.width());
      const ph = this.$label$.$el.outerHeight();
      anim = {
        start: {
          ease : Back.easeOut,
          alpha: 0,
          height : 0,
          width  : this.$list$.get(_a.width)
        },
        to   : {
          height, //@$list$.get(_a.height)
          ease : Back.easeOut,
          alpha: 1,
          onComplete: this._afterOpen
        }
      };
    } else {
      const width = this.get(_a.width); // @$list$.$el.width()
      anim = {
        start: {
          height, // @$list$.get(_a.height)
          ease : Back.easeOut,
          alpha: 1
        },
        to   : {
          height    : 0,
          ease : Back.easeOut,
          alpha: 0
        }
      };
    }
    this.debug("_pulldown", anim);
    return anim;
  }
// ========================
//
// ========================

// ===========================================================
// _getAnim
//
// @return [Object] 
//
// ===========================================================
  _getAnim(){
    if ((this.parent != null ? this.parent.get(_a.flow) : undefined) === _a.vertical) {
      return this._stretch();
    }
    return this._pulldown();
  }
// ========================
//
// ========================

// ===========================================================
// _open
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _open(src){
    if (this._adding) {
      return;
    }
    if (this.model.get(_a.state)) {
      return;
    }
    this.debug("_open", this.cid);
    this.model.set(_a.state, 1);
    this.$list$.$el.attr(_a.data.state, _a.open);
    const anim = this._getAnim();
    TweenMax.set(this.$list$.$el, anim.start);
    if (this._tl != null) {
      return this._tl.play();
    } else {
      this._tl = new TimelineMax({
        onComplete: this._afterOpen,
        onReverseComplete : this._afterClose
      });
      return this._tl.to(this.$list$.$el, 0.6, anim.to);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _close
//
// @return [Object] 
//
// ===========================================================
  _close(){
    if (!this.model.get(_a.state)) {
      return;
    }
    if (this._tl != null) {
      this._tl.reverse();
      return this.model.set(_a.state, 0);
    } else {
      const anim = this._getAnim();
      this._tl = new TimelineMax({
        onComplete: this._afterOpen,
        onReverseComplete : this._afterClose
      });
      return this._tl.to(this.$list$.$el, 0.6, anim.start);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _afterClose
//
// @param [Object] src
//
// ===========================================================
  _afterClose(src){
    return this.$list$.$el.attr(_a.data.state, _a.closed);
  }
// ========================
//
// ========================

// ===========================================================
// _afterOpen
//
// @param [Object] src
//
// ===========================================================
  _afterOpen(src){
    return this.$list$.$el.css(_a.height, _a.auto);
  }
// ============================================
//
// ============================================

// ===========================================================
// feed
//
// @param [Object] items
//
// ===========================================================
  feed(items) {
    return this.$list$.collection.add(items);
  }
// ========================
//
// ========================

// ===========================================================
// getData
//
// @return [Object] 
//
// ===========================================================
  getData(){
    return this._export;
  }
// ============================================
//
// ============================================

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
// ============================================
//
// ============================================

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
    //_dbg ">>MM _a.nested onChildFound", child, args, @
    return this.$list$.collection.set(args);
  }
}
__composite_pulldown.initClass();
module.exports = __composite_pulldown;
