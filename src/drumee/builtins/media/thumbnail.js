const MEDIA_CLASS = "media-ui-content";
const { timestamp } = require("core/utils")


const _defaultClass = "media-thumbnail sharee-contact__thumbnail";

class __media_thumbnail extends LetcBox {
  constructor(...args) {
    this._initData = this._initData.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._makePreview = this._makePreview.bind(this);
    this.url = this.url.bind(this);
    this._imgCapable = this._imgCapable.bind(this);
    super(...args);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    let needle;
    super.initialize();
    this.viewOnly = true;
    this.iconType = localStorage.iconType || _a.vignette; //_a.vector
    if ((needle = this.mget(_a.filetype), [_a.hub, _a.document].includes(needle))) {
      this.iconType = _a.vector;
    }
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  _initData() {
    const ctime = this.mget(_a.createTime) || 0;
    const m = Dayjs.unix(ctime);
    this.mset({
      age: m.fromNow(),
      date: m.format(_K.defaults.date_format),
      size: Math.floor(this.mget(_a.filesize) / 1024) + ' ' + LOCALE.KILO_BYTE
    });
    return this.model.atLeast({
      date: Dayjs.unix(timestamp(1))
    });
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this._content = child;
        return child.on(_e.show, () => {
          return this._makePreview();
        });
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(Skeletons.Box.Y({
      className: MEDIA_CLASS,
      sys_pn: _a.content,
      signal: _e.ui.event,
      service: _a.open,
      uiHandler: [this],
      partHandler: this
    })
    );
    if (window.PointerEvent) {
      this.el.onpointereenter = this._pointerenter;
      this.el.onpointereleave = this._pointerleave;
    } else {
      this.el.onmouseenter = this._pointerenter;
      this.el.onmouseleave = this._pointerleave;
    }
  }

  /**
   * 
   * @returns 
   */
  _makePreview() {
    return this._content.el.innerHTML = require('./row/template/preview')(this);
  }

  /**
   * 
   * @returns 
   */
  url() {
    let format, url;
    if (this.mget(_a.category) === _a.vector) {
      format = _a.orig;
    } else {
      format = _a.vignette;
    }
    let { endpoint } = bootstrap()
    return url = `${endpoint}file/${format}/${this.mget(_a.nodeId)}/${this.mget(_a.hub_id)}`;
  }

  /**
   * 
   * @returns 
   */
  _imgCapable() {
    const c = this.mget(_a.capability) || "";
    if (c.match(/^r/)) {
      return 1;
    }
    return 0;
  }
}

module.exports = __media_thumbnail;    
