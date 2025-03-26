const {
  TweenMax
} = require("gsap/all");
class __bhv_menu extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._onOpen = this._onOpen.bind(this);
    this.onGoodbye = this.onGoodbye.bind(this);
    this.onReallyClose = this.onReallyClose.bind(this);
    this._close = this._close.bind(this);
    this._onClose = this._onClose.bind(this);
    this._reallyClose = this._reallyClose.bind(this);
    this._reset = this._reset.bind(this);
  }

  initialize(opt) {
    require('gsapp/TweenMax');
    RADIO_BROADCAST.on(_e.item.click, this._reset);
    RADIO_BROADCAST.on(_e.document.click, this._close, true);
    return RADIO_BROADCAST.on(_e.ui.click, this._close);
  }

    onBeforeDestroy() {
    //_dbg "<<FFFFFFonBeforeDestroy"
    RADIO_BROADCAST.off(_e.item.click, this._reset);
    RADIO_BROADCAST.off(_e.document.click, this._close);
    return RADIO_BROADCAST.off(_e.ui.click, this._close);
  }


// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    return RADIO_BROADCAST.trigger(_e.contextmenu);  // Clear open menu, if any
  }

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh() {
    if (this.view.get(_a.anim) === _a.disable) {
      this._onOpen();
      return;
    }
    const tl = new TimelineMax({
      onStart: this._onOpen});
    //tl.fromTo(@$el, 0.7, {x:-20, alpha:0}, {x:0, alpha:1, ease:Back.easeInOut})
    return tl.fromTo(this.$el, 0.7, {scale:.9, alpha:0}, {scale:1, alpha:1, ease:Back.easeInOut});
  }

// ===========================================================
// _onOpen
//
// @return [Object] 
//
// ===========================================================
  _onOpen(){
    const align = this.view.getOption(_a.align);
    if (align != null) {
      this.$el.parent().attr(_a.data.align, align);
    }
    const anchor = this.view.getOption(_a.anchor);
    if (anchor != null) {
      this.$el.parent().attr(_a.data.anchor, anchor);
    }
    const pos = this.view.get(_a.showIn);
    if ((pos == null)) {
      return;
    }
    _dbg(">>Position", pos);
    switch (pos) {
      case _a.context:
        return this.view.showInViewPort();
      default:
        if (this.view.get(_a.position)) {
          return this.$el.css(this.view.get(_a.position));
        }
    }
  }
// ========================
//
// ========================

// ===========================================================
// onGoodbye
//
// ===========================================================
  onGoodbye() {
      return this._close();
    }
// ========================
//
// ========================

// ===========================================================
// onReallyClose
//
// ===========================================================
  onReallyClose() {
      return this._reallyClose();
    }
// ========================
//
// ========================

// ===========================================================
// _close
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _close(src){
    //_dbg ">>>DDDDD _close",  @view, src
    if (!_.isFunction(this.view.isPersistent)) {
      this.warn(">>>DDDDD view should not use submenu behavior", this.view.options, this.view);
      return;
    }
    switch (this.view.isPersistent()) {
      case _a.always:
        return;
      case _a.none:
        return this._reallyClose();
      case _a.context:
        if ((src != null) && ((src === document) || (src[0] === document))) {
          return this._reallyClose();
        }
        break;
      case _a.self:
        if ((src != null) && ((this.view.cid === src.cid) || (this.view.cid === (src.parent != null ? src.parent.cid : undefined)))) {
          return;
        }
        //if not src? or (src is document) or (src[0] is document)
        return this._reallyClose();
    }
  }
// ============================
//
// ============================

// ===========================================================
// _onClose
//
// ===========================================================
  _onClose(){
    this.destroy();
    return this.view.destroy();
  }
// ========================
//
// ========================

// ===========================================================
// _reallyClose
//
// ===========================================================
  _reallyClose(){
    const tl = new TimelineMax({
      onComplete: this._onClose});
    return tl.fromTo(this.$el, 0.3, {alpha:1,scale:1}, {alpha:0, scale:0.8});
  }

// ===========================================================
// _reset
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _reset(src) {
    //_dbg ">>>DDDDD _reset", src
    if ((src == null)) {
      this.warn("No source given");
      return;
    }
    if (src.cid === this.view.cid) {
      return;
    }
    return this._close(src);
  }
}
module.exports = __bhv_menu;
