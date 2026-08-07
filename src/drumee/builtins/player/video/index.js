
const { fitBoxes } = require("@drumee/ui-essentials")
const __core = require('player/interact');
const snap = require('builtins/window/snap');
const details = require('builtins/player/widget/details');
const share = require('builtins/player/widget/share');
const renameInline = require('builtins/player/widget/topbar/rename');

// Gear-menu rows that act on the node rather than on the viewer. The MFS
// view this player was opened from implements all of them, so they are
// forwarded verbatim (see `_delegate`). Kept as an explicit allow-list: a
// catch-all would also swallow the player's own chrome events on their way
// to the base class.
const DELEGATED_SERVICES = [
  _e.copy,
  _e.remove,
  _a.chat,
  'chat-threads',
  'download-file-chat',
  'secure-share',
  'designation-link',
  'direct-url',
];

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
        this.isH264 = /h264/i.test(s.codec_name) ? 1 : 0;
        break;
      }
    }
    this.width = this.width || this.$el.width();
    this.height = this.height || this.$el.height();

    this._clampToViewport();

    this.ratio = this.height / this.width;
    this.$el.height(this.height);
    this.$el.width(this.width);
    return true;
  }

  /**
   * Keep the player within the browser window. A large video must never make
   * the player grow past the viewport, so we fit the native dimensions into a
   * box that also reserves room for the window margins, the top offset and the
   * draggable header (topbarHeight) — otherwise the header + video together can
   * still overflow. fitBoxes preserves the aspect ratio (letterbox), and we
   * only shrink: videos smaller than the box keep their natural size.
   */
  _clampToViewport() {
    const o = require("window/configs/default")();
    // Usable width excludes the desk sidebar: Wm.$el (the WM container) starts
    // at the sidebar's right edge, so its left offset is the sidebar width.
    const sidebar = Wm.$el ? Wm.$el.offset().left : 0;
    const max_w = window.innerWidth - 2 * o.marginX - sidebar;
    const max_h =
      window.innerHeight - o.offsetY - 2 * o.marginY - o.topbarHeight;
    if (this.width > max_w || this.height > max_h) {
      this.size = fitBoxes(
        { width: max_w, height: max_h },
        { width: this.width, height: this.height },
      );
      this.width = this.size.width;
      this.height = this.size.height;
    } else {
      this.size = {
        width: this.width,
        height: this.height,
      };
    }
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
    // Assigned on the INSTANCE, which shadows the prototype's
    // `onBeforeDestroy` — so the Details card has to be closed from here
    // too, or it is orphaned for any video that got as far as loading.
    this.onBeforeDestroy = () => {
      hls.stopLoad();
      details.close(this);
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

  /**
   * Forward a gear-menu row this player doesn't own to the source MFS view,
   * which implements the whole file-action vocabulary already. Returns false
   * when there's nothing to forward to, so the caller can fall through to
   * the base class rather than swallow the event.
   */
  _delegate(cmd, args) {
    const media = this.media;
    if (!media || media.isDestroyed() || !_.isFunction(media.onUiEvent)) {
      return false;
    }
    media.onUiEvent(cmd, args);
    return true;
  }

  /** Window minimums the Move & Resize presets clamp to. */
  _snapOpt() {
    return { minWidth: 320, minHeight: 240 };
  }

  /** Geometry the "center" preset restores to. */
  _defaultBounds() {
    return this._preZoomBounds || snap.snapshotBounds(this);
  }

  /**
   * Light up the preset the window now sits in. Dragging or resizing by hand
   * doesn't clear it; tracking every geometry change to undo a highlight is
   * not worth the listener.
   */
  _markSnapPreset(preset) {
    for (const name of ['full', 'left', 'right', 'center']) {
      const part = this[`__snap${name.charAt(0).toUpperCase()}${name.slice(1)}`];
      if (part && !part.isDestroyed()) {
        part.el.dataset.active = name === preset ? 1 : 0;
      }
    }
  }

  /**
   * This player had no `onUiEvent` of its own — everything fell through to
   * the base. It now claims the Move & Resize vocabulary the shared topbar
   * widget emits, and forwards the gear menu's file rows; anything else
   * still belongs to the base.
   */

  /**
   * Closes the Details card with the player. Note `loadPlayer` assigns an
   * instance-level `onBeforeDestroy` that shadows this one, so it closes
   * the card as well; this covers a player torn down before the video ever
   * loaded.
   */
  onBeforeDestroy() {
    details.close(this);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.model.get(_a.service);
    switch (service) {
      case 'window-zoom':
        snap.toggleZoom(this, this._snapOpt());
        // toggleZoom is a toggle: a second call restores, which is the
        // "center" preset visually.
        return this._markSnapPreset(this._zoomed ? 'full' : 'center');

      case 'window-tile-left':
        snap.tileToSide(this, 'left', this._snapOpt());
        return this._markSnapPreset('left');

      case 'window-tile-right':
        snap.tileToSide(this, 'right', this._snapOpt());
        return this._markSnapPreset('right');

      case 'window-reframe':
        snap.reframe(this, this._defaultBounds(), this._snapOpt());
        return this._markSnapPreset('center');

      // Rename edits the title in place instead of being forwarded: the
      // MFS view opens its editor on the tile in the folder grid, behind
      // this player, where nobody can see it.
      case 'direct-rename':
        return renameInline(this);

      // Share: only an external workspace can share a file out; from an
      // internal one the user is shown what to do instead.
      case 'secure-share':
        return share.click(this, cmd);

      // Get info: the node's own properties card, docked under this
      // player's header and closed with it (widget/details).
      case 'info':
        return details.open(this);

      default:
        if (DELEGATED_SERVICES.includes(service) && this._delegate(cmd)) return;
        return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __player_video;
