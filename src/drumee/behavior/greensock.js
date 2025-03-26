function parseCoordinates(arg, width, height) {
  if (arg == null) {
    return;
  }
  if (arg.x != null) {
    if (arg.x.toString().match(/^left$/i)) {
      arg.x = -width;
    }
    if (arg.x.toString().match(/^right$/i)) {
      arg.x = width;
    }
  }
  if (arg.y != null) {
    if (arg.y.toString().match(/^top$/i)) {
      arg.y = -height;
    }
    if (arg.y.toString().match(/^right$/i)) {
      return (arg.x = height);
    }
  }
}

const _startOpt = {
  visibility : _a.visible,
  position   : 'relative',
  scale      : 1,
  rotationX  : 0,
  rotationY  : 0,
  skewX      : 0,
  skewY      : 0
};

const {
  TweenMax
} = require("gsap/all");

const rndomNbr = (min, max) => Math.floor((Math.random() * ((1 + max) - min)) + min);

const rangeToPercent = (number, min, max) => (number - min) / (max - min);
// ============================================
//
// ============================================
//########################################
// CLASS : Behavior.GreenSock
//
//########################################
class __bahavior_greensock extends Marionette.Behavior {
// ============================
//
// ============================

// ===========================================================
// onBeforeRender
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
    this._completed = this._completed.bind(this);
    this.onComplete = this.onComplete.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._runFrom = this._runFrom.bind(this);
    this._splitText = this._splitText.bind(this);
    this.onAnimText = this.onAnimText.bind(this);
    this._splitNote = this._splitNote.bind(this);
    this._onSlideOpen = this._onSlideOpen.bind(this);
    this._onSlideClose = this._onSlideClose.bind(this);
    this.onSlide = this.onSlide.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  onBeforeRender(){
    this._anim = this.view.get(_a.anim);
    if (this._anim != null) {
      //_dbg "<<onBeforeRender TTTTTT", @_anim, @$el
      this._from      = require('options/gsapp/convert')(this._anim.in);
      this._to        = require('options/gsapp/convert')(this._anim.out);
      this._settings  = this._anim.settings || require('options/gsapp/base')(_a.defaults);
      this._accordion = eval(this._settings.accordion);
      this._autoplay  = eval(this._settings.autoplay);
      if (_.isFinite(this._settings.starttime)) {
        this._starttime = parseInt(this._settings.starttime);
      } else if (this._settings.starttime != null ? this._settings.starttime.match(/over|enter/) : undefined) {
        this._hoverEffetcs();
        this._settings =
          {autoplay : false};
      }
      if (_.isFinite(this._settings.pausetime)) {
        return this._pausetime = parseInt(this._settings.pausetime);
      } else if (this._settings.pausetime != null ? this._settings.pausetime.match(/leave|out/) : undefined) {
        return this.$el.bind('mouseleave', this._mouseleave);
      }
    } else {
      return this._settings =
        {autoplay : false};
    }
  }
// ============================
//
// ============================

// ===========================================================
// _mouseenter
//
// ===========================================================
  _mouseenter(){
    if (this._ended) {
      this._ended = false;
      this._from.definition.onComplete = this._completed;
      _dbg("<<_mouseenter QQQQ TTTTTT", this._to.definition, this._from.definition);
      return this._tl.to(this.$el, this._from.duration, this._from.definition)
        .to(this.$el, this._to.duration, this._to.definition, "+=0.05");
    }
  }
//        @_to.definition.onComplete = @_completed
//        @_tl.to(@$el, @_from.duration, @_from.definition)
//          .to(@$el, @_to.duration, @_to.definition, "+=0.01")
// ============================
//
// ============================

// ===========================================================
// _mouseleave
//
// ===========================================================
  _mouseleave(){
    _dbg("<<_mouseleave QQQQ TTTTTT", this._from, this._to);
    if (this._ended) {
      return this._tl.to(this.$el, 0.7, {borderRadius:"50px", ease:Back.easeOut})
        .to(this.$el, 0.7, {borderRadius:"1px", ease:Back.easeOut, onComplete:this._completed}, "+=0.05");
    }
  }
// ============================
//
// ============================

// ===========================================================
// onToggle
//
// ===========================================================
  onToggle(){
    if (this._forward) {
      return this.triggerMethod(_e.reverse);
    } else {
      return this.triggerMethod(_e.play);
    }
  }
// ============================
//
// ============================

// ===========================================================
// _completed
//
// ===========================================================
  _completed(){
    _dbg("<<_completed TTTTTT", this._ended);
    return this._ended = true;
  }
// ============================
//
// ============================

// ===========================================================
// _hoverEffetcs
//
// @return [Object] 
//
// ===========================================================
  _hoverEffetcs(){
    if ((this._from == null) || !this._to) {
      RADIO_BROADCAST.trigger(_e.error, "Hover must have in and out parameters");
      return;
    }
    const p = __guard__(this._from != null ? this._from.definition : undefined, x => x.perspective) || __guard__(this._to != null ? this._to.definition : undefined, x1 => x1.perspective) || 600;
    TweenMax.set(this.$el, {perspective:p});
    TweenMax.set(this.$el, {transformStyle:"preserve-3d"});
    this._tl = new TimelineMax();
    this._ended = true;
    return $(this.$el).hover(this._mouseenter, this._mouseleave);
  }
// ============================
//
// ============================

// ===========================================================
// onPlay
//
// ===========================================================
  onPlay(){
    TweenMax.set(this.$el, {visibility:_a.visible});
    if (this._tl != null) {
      this._tl.restart();
    } else {
      this._tl = new TimelineMax();
      if (this._starttime != null) {
        this._tl.delay(this._starttime);
      }
      this._runFrom();
    }
    return this._forward = true;
  }
// ============================
//
// ============================

// ===========================================================
// onReverse
//
// @return [Object] 
//
// ===========================================================
  onReverse(){
    if (this._tl != null) {
      this._tl.reverse();
    } else {
      this._tl = new TimelineMax();
    }
    return this._forward = false;
  }
//      return
//      #@_runTo()
//      #@tl.reverse()
//      #return
//      if @tlTo?
//        @tlTo.restart()
//      else
//        @tlTo = new TimelineMax()
//        @_runTo()
// ============================
//
// ============================

// ===========================================================
// onComplete
//
// ===========================================================
  onComplete(){
    return this.triggerMethod(_e.stop);
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
    if ((this._anim == null)) {
      return;
    }
    this.padding = this.$el.css(_a.padding._);
    this.width  = parseInt(this.$el.css(_a.width));
    this.height = parseInt(this.$el.css(_a.height));
    if  (this._settings.starttime != null) {
      TweenMax.set(this.$el, {visibility:_a.hidden});
    }
    if (this._from != null) {
      parseCoordinates(this._from.definition, this.width, this.height);
    }
    if (this._to != null) {
      parseCoordinates(this._to.definition, this.width, this.height);
    }
    if (eval(this._settings.autoplay)) {
      return this.triggerMethod(_e.play);
    }
  }
// ============================
//
// ============================

// ===========================================================
// _runFrom
//
// @return [Object] 
//
// ===========================================================
  _runFrom() {
    TweenMax.set(this.$el, _startOpt);
    if (this.view.get('splitText') && (this.view.get(_a.kind) === _a.note)) {
      this._splitNote();
      return;
    }
    if (!_.isEmpty(this._settings.spliInto)) {
      const txt = this._splitText(this._settings.spliInto);
      //_dbg "GS 6> ANIM FROM YY", @_pausetime, @_from, @_to, txt
      if ((this._from != null ? this._from.definition : undefined) != null) {
        _.extend(this._from.definition, {alpha:0, scale:0.5});
        this._tl.staggerFrom(txt, this._from.duration, this._from.definition, 0.06);
      }
      if ((this._to != null ? this._to.definition : undefined) != null) {
        return this._tl.staggerTo(txt, this._to.duration, this._to.definition, 0.02, `+=${this._pausetime}`);
      }
    } else if (this._accordion) {
      this._tl.fromTo(this.$el, 0.2, {height:0, padding:0}, {height:this.height, padding:this.padding});
      if ((this._from != null ? this._from.definition : undefined) != null) {
        return this._tl.from(this.$el, this._from.duration, this._from.definition);
      }
    } else {
      this._tl.fromTo(this.$el, 0.3, {opacity:0}, {opacity:1});
      if ((this._from != null ? this._from.definition : undefined) != null) {
        this._tl.from(this.$el, this._from.duration, this._from.definition);
      }
      if ((this._to != null ? this._to.definition : undefined) != null) {
        return this._tl.to(this.$el, this._to.duration, this._to.definition, `+=${this._pausetime}`);
      }
    }
  }
//  # ============================
//  #
//  # ============================

// ===========================================================
// #    _runTo
//
// ===========================================================
//    _runTo:() =>
//      duration = (@_to.duration/1000).toFixed(3)
//      #@tl.clear()
//      if @_split?
//        @_splitText()
//        @tlTo.staggerTo(@txt, duration, @_to.definition)
//      else
//        @tlTo.to(@$el, duration, @_to.definition)
//          .to(@$el, 0.3, {opacity:0, padding:0}, 0.06)
//          .to(@$el, 0.3, {height:0}, 0.06)
// ============================
//
// ============================

// ===========================================================
// _splitText
//
// @param [Object] className
//
// @return [Object] 
//
// ===========================================================
  _splitText(className){
    //TweenMax.set(@ui.content, {css:{perspective:500}})
    let left, width;
    const text = this.ui.content.text().trim();
    let max = 20;
    if ((text == null) || !_.isString(text)) {
      return;
    }
    this.ui.content.html(_K.char.empty);
    const object = text.split(_K.char.empty);
    for (var index in object) {
      var val = object[index];
      if(val === _K.char.blank) {
        val = "&nbsp;";
      }
      var id = `txt-${index}`;
      var letter = $("<div/>", {id}).addClass(className).html(val).appendTo(this.ui.content);
      if (prevLetter != null) {
        width = $(letter).width();
        left = Utils.px($(prevLetter).position().left + width);
        $(letter).css(_a.left, left);
        if ($(letter).height() > max) {
          max  = $(letter).height();
        }
      }
      var prevLetter = letter;
    }
    if (this.ui.content.height() < max) {
      this.ui.content.height(max);
    }
    //_dbg "HTHHTT", left
    this.ui.content.width(parseInt(left)+width);
    return $(`.${className}`);
  }
// ============================
//
// ============================

// ===========================================================
// onAnimText
//
// ===========================================================
  onAnimText(){
    //@_splitNote()
    let i, z;
    let asc, end;
    let asc1, end1;
    let asc2, end2;
    let asc3, end3;
    const quote = document.getElementById(this.view.get(_a.widgetId));
    _dbg("onAnimText mySplitText", quote, this, this.view.get(_a.widgetId));
    const mySplitText = new SplitText(quote, {type:"words"});
    const tl = new TimelineMax({delay:0.5, repeat:10, repeatDelay:1});
    const numWords = mySplitText.words.length - 1;
    //prep the quote div for 3D goodness
    TweenMax.set(quote, {transformPerspective:600, perspective:300, transformStyle:"preserve-3d", autoAlpha:1});
    //intro sequence
    for (i = 0, end = numWords, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      var r = Math.random()*1.5;
      tl.from(mySplitText.words[i], 1.5, {z:rndomNbr(-500,300), opacity:0, rotationY:rndomNbr(-40, 40)}, r);
    }
    tl.from(quote, tl.duration(), {rotationY:180, transformOrigin:"50% 75% 200", ease:Power2.easeOut}, 0);
    //randomly change z of each word, map opacity to z depth and rotate quote on y axis
    for (i = 0, end1 = numWords, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
      z = rndomNbr(-50,50);
      tl.to(mySplitText.words[i], 0.5, {z, opacity:rangeToPercent(z, -50, 50)}, "pulse");
    }
    tl.to(quote, 0.5, {rotationY:20}, "pulse");
    //randomly change z of each word, map opacity to z depth and rotate quote on xy axis
    for (i = 0, end2 = numWords, asc2 = 0 <= end2; asc2 ? i <= end2 : i >= end2; asc2 ? i++ : i--) {
      z = rndomNbr(-100,100);
      tl.to(mySplitText.words[i], 0.5, {z, opacity:rangeToPercent(z, -100, 100)}, "pulse2");
    }
    tl.to(quote, 0.5, {rotationX:-35, rotationY:0}, "pulse2");
    //reset the quote to normal position
    tl.to(mySplitText.words, 0.5, {z:0, opacity:1}, "reset");
    tl.to(quote, 0.5, {rotationY:0, rotationX:0}, "reset");
    //add explode label 2 seconds after reset animation is done
    tl.add("explode", "+=2");
    //add explode effect
    for (i = 0, end3 = numWords, asc3 = 0 <= end3; asc3 ? i <= end3 : i >= end3; asc3 ? i++ : i--) {
      tl.to(mySplitText.words[i], 0.6, {z:rndomNbr(100, 500), opacity:0, rotation:rndomNbr(360, 720), rotationX:rndomNbr(-360, 360), rotationY:rndomNbr(-360, 360)}, "explode+=" + (Math.random()*0.2));
    }
  //TRY THIS FOR SUPER-SLOW-MO
    return tl.timeScale(0.5);
  }
// ============================
//
// ============================

// ===========================================================
// _splitNote
//
// ===========================================================
  _splitNote(){
    const tl = new TimelineMax();
    const mySplitText = new SplitText(this.$el, {type:"words,chars"});
    const {
      chars
    } = mySplitText;
    TweenMax.set(this.$el, {perspective:400});
    const opt = {
      opacity:0,
      scale:0,
      y:80,
      rotationX:180,
      transformOrigin:"0% 50% -50",
      ease:Back.easeOut
    };
    return tl.staggerFrom(chars, 0.8, opt, 0.01, "+=0");
  }
// ============================
//
// ============================

// ===========================================================
// _onSlideOpen
//
// ===========================================================
  _onSlideOpen(){
    _dbg("_onSlideOpen  ", this.view);
    if (this.view._handler.ui != null) {
      return this.view._handler.ui.triggerMethod("slide:open");
    } else {
      return this.view.triggerMethod("slide:open");
    }
  }
// ============================
//
// ============================

// ===========================================================
// _onSlideClose
//
// ===========================================================
  _onSlideClose(){
    _dbg("_onSlideClose  ", this.view);
    if (this.view._handler.ui != null) {
      this.view._handler.ui.triggerMethod("slide:close");
    } else {
      this.view.triggerMethod("slide:close");
    }
    return TweenMax.set(this.$target, {visibility:_a.hidden});
  }
// ============================
//
// ============================

// ===========================================================
// onSlide
//
// @param [Object] open=1
// @param [Object] $target
// @param [Object] dim
// @param [Object] dir=_a.vertical
//
// ===========================================================
  onSlide(open, $target, dim, dir){
    let _close, _open;
    if (open == null) { open = 1; }
    if (dir == null) { dir = _a.vertical; }
    _dbg("onSlide", open, dim, $target, dir);
    this._tl = this._tl || new TimelineMax();
    this.$target = $target || this.$el;
    if (dir === _a.vertical) {
      const height = dim || this.$target.outerHeight();
      _open = {height};
      _close = {height:0, onComplete:this._onSlideEnd};
    } else {
      const width = dim || this.$target.outerWidth();
      _open = {width};
      _close = {width:0, onComplete:this._onSlideEnd};
    }
    if (open) {
      TweenMax.set(this.$target, {visibility:_a.visible});
      return this._tl.to(this.$target, .8, _open);
    } else {
      return this._tl.to(this.$target, .8, _close);
    }
  }
// ============================
//
// ============================

// ===========================================================
// onOpen
//
// @param [Object] args
//
// ===========================================================
  onOpen(args){
    let _from, _to;
    const tl = new TimelineMax();
    const opt = {
      target : this.$el,
      direction  : _a.vertical,
      handler    : this._onSlideOpen
    };
    _.merge(opt, args);
    this.$target     = opt.target;
    if (opt.direction === _a.vertical) {
      const height = opt.size || this.view.get(_a.height) || this.$target.outerHeight();
      _from = {y:-height};
      _to = {y:0, onComplete:opt.handler, ease:Back.easeOut};
      _from = {height:0};
      _to = {height, onComplete:opt.handler, ease:Back.easeOut};
    } else {
      const width = opt.size || this.view.get(_a.width) || this.$target.outerWidth();
      _from = {x:-width};
      _to = {x:0, onComplete:opt.handler, ease:Back.easeOut};
    }
    _dbg("onOpen", _to, args, this.view);
    TweenMax.set(this.$target, {visibility:_a.visible});
    return tl.fromTo(this.$target, 0.8, _from, _to);
  }
// ============================
//
// ============================

// ===========================================================
// onClose
//
// @param [Object] args
//
// ===========================================================
  onClose(args){
    let _close, _from, _to, height;
    _dbg("onClose", args);
    const tl = new TimelineMax();
    const opt = {
      target : this.$el,
      direction  : _a.vertical,
      handler    : this._onSlideClose
    };
    if (args != null) {
      _.extend(opt, args);
    }
    this._handler = opt.handler.ui;
    this.$target  = opt.target;
    if (opt.direction === _a.vertical) {
      height = opt.size || this.view.get(_a.height) || this.$target.outerHeight();
      _from = {height};
      _to = {height:0, onComplete:opt.handler, ease:Back.easeOut};
    } else {
      const width = opt.size || this.view.get(_a.width) || this.$target.outerWidth();
      _from = {width:height};
      _to = {width:0, onComplete:opt.handler, ease:Back.easeOut};
      _close = {x:-width, onComplete:opt.handler};
    }
    //tl.staggerTo(@$target, 0.8, _close, 0.01, "+=0")
    _dbg("onClose", this.$target, _close);
    return tl.fromTo(this.$target, 0.8, _from, _to);
  }
}
module.exports = __bahavior_greensock;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
