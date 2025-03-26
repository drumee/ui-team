const { TweenMax, Power2 } = require("gsap");

class __slider_ribbon extends LetcBox {
  constructor(...args) {
    super(...args);
    this._play = this._play.bind(this);
    this._onComplete = this._onComplete.bind(this);
    this._start = this._start.bind(this);
  }


  /**
   * 
   */
  initialize(opt) {
    super.initialize(opt);
    this._playList = [];
    this._curPtr = 0;
    this.declareHandlers();
    this._animOpt = {
      duration: 1,
      pause: 5,
      direction: 'rtl',
      axis: _a.x,
      ease: Power2.easeOut
    };

    if (_.isObject(this.get(_a.animOpt))) {
      this._animOpt = _.merge(this._animOpt, this.get(_a.animOpt));
    }
  }



  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    const skeleton = Skeletons.Box.X({
      className: "u-jc-center u-ai-center",
      kids: [
        Skeletons.Note({
          className: "drumee-spinner",
          styleOpt: {
            width: 100,
            height: 100
          }
        })
      ]
    });
    if (_.isArray(this.get(_a.items))) {
      this._items = _.isArray(this.get(_a.items));
      this.feed(skeleton);
    } else if (_.isString(this.get(_a.items))) {
      let opt = {
        hashtag: this.mget(_a.items)
      };
      this.fetchService(SERVICE.block.content, opt).then((data)=>{
        this._items = data.kids;
        this.feed(skeleton);
      })
    }
  }

  /**
   * 
   * @returns 
   */
  _play() {
    this.tl = new TimelineLite({
      onComplete: this._onComplete
    });
    const {
      length
    } = this.collection;
    if (this._animOpt.axis === _a.x) {
      TweenMax.set(this.$el, { width: `${length}00%` });
      if (this._animOpt.direction === 'ltr') {
        this.tl.fromTo(this.$el, this._animOpt.duration, { x: -(length) * this._delta }, { x: -(length - 1) * this._delta });
        return (() => {
          const result = [];
          for (let start = length - 1, i = start, asc = start <= 1; asc ? i <= 1 : i >= 1; asc ? i++ : i--) {
            var from =
              { x: -(i) * this._delta };
            var to =
              { x: -(i - 1) * this._delta };
            result.push(this.tl.to(this.$el, this._animOpt.duration, to, `+=${this._animOpt.pause}`));
          }
          return result;
        })();
      } else {
        const sign = -1;
        this.tl.fromTo(this.$el, this._animOpt.duration, { x: this._delta }, { x: 0 });
        return (() => {
          const result1 = [];
          for (let i = 0, end = length - 2, asc1 = 0 <= end; asc1 ? i <= end : i >= end; asc1 ? i++ : i--) {
            var from =
              { x: (i) * sign * this._delta };
            var to =
              { x: (i + 1) * sign * this._delta };
            result1.push(this.tl.to(this.$el, this._animOpt.duration, to, `+=${this._animOpt.pause}`));
          }
          return result1;
        })();
      }
    }
  }

  /**
   * 
   * @returns 
   */
  _onComplete() {
    const me = this;
    if (this._paused) {
      return;
    }
    if (parseInt(this._animOpt.repeat) <= 0) {
      const f = () => me.tl.restart();
      return _.delay(f, Visitor.timeout(1000) * this._animOpt.pause);
    }
  }

  /**
   * 
   * @returns 
   */
  _start() {
    this._delta = this.parent.$el.innerWidth();
    this._countChild = _.after(this._items.length, () => {
      return this._play();
    });

    this._started = true;
    if (this._animOpt.direction === 'rtl') {
      return this.feed(this._items);
    } else {
      return this.feed(this._items.reverse());
    }
  }
}

module.exports = __slider_ribbon;
