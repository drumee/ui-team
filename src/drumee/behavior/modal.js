const {
  TweenMax
} = require("gsap/all");
// ============================
const $doc = $(document);
$doc.bind(_e.click, function(e) {
  e.stopPropagation();
  return RADIO_BROADCAST.trigger(_e.document.click, $doc, e);
});
// ============================
const _startOpt = {
  visibility : _a.visible,
  scale      : 1,
  rotationX  : 0,
  rotationY  : 0,
  skewX      : 0,
  skewY      : 0
};
//  position   : _a.absolute
//########################################
// CLASS : Behavior.modal
// Common behaviors for modal windows
//########################################
class __bhv_modal extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this._close = this._close.bind(this);
    this._onClose = this._onClose.bind(this);
    this._reallyClose = this._reallyClose.bind(this);
    this.onForceClose = this.onForceClose.bind(this);
    this._onStart = this._onStart.bind(this);
    this._childReady = this._childReady.bind(this);
    this._start = this._start.bind(this);
    this._onComplete = this._onComplete.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onChildClose = this.onChildClose.bind(this);
    this.onButtonOk = this.onButtonOk.bind(this);
    this.onButtonYes = this.onButtonYes.bind(this);
    this.onButtonNo = this.onButtonNo.bind(this);
    this.onChildCancel = this.onChildCancel.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.onPipeFailed = this.onPipeFailed.bind(this);
    this.onPipeAborted = this.onPipeAborted.bind(this);
  }

  static initClass() {
  //   events:
  //     "click @ui.close" : "_close"
  //     "click @ui.cancel": "_close"
  // 
    this.prototype.events = {
      "click @ui.close" : "_close",
      "click @ui.cancel": "_close"
    };
  // ============================
  //
  // ============================
    this.prototype._exec = PROXY_CORE.exec;
  }
// ============================
//
// ============================

// ===========================================================
// initialize
//
// ===========================================================
  initialize(){
    this.debug("<<KK modal  initialize");
    return RADIO_BROADCAST.on(_e.document.click, this._close);
  }
// ========================
//
// ========================

// ===========================================================
// onBeforeDestroy
//
// ===========================================================
  onBeforeDestroy() {
    return RADIO_BROADCAST.off(_e.document.click, this._close);
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
  _close(src) {
    let p;
    this.debug(`>>>DDDDD _close pesistence =${p}`, src, this.view);
    if (_.isFunction(this.view.isPersistent)) {
      p = this.view.isPersistent();
    } else {
      this.warn(">>>DDDDD view should no use submenu behavior", this.view.options, this.view);
      p = _a.none;
    }
    if (p === _a.always) {
      return;
    }
    if (p === _a.none) {
      this._reallyClose();
      return;
    }
    if (p === _a.self) {
      if ((src != null) && (this.view.cid === src.cid)) {
        return;
      }
      if ((src == null) || (src === document) || (src[0] === document)) {
        return this._reallyClose();
      }
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
    this.debug("<<KK modal _onClose", this.view);
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
    //@debug "<<KK modal _reallyClose", @view
    const tl = new TimelineMax({
      onComplete: this._onClose});
    const anim = this.view.getOption(_a.anim);
    let to = {
      alpha : 0,
      scale   : 0.8
    };
    if ((anim != null ? anim.out : undefined) != null) {
      to = _.extend(to, anim.out);
    }
    return tl.fromTo(this.$el, 0.5, {alpha:1,scale:1}, to);
  }
// ============================
//
// ============================

// ===========================================================
// onForceClose
//
// ===========================================================
  onForceClose(){
    return this._reallyClose();
  }
    //@_onClose()
// ============================
//
// ============================

// ===========================================================
// _onStart
//
// @return [Object] 
//
// ===========================================================
  _onStart(){
    //window.scrollTo(_a.top,0)
    let top;
    TweenMax.set(this.$el, _startOpt);
    let max = 700;
    if (__guard__(this.view.get(_a.styleOpt), x => x[_a.maxWidth]) != null) {
      max = this.view.get(_a.styleOpt)[_a.maxWidth];
    }
    const maxWidth = Math.min(window.innerWidth, max);
    const manner = this.view.get(_a.showIn) || this.view.get(_a.mode);
    this.debug(`<<KK modal _onStart max=${maxWidth}, manner=${manner}`, this.view);
    switch (manner) {
      case _a.center: case _a.modal:
        this.$el.css(_a.width, maxWidth.px());
        var left = parseInt((window.innerWidth/2) - (this.$el.width()/2));
        if (Visitor.isMobile()) {
          top = 0;
        } else {
          top = parseInt((window.innerHeight/2) - (this.$el.height()/2));
        }
        this.$el.css({
          'margin-top': Utils.px(top),
          'margin-left': Utils.px(left)
        });
        return this.debug(`<<KK modal _onStart top=${top}, left=${left}`, this.view);
      case 'center-flex':
        left = parseInt((window.innerWidth/2) - (this.$el.width()/2));
        if (Visitor.isMobile()) {
          top = 0;
        } else {
          top = parseInt((window.innerHeight/2) - (this.$el.height()/2));
        }
        return this.$el.css({
          'margin-top': Utils.px(top),
          'margin-left': Utils.px(left),
          'min-width' : maxWidth.px(),
          'height' : _a.auto,
          'width'  : _a.auto
        });
      case _a.context:
        return this.view.showInViewPort();
      case _a.parent:
        return;
      default:
        if (this.view.get(_a.position)) {
          return this.$el.css(this.view.get(_a.position));
        }
    }
  }
// ============================
//
// ============================

// ===========================================================
// _childReady
//
// ===========================================================
  _childReady(){
    return this.debug("_> _childReady");
  }
// ============================
//
// ============================

// ===========================================================
// _start
//
// ===========================================================
  _start(){
    return this.debug("_> _start");
  }
// ============================
//
// ============================

// ===========================================================
// _onComplete
//
// @return [Object] 
//
// ===========================================================
  _onComplete(){
    if ((this.view.children == null)) {
      return;
    }
    return Array.from(this.view.children.toArray()()).map((c) =>
      //@debug "_> onComplete", c, c.$el.children().height()
      c.on(_e.show, this._childReady));
  }
// ============================
//
// ============================

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh(){
    if ((this.view.children != null ? this.view.children.length : undefined) != null) {
      this._childReady = _.after(this.view.children.length, this._start);
    } else {
      this._childReady = this._start;
    }
    if (this.view.get(_a.anim) === _a.no) {
      return;
    }
    //@debug "_> onDomRefresh", @view, @view.$el.children().height()
    const tl = new TimelineMax({
      onStart: this._onStart,
      onComplete: this._onComplete
    });
    const anim = this.view.getOption(_a.anim);
    const from = {
      alpha : 0,
      scale   : 0.8
    };
    const to = {
      alpha:1,
      scale:1,
      ease:Back.easeInOut
    };
    if ((anim != null ? anim.in : undefined) != null) {
      _.extend(from, anim.in);
    }
    if ((anim != null ? anim.out : undefined) != null) {
      _.extend(to, anim.out);
    }
    //@debug "<<KK modal", anim, from
    return tl.fromTo(this.$el, 0.5, from, to);
  }
// =============================
//
// =============================

// ===========================================================
// onClose
//
// ===========================================================
  onClose(){
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onChildClose
//
// ===========================================================
  onChildClose(){
    return this._close();
  }
// ============================================
//
// ============================================

// ===========================================================
// onKeypressEscape
//
// @param [Object] trigger
//
// ===========================================================
  onKeypressEscape(trigger) {
    return this._reallyClose();
  }
// ============================================
//
// ============================================

// ===========================================================
// onEscape
//
// @param [Object] child
//
// ===========================================================
  onEscape(child) {
    //@_close()
    return this._reallyClose();
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildEscape
//
// @param [Object] child
//
// ===========================================================
  onChildEscape(child) {
    this._close();
    return this._reallyClose();
  }
// =============================
//
// =============================

// ===========================================================
// onButtonOk
//
// ===========================================================
  onButtonOk(){
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onButtonYes
//
// ===========================================================
  onButtonYes(){
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onButtonNo
//
// ===========================================================
  onButtonNo(){
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onChildCancel
//
// @return [Object] 
//
// ===========================================================
  onChildCancel(){
    if (this._exec(__guard__(this.view.get(_a.api), x => x.on_cancel))) {
      return;
    }
    return this._reallyClose();
  }
// =============================
//
// =============================

// ===========================================================
// onCancel
//
// @return [Object] 
//
// ===========================================================
  onCancel(){
    this.debug("onCancel");
    if (this._exec(__guard__(this.view.get(_a.api), x => x.on_cancel))) {
      return;
    }
    return this._reallyClose();
  }
// =============================
//
// =============================

// ===========================================================
// onKeypressEscape
//
// ===========================================================
  onKeypressEscape(){
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onPipeSucceeded
//
// ===========================================================
  onPipeSucceeded() {
    return this._close();
  }
// =============================
//
// =============================

// ===========================================================
// onPipeFailed
//
// @param [Object] json
//
// ===========================================================
  onPipeFailed(json) {
    return this._close();
  }
//============================
//
//===========================

// ===========================================================
// onPipeAborted
//
// @param [Object] msg=_I.ERR_REQUEST
//
// ===========================================================
  onPipeAborted(msg) {
    if (msg == null) { msg = _I.ERR_REQUEST; }
    return RADIO_BROADCAST.trigger(_e.error, msg);
  }
}
__bhv_modal.initClass();
module.exports = __bhv_modal;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
