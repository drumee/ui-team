
const { fitBoxes } = require("core/utils")
const __core = require('player/interact');
class __player_video extends __core {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._lock = this._lock.bind(this);
    this._raise = this._raise.bind(this);
    this._onPlay = this._onPlay.bind(this);
    this.resizeStart = this.resizeStart.bind(this);
    this.resizeStop = this.resizeStop.bind(this);
    this.resizeX = this.resizeX.bind(this);
    this.resizing = this.resizing.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
  }


  /** */
  initialize(opt) {
    super.initialize(opt);
    require('../skin');
    require('./skin');
    this._vdoReady = false;
    this._id = _.uniqueId("vdo-player-");
    this.info = null
    this.information = require('../skeleton/file-info');
    this.model.atLeast({
      format: _a.slide,
      autostart: false,
      mute: true,
      innerClass: _K.char.empty,
      widgetId: this._id,
      fit: _a.height
    });
  }

  /**
   * 
   * @param {*} data 
   */
  async parseInfo(data) {
    let r = super.parseInfo(data);
    if (!this.info) return null;
    let streams = this.info.stream;
    if (this.info.orig && this.info.orig.streams) streams = this.info.orig.streams;
    for (let s of streams) {
      if (s.codec_type === _a.video) {
        this.width = s.coded_width;
        this.height = s.coded_height;
        if (/h264/i.test(s.codec_name)) {
          this.isH264 = 1;
        } else {
          this.isH264 = 0;
        }
        this.width = this.width || this.$el.width();
        this.height = this.height || this.$el.height();

        let max_w = window.innerWidth - 20;
        let max_h = window.innerHeight - 20;
        if (this.width > max_w || this.height > max_h) {
          this.size = fitBoxes(
            { width: window.innerWidth, height: window.innerHeight },
            { width: this.width, height: this.height },
          );
          this.width = this.size.width;
          this.height = this.size.height;
        } else {
          this.size = {
            width: this.width,
            height: this.height
          };

        }
        this.ratio = this.height / this.width;
        this.$el.height(this.height);
        this.$el.width(this.width);
        break;
      }
    }
    this.width = this.width || this.$el.width();
    this.height = this.height || this.$el.height();

    let max_w = window.innerWidth - 20;
    let max_h = window.innerHeight - 20;
    if (this.width > max_w || this.height > max_h) {
      this.size = fitBoxes(
        { width: window.innerWidth, height: window.innerHeight },
        { width: this.width, height: this.height },
      );
      this.width = this.size.width;
      this.height = this.size.height;
    } else {
      this.size = {
        width: this.width,
        height: this.height
      };

    }
    this.ratio = this.height / this.width;
    this.$el.height(this.height);
    this.$el.width(this.width);
    return true;
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.video:
        this.display(this.size, null);
        let id = child.attribute.get(_a.id);
        this.waitElement(id, () => { this.loadPlayer(id) });
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   */
  handleError(e) {
    this.warn("EEE:183", e);
  }
  /**
   * 
   */
  mould(data) {
    this.isReloading = 1;
    this.mset(data);
    this.onDomRefresh();
  }

  /**
   * 
   */
  loadContent() {
    this.spinner(0);
    this.__content.feed(require('./skeleton/content')(this));
  }

  /**
   * 
   */
  loadPlayer(id) {
    let Hls = require('hls.js');
    var video = document.getElementById(id);
    var hls = new Hls(this.playerConfigs);
    let { keysel, protocol, vdo } = bootstrap();
    if (this.cdnHost) {
      if (/^(http|file)/.test(this.cdnHost)) {
        base = this.cdnHost;
      } else {
        base = `${protocol}://${this.cdnHost}`

      }
    }
    const { nid, hub_id } = this.actualNode();
    let url = `${vdo}${nid}/${hub_id}/master.m3u8`;
    if (keysel) {
      url = `${url}?keysel=${keysel}`;
    }
    hls.loadSource(url);
    hls.attachMedia(video);
    this.onBeforeDestroy = () => {
      hls.stopLoad();
    }
  }

  /**
   * 
   */
  async onDomRefresh(initialLoad) {
    if (initialLoad) this.feed(require('./skeleton')(this));
    let data = {};
    if (/^http/i.test(this.mget(_a.src))) {
      data = await this.postService(SERVICE.media.get_node_attr, {
        src: this.mget(_a.src)
      });
      this._directSource = 1;
      this.mset(data);
    }
    this.el.setAttribute(_a.id, this._id);
    const { nid, hub_id } = this.actualNode();
    var opt = {};
    if (this.mget(_a.src)) {
      opt.src = this.mget(_a.src);
    } else {
      opt = { nid, hub_id };
    }
    opt.service = SERVICE.media.info;
    this.spinner(1);
    this.fetchService(opt, { async: 1 }).then((data) => {
      if (this.media) this.media.wait(0);
      if (_.isEmpty(data)) {
        Wm.alert(LOCALE.FILE_NOT_FOUND);
        return;
      }
      if (this.parseInfo(data)) {
        this.loadContent(data);
        return;
      }
      Wm.alert(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
    }).catch((e) => {
      if (this.media) this.media.wait(0);
      Wm.alert(e);
    })
  }

  /**
   * Abstrct
   */
  start() {
  }

  /**
   * 
   */
  _lock() {
    Env.set(_a.responsive, _a.lock);
    this._state = _a.idle;
  }


  /**
   * 
   * @returns 
   */
  _raise() {
    this.service = _e.raise;
    return this.trigger(_e.bubble);
  }

  /**
   * 
   */
  _onPlay() {
    this._raise();
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  resizeStart(e, ui) {
    return this._state = 'resize';
  }
  //jwplayer(@_id).pause()

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  resizeStop(e, ui) {
    this._state = _a.idle;
    this.updateSize(ui);
  }

  /**
   * 
   * @param {*} w 
   */
  resizeX(w) {
    this._state = 'resize';
    this.updateSize({ size: { width: w, height: w * this.ratio } }, 1);
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  resizing(e, ui) {
    this.updateSize(ui, 1);
  }

  /**
   * 
   * @param {*} state 
   * @returns 
   */
  pause(state) {
    this._state = 'paused';
    if (state != null) {
      return this._state = state;
    }
  }

  /**
   * 
   * @param {*} c 
   * @param {*} state 
   * @returns 
   */
  resume(c, state) {
    let s;
    if (state != null) {
      this._state = state;
    }
    return s = fitBoxes(c.size, this.size);
  }
}

module.exports = __player_video;
