const _toLeft = {
  start_on : _e.show,
  pause    : 5000,
  forward: {
    duration        : 1,
    from            : {
      x             : 340,
      autoAlpha     : 0
    },
    to              : {
      x             : 0,
      autoAlpha     : 1
    },
    ease            : SlowMo.ease.config(0.7, 0.7, false)
  },
  backward: {
    duration        : .8,
    from            : {
      autoAlpha     : 1
    },
    to              : {
      //rotationX     : -45
      y             : -250,
      autoAlpha     : 0
    },
    ease            : Power2.easeOut
  }
};
const _toRight = {
  start_on : _e.show,
  pause    : 5000,
  forward: {
    duration        : 1,
    from            : {
      x             : -340,
      autoAlpha     : 0
    },
    to              : {
      x             : 0,
      autoAlpha     : 1
    },
    ease            : SlowMo.ease.config(0.7, 0.7, false)
  },
  backward: {
    duration        : .8,
    from            : {
      autoAlpha     : 1
    },
    to              : {
      //rotationX     : 45
      y             : 250,
      autoAlpha     : 0
    },
    ease            : Power2.easeOut
  }
};
//-------------------------------------
//
// drumee_slider
//-------------------------------------
class __slideshow extends LetcBox {
  constructor(...args) {
    super(...args);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this._start = this._start.bind(this);
    this._play = this._play.bind(this);
    this.onParentReady = this.onParentReady.bind(this);
    this.onChildEndForward = this.onChildEndForward.bind(this);
    this.onChildEndBackward = this.onChildEndBackward.bind(this);
  }

  static initClass() {
  //   className:"slider-box widget"
  // 
  // 
    this.prototype.nativeClassName ="slider-box widget";
  }
// ============================
//
// ===========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this._playList = [];
    this._curPtr = 0;
    this._animOpt = this.get(_a.animOpt);
    if (_.isObject(this._animOpt)) {
      this._animOpt =  _.clone(_toLeft);
      _.extend(this._animOpt, this.get(_a.animOpt));
    } else if (_.isString(this._animOpt)) {
      if (this._animOpt.match(/right/)) {
        this._animOpt = _.clone(_toRight);
      }
    }
    this._animOpt =  this._animOpt || _.clone(_toLeft);
    this._countDown = _.after(3, this._start);
    this.debug("START SLIDER initialize", this, this.get(_a.animOpt), this._animOpt);
    if (_.isString(this.get(_a.items))) {
      this.debug("START SLIDER trigger", this);
      return this.triggerMethod(_e.service.read, {
        service : SERVICE.block.content,
        hashtag : this.get(_a.items)
      }
      );
    } else if (_.isArray(this.get(_a.items))) {
      this._items = _.isArray(this.get(_a.items));
      return this._countDown();
    } else {
      return this.warn("Should be string or array");
    }
  }
// ========================
//
// ========================

// ===========================================================
// _OLstart
//
// @param [Object] child
//
// ===========================================================
  _OLstart(child) {
    const x = -child.$el.parent().outerWidth();
    TweenMax.set(child.$el, {position:_a.absolute, x, y:0, height:_K.size.full});
    if (parseInt(child.get(_a.rank)) === 1) {
      this._playList.push(child);
    }
    //@debug "PLAYING _childCreated", child, child.get(_a.rank), @
    if (this._childReady != null) {
      return this._childReady();
    }
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this._countDown();
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
    return this.debug("START SLIDER onDomRefresh", this);
  }
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
    this.debug(`START SLIDER __dispatchRest m=${method}`, this, data);
    switch (method) {
      case SERVICE.block.content:
        this._items = data.kids;
        return this._countDown();
      default:
        return this.warn(WARNING.response.unexpected.format(method));
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    this.triggerMethod(_e.spinner.stop);
    return this._play();
  }
    //if @get(_a.play) is _a.auto
    //  @_play()
// ============================================
//
// ============================================

// ===========================================================
// _play
//
// ===========================================================
  _play() {
    let slide = this._items[this._curPtr];
    if ((slide == null)) {
      this._curPtr = 0;
      slide = this._items[this._curPtr];
    }
    slide.anim = slide.anim || {};
    _.extend(slide.anim, this._animOpt);
    this.feed(slide);
    return this._curPtr++;
  }
// ============================================
//
// ============================================

// ===========================================================
// onParentReady
//
// ===========================================================
  onParentReady() {
    //@_play()
    this._countDown();
    return this.triggerMethod(_e.spinner.stop);
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildEndForward
//
// @param [Object] origin
//
// ===========================================================
  onChildEndForward(origin) {
    this.debug("START SLIDER onChildEndForward", this, origin);
    const f = () => origin.triggerMethod('backward');
    const pause = this._animOpt.pause || 5000;
    return _.delay(f, pause);
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildEndBackward
//
// @param [Object] origin
//
// ===========================================================
  onChildEndBackward(origin) {
    this.debug("START SLIDER onChildEndBackward", this, origin);
    return this._play();
  }
}
__slideshow.initClass();
module.exports = __slideshow;
