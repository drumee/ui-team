const { TweenMax } = require("gsap");
class __drumee_slider extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this._getSlides = this._getSlides.bind(this);
    this._play = this._play.bind(this);
    this._start = this._start.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt)
    this._playList = [];
    this._curPtr = -1;
    this._fork = true;
    this.declareHandlers({part:_a.multiple, ui:_a.multiple});
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  _childCreated(child) {
    const x = -child.$el.parent().outerWidth();
    TweenMax.set(child.$el, { position: _a.absolute, x, y: 0, height: _K.size.full });
    if (parseInt(child.get(_a.rank)) === 1) {
      this._playList.push(child);
    }
    if (this._childReady != null) {
      return this._childReady();
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require("./drumee/skeleton/main")(this));
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    if (section !== _a.sys) {
      return;
    }
    switch (pn) {
      case _a.panel:
        var items = this.get(_a.items);
        if (_.isArray(items)) {
          this.feed(items);
          this._childReady = _.after(items.length, this._start);
          return;
        }
        if (_.isString(this.items)) {
          this._link = this.get(_a.items);
        } else if (this.get(_a.include) != null) {
          this._link = this.get(_a.include);
        }
        return this._getSlides();
    }
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  _getSlides(method, data) {
    if (!this._link) {
      _c.warc(WARNING.arguments.bad_value);
      return;
    }
    this.fetchService(SERVICE.block.content, {
      hashtag: this._link
    }).then((data) => {
      if ((data != null ? data.letc : undefined) != null) {
        const letc = JSON.parse(data.letc);
        if (letc.kids != null) {
          this._childReady = _.after(letc.kids.length, this._start);
          return this.feed(letc.kids);
        }
      } else {
        return this.warn(WARNING.response.unexpected.format(method));
      }
    });
  }

  /**
   * 
   * @returns 
   */
  _play() {
    const x = this.$el.outerWidth();
    const prev = this._playList[this._curPtr];
    if (prev != null) {
      TweenMax.to(prev.$el, 0.5, { x });
    }
    this._curPtr++;
    if (this._curPtr > (this._playList.length - 1)) {
      this._curPtr = 0;
    }
    const cur = this._playList[this._curPtr];
    TweenMax.set(cur.$el, { x: -x });
    TweenMax.to(cur.$el, 0.5, { x: 0 });
  }

  /**
   * 
   * @returns 
   */
  _start() {
    this._play();
    setTimeout(this._play, 7000);
  }
}

module.exports = __drumee_slider;
