const END_FORWARD  = "end:forward";
const END_BACKWARD = "end:backward";
const DISPOSABLE   = "disposable";
const {
  TweenMax
} = require("gsap/all");

class __bhv_anim extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._start = this._start.bind(this);
    this.on_start = this.on_start.bind(this);
    this.forwardCompleted = this.forwardCompleted.bind(this);
    this.backwardCompleted = this.backwardCompleted.bind(this);
    this.onClose = this.onClose.bind(this);
    this._play = this._play.bind(this);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
    this._continue = this._continue.bind(this);
    this._backward = this._backward.bind(this);
    this._forward = this._forward.bind(this);
    this.onForward = this.onForward.bind(this);
    this.onBackward = this.onBackward.bind(this);
    this.onPoke = this.onPoke.bind(this);
    this.onKill = this.onKill.bind(this);
    this._end = this._end.bind(this);
  }

  initialize(opt) {
    if (__guard__(this.view.get(_a.anim), x => x.start_on) === 'hover') {
      return this.events = {
        mouseleave : '_mouseleave',
        mouseout   : '_mouseleave',
        mouseenter : '_mouseenter'
      };
    }
  }

// ===========================================================
// onBeforeRender
//
// ===========================================================
  onBeforeRender(){
    let e, init;
    this.debug("UUUUUUUYYYYYYY");
    this._countdown = _.after(2, this._start);
    try {
      ({
        init
      } = this.view.get(_a.anim));
    } catch (error) {
      e = error;
      init = {visibility : _a.hidden};
    }
    try {
      this._duration = this.view.get(_a.anim).duration;
    } catch (error1) {
      e = error1;
      this._duration =.300;
    }
    try {
      this._exposition = this.view.get(_a.anim).exposition;
    } catch (error2) {}
    const setup = anim=> {
      //@debug "MAGENT!!!!DDDE STARTIN ANIM", anim, @view
      this._anim = anim.init || anim || init;
      if ((this._anim.forward == null)) {
        if (this._anim.backward != null) {
          this._anim.forward = this._anim.backward;
        }
        this.warn("Attempt to use animation without specs, use backwark", this._anim);
      }
      const tlOpt = this._anim.tlOpt || {};
      if (anim.forward != null) {
        const h1 = {
          onReverseComplete : this._end,
          onStart : this.on_start,
          onComplete: this.forwardCompleted
        };
        _.merge(h1, tlOpt);
        this._fwdTL = new TimelineMax(h1);
      }
      if (anim.backward != null) {
        const h2 = {
          onStart : this.on_start,
          onComplete: this.backwardCompleted
        };
        _.merge(h2, tlOpt);
        this._bkwTL = new TimelineMax(h2);
      }
      return this._countdown();
    };
    require('router/anim')(this.view, setup);
    if (this._exposition != null) {
      const f = ()=> {
        return this._backward();
      };
      return _.delay(f, this._exposition);
    }
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh(){
    //@debug "MAGENT!!!!DDDE onDomRefresh", @view
    if (!this.getOption(_a.target)) {
      this.$target = this.$el;
    } else {
      this.$target = this.ui[this.getOption(_a.target)];
    }
    if (this.view.get(_a.anim)) {
      // hide until animation is loaded
      this.$target.css({visibility:_a.hidden});
    }
    try { 
      this._countdown();
    } catch (error) {}
  }
// ========================
//
// ========================

// ===========================================================
// _start
//
// ===========================================================
  _start(){
    const evt = this._anim.startEvent || this._anim.start_on;
    switch (evt) {
      case _e.show:
        return this._forward();
    }
  }
// ========================
//
// ========================

// ===========================================================
// on_start
//
// @return [Object] 
//
// ===========================================================
  on_start(){
    if ((this.$target == null)) {
      this.warn("Anim on undefined target");
      return;
    }
    return TweenMax.set(this.$target, {visibility:_a.visible});
  }
// ========================
//
// ========================

// ===========================================================
// forwardCompleted
//
// @return [Object] 
//
// ===========================================================
  forwardCompleted(){
    if ((this.$target == null)) {
      return;
    }
    //@debug "START SL forwardCompleted", @
    if (this._killed || this.view._killed) {
      this._anim.on_reverse = null;
      try {
        this.view.destroyChildren();
      } catch (error) {}
      this.view.destroy();
      return;
    }
    TweenMax.set(this.$target, {visibility:_a.visible});
    this.view.trigger(_e.animCompleted, this);
    return this.view.triggerMethod(END_FORWARD);
  }
// ========================
//
// ========================

// ===========================================================
// backwardCompleted
//
// @return [Object] 
//
// ===========================================================
  backwardCompleted(){
    //@debug "START SL backwardCompleted", @
    if (this._tl != null ? this._tl.isActive() : undefined) {
      this.view.triggerMethod("anim:buzy");
      return;
    }
    this.view.trigger(_e.animCompleted, this);
    return this.view.triggerMethod(END_BACKWARD);
  }

// ========================
//
// ========================

// ===========================================================
// onClose
//
// ===========================================================
  onClose(){
    //@debug "Animation onClose", @_fwdTL
    if (this._anim.start_on === _e.close) {
      return this._forward();
    } else {
      return this._backward();
    }
  }

// ===========================================================
// _play
//
// @param [Object] from
// @param [Object] to
// @param [Object] duration=0.1
//
// @return [Object] 
//
// ===========================================================
  _play(from, to, duration){
    //@debug "Animation _play", @view.isDestroyed
    let delay;
    if (duration == null) { duration = 0.1; }
    if (this.view.isDestroyed() || !this.el.isInViewport()) {
      return;
    }
    //_dbg "Animation _play", @_tl, @_played, @$target, from, to, duration
    if ((this.$target == null)) {
      return;
    }
    this._played = true;
    const d = this._anim.delay;
    if (_.isFinite(parseInt(d))) {
      if (d > 0) {
        delay = `+=${d}`;
      } else if (d < 0) {
        delay = `-=${d}`;
      } else {
        delay = null;
      }
    }
    if ((from != null) && (to != null)) {
      this._tl.fromTo(this.$target, duration, from, to, delay);
      return;
    }
    if (from != null) {
      this._tl.from(this.$target, duration, from, delay);
      return;
    }
    if (to != null) {
      return this._tl.to(this.$target, duration, to, delay);
    }
  }


// ===========================================================
// _mouseenter
//
// @return [Object] 
//
// ===========================================================
  _mouseenter(){
    //_dbg "Animation _mouseenter", @, @_played
    if (this._tl.isActive()) {
      return;
    }
    const trigger = this.view.get(_a.anim).start_on;
    if (trigger === 'hover') {
      return this._forward();
    }
  }

// ========================
//
// ========================

// ===========================================================
// _mouseleave
//
// @return [Object] 
//
// ===========================================================
  _mouseleave(){
    if (this._tl.isActive()) {
      _.delay(this._backward, 500);
      return;
    }
    return this._backward();
  }
    //_dbg "Animation _mouseleave", @
// ========================
//
// ========================

// ===========================================================
// _continue
//
// ===========================================================
  _continue(){
    this._anim.pause = this._anim.pause || 1;
    return _.delay(this._backward,  this._anim.pause);
  }
// ========================
//
// ========================

// ===========================================================
// _backward
//
// @return [Object] 
//
// ===========================================================
  _backward(){
    //@debug "ANIM _backward", @view.isDestroyed
    if (this.view.isDestroyed() || !this.el.isInViewport()) {
      return;
    }
    this.view.timeLine = this._bkwTL;
    if (this._bkwTL != null) {
      if (this._bkwTL.isActive()) {
        return;
      }
      this._tl = this._bkwTL;
      const duration = this._duration || this._anim.backward.duration;
      this._play(this._anim.backward.from , this._anim.backward.to, duration);
      //@debug "ANIM _backward 111111", @_bkwTL
      return;
    }
    if (this._fwdTL != null) {
      //@debug "ANIM _backward 22222", @_bkwTL
      if (this._fwdTL.isActive()) {
        this.debug("ANIM _backward Z3333333", this._bkwTL, this.view);
        return;
      }
      return this._fwdTL.reverse();
    }
  }


// ===========================================================
// _forward
//
// @return [Object] 
//
// ===========================================================
  _forward(){
    //@debug "ANIM _forward", @view.isDestroyed, @_fwdTL
    if (this.view.isDestroyed() || (this._fwdTL == null)  || !this.el.isInViewport()) {
      return;
    }
    this.view.timeLine = this._fwdTL;
    if (this._fwdTL.reversed()) {
      this._fwdTL.play();
      return;
    }
    if (this._fwdTL != null) {
      if (this._fwdTL.isActive()) {
        return;
      }
      this._tl = this._fwdTL;
      const duration = this._duration || this._anim.forward.duration;
      this._play(this._anim.forward.from , this._anim.forward.to, duration);
      return;
    }
  }
// ========================
//
// ========================

// ===========================================================
// onForward
//
// ===========================================================
  onForward(){
    return this._forward();
  }
// ========================
//
// ========================

// ===========================================================
// onBackward
//
// ===========================================================
  onBackward(){
    //@debug "START SL onBackward"
    return this._backward();
  }
    
// ========================
//
// ========================

// ===========================================================
// onPoke
//
// ===========================================================
  onPoke(){
    return this.debug("TEMPORARILY DISABLED");
  }
    //if @_poked
    //  @_fwdTL.restart()
    //else
    //  duration = 0.3
    //  try
    //    duration = @_anim.forward?.duration || duration
    //  catch e
    //    duration = @_anim.backward?.duration || duration
    //  finally
    //    duration = @_duration
    //  @_fwdTL.to @$target, duration, @_anim.forward.to, null
    //  @_fwdTL.from @$target, duration, @_anim.forward.from, null
    //@_poked = yes
// ========================
//
// ========================

// ===========================================================
// onKill
//
// ===========================================================
  onKill(){
    //@_kill = yes
    this._killed= true;
    return this.onPoke();
  }
// ========================
//
// ========================

// ===========================================================
// _end
//
// @return [Object] 
//
// ===========================================================
  _end(){
    this._playing = false;
    if ((this.$target == null)) {
      return;
    }
    if (this._killed) {
      this._anim.on_reverse = null;
    }
    //if @_kill
    //  @view.destroy()
    //  @view.destroyChildren()
    //  return
    let on_end = this._anim.on_reverse || this._anim.on_end;
    if (this.view.model.get(DISPOSABLE)) {
      on_end = DISPOSABLE;
    }
    switch (on_end) {
      case 'nop':
        return;
        break;
      case _a.hide:
        TweenMax.set(this.$target, {visibity:_a.hidden});
        break;
      default:
        this.view.parent.collection.remove(this.view.model);
    }
        //@view.destroy()
        //@view.destroyChildren()
    //@debug "_endYYYYYYYYYYYYYYYYYYY", @view
    this.view.trigger(_e.animCompleted, this);
    return this.view.triggerMethod(END_FORWARD);
  }
}
module.exports = __bhv_anim;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
