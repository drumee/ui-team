
const Rectangle = require('rectangle-node');
const _default_class = "smart-image drumee-widget";
const { View } = Marionette;
require('./skin')
class __image_smart extends View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._load = this._load.bind(this);
    this._loadHighQuality = this._loadHighQuality.bind(this);
  }

  static initClass() {
    this.prototype.tagName = _K.tag.img;
    this.prototype.nativeClassName = _default_class;
    this.prototype.figName = "image_smart";
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    if (opt.nid && opt.hub_id) {
      let low = this.actualNode(_a.preview).fullUrl;
      let high = this.actualNode(_a.slide).fullUrl;
      this.mset({ low, high });
    } else if (opt.src) {
      this.model.atLeast({
        low: opt.src,
        high: opt.src
      });
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.el.id = this._id;
    let low = this.actualNode(_a.preview).fullUrl;
    let high = this.actualNode(_a.slide).fullUrl;
    const f = () => {
      const r = this.parent.el.getBoundingClientRect();
      this.bbox = new Rectangle(r.x, r.y, r.width, r.height);
      this._load();
      this.parent.on(_e.scroll, this._load);
    };
    return this.waitElement(this.el, f);
  }

  /**
   * 
   */
  _loadHighQuality(e) {
    const url = this.mget(_a.high) || this.mget(_a.src);
    if (!url) return;
    this.el.dataset.quality = _a.high;
    this.el.src = url;
    this._loaded = true;
    if (e.type === _e.load) {
      this.el.onload = null;
      let timer = setInterval(() => {
        if (this.el.naturalWidth || this.el.naturalHeight) {
          this.trigger(_e.loaded, this);
          clearInterval(timer)
        }
      }, 200)
    }

  }

  /**
   * 
   * @returns 
   */
  _load() {
    const r = this.el.getBoundingClientRect();
    const bbox = new Rectangle(r.x, r.y, r.width, r.height);
    if (!bbox.intersection(this.bbox)) {
      return;
    }
    if (this._loaded != null) {
      return;
    }

    this.el.onload = this._loadHighQuality;
    if (this.mget(_a.low)) {
      this.el.dataset.quality = _a.low;
      this.el.src = this.mget(_a.low);
      return;
    }
    const url = this.mget(_a.high) || this.mget(_a.src);
    if (url) {
      this.el.src = url;
    }
  }

  /**
   * 
   */
  reload(opt = {}) {
    let { url, high, src, low } = opt;
    src = src || url || high;
    if (_.isString(opt)) {
      src = opt;
      if (!src) return;
      this.mset({ high: src });
      this.el.src = src;
      return;
    }
    this.mset(opt);
    this.el.onload = this._loadHighQuality;
    if (low) {
      this.el.dataset.quality = _a.low;
      this.el.src = low;
      return;
    }
    this.el.src = src;
  }
}
__image_smart.initClass();
module.exports = __image_smart;
