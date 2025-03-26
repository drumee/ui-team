class __slider_vegas extends LetcBox {
  constructor(...args) {
    super(...args);
    this._start = this._start.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.onFilmReady = this.onFilmReady.bind(this);
    this._walk = this._walk.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className:"slider-vegas full"
  //   behaviorSet: PROXY_CORE.behaviors
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className ="slider-vegas full";
  }
  //childView : slide
  //emptyView : WPP.Spinner.Jump
// =================== *
// Proxied
// =================== *
//__behaviorSet: PROXY_CORE.behaviors
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    this._wait = _.after(3, this._display);
    require.ensure(['application'], ()=> {
      require('vegas');
      require('vegas/dist/vegas.css');
      return this._wait();
    });
    if ((this.model == null)) {
      this.model = new Backbone.Model(opt);
    }
    if ((this.collection == null)) {
      this.collection = new Backbone.Collection();
    }
    return this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}
  }
// ========================
//
// ========================

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    //_dbg ">>_start OIOI", @$el.width(), @children
    return TweenMax.set(this.$el,{visibility:"visible"});
  }
// ========================
//
// ========================

// ===========================================================
// _display
//
// @return [Object] 
//
// ===========================================================
  _display() {
    const opt   = this.get(_a.vendorOpt) || {};
    const items = this.get(_a.items) || this.get(_a.kids);
    const slides = _.map(items, el=> {
      const m = new Backbone.Model(el);
      const r = {};
      if ((opt.cover === 0) || (opt.cover === '0')) {
        opt.cover = false;
      } else if ((opt.cover === 1) || (opt.cover === '1')) {
        opt.cover = true;
      }
      _.extend(r, opt);
      r.src = require('options/url/file')(m, _a.slide);
      return r;
    });
    opt.slides = slides;
    opt.slide  =  opt.index;
    opt.walk   = this._walk;
    this.debug("KIDS", this, this.$el.width(), opt, this.$el.width(), slides);
    return this._image.$el.vegas(opt);
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this._wait();
    if (this.get(_a.skeleton) != null) {
      return this.feed(this.get(_a.skeleton));
    } else {
      this.debug("SKEL", require('./vegas/skeleton/standard')(this));
      return this.feed(require('./vegas/skeleton/standard')(this));
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// ===========================================================
  onPartReady(child, pn, section) {
    this.debug(">>2233 CHILD READY WIDGET", pn, child);
    switch (pn) {
      case _a.image:
        this._image = child;
        return this._wait();
      case _a.caption:
        return this._caption = child;
    }
  }
// ========================
//
// ========================

// ===========================================================
// onUiEvent
//
// @param [Object] btn
//
// ===========================================================
  onUiEvent(btn) {
    const service = btn.get(_a.service) || btn.get(_a.name);
    this.debug(`menuEvents service=${service}`, this, btn);
    switch (service) {
      case _e.close:
        this._killed = true;
        return this.triggerMethod(_e.close);
      case "previous": case "next":
        return this._image.$el.vegas(service);
    }
  }
// ========================
//
// ========================

// ===========================================================
// onFilmReady
//
// ===========================================================
  onFilmReady() {
    return this._childReady();
  }
// ========================
//
// ========================

// ===========================================================
// _walk
//
// @param [Object] item
//
// ===========================================================
  _walk(item) {
    let caption;
    try {
      ({
        caption
      } = this.get(_a.items)[item]);
    } catch (e) {
      caption = _K.char.empty;
    }
    const opt = {
      className:_a.caption,
      anim: {
        start_on:_e.show,
        name:'flip-x'
      }
    };
    return this._caption.feed(SKL_Note(_a.base, caption, opt));
  }
}
__slider_vegas.initClass();
    //@debug "_play", @get(_a.items)[item]
module.exports = __slider_vegas;
