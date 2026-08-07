
const { fitBoxes } = require("@drumee/ui-essentials")
const __window_interact_player = require('player/interact');
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

/**
 * @class __player_audio
 * @extends __window_interact_player
 */
class __player_audio extends __window_interact_player {
  constructor(...args) {
    super(...args);
    this._onTrackEnd = this._onTrackEnd.bind(this);
    this._onPlay = this._onPlay.bind(this);
    this.nextTrack = this.nextTrack.bind(this);
    this.prevTrack = this.prevTrack.bind(this);
    this.changeTrack = this.changeTrack.bind(this);
  }

  static initClass() {
    this.prototype.isPlayer = 1;
    this.prototype.fig = 1;
  }

  /**
   * @param {Object} opt 
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('../skin');
    require('./skin');

    super.initialize(opt);
    this.model.set({
      ...opt.media.getAttr(),
      radio: Env.get('wm-radio'),
      service: _e.raise
    });

    this.info = null;
    this.information = require('../skeleton/file-info');

    this.playList = [];
    this._page = 1;
    this.buildPlayList();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.el.setAttribute(_a.id, this._id);
    let node = this.actualNode();
    this.fetchFile({ url: node.url })
      .then((blob) => {
        this.mset(_a.url, URL.createObjectURL(blob));
        this.fetchMediaInfo(() => {
          this.feed(require('./skeleton').default(this));
          if (this.media) this.media.wait(0);
          this._play();
        });
      })
  }

  /**
   * 
   */
  fetchMediaInfo(cb) {
    const { nid, hub_id } = this.actualNode();
    var opt = {
      service: SERVICE.media.info,
      nid,
      hub_id,
    };
    return this.postService(opt, { async: 1 }).then((data) => {
      if (_.isEmpty(data)) {
        Wm.alert(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
        return;
      }
      if (this.parseInfo(data)) {
        if (cb) { cb(); }
        return;
      }

      Wm.alert(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
    })
  }

  /**
   * @param {Object} data
  */
  parseInfo(data) {
    let r = super.parseInfo(data);
    if (!this.info) return null;

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
      case _a.audio:
        child.el.volume = 0.2;
        child.el.onplay = this._onPlay;
        child.el.onfullscreenchange = this._lock;
        // child.el.onpause = this._pause;
        child.el.onended = this._onTrackEnd;
        this.display(this.size);
        break;

      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * @param {*} cmd 
  */
  buildPlayList() {
    if (!this.parentFolder || this.playListCompiled) { return }
    this.playListCompiled = 1;
    this.playList = [];
    for (var a of this.parentFolder.getItemsByAttr(_a.filetype, _a.audio)) {
      if (a != this) {
        this.playList.push(a);
      }
    }

    if (!this.playList.length) { return false; }

    this._currentTrack = 0;
    for (let item of this.playList) {
      if (item === this.media) {
        return true;
      }
      this._currentTrack++;
    }
  }

  /**
   * Abstract
   */
  start() {
  }

  /**
   * @param {*} src
  */
  changeSource(src) {
    this.__audio.el.pause();
    this.spinner(1);
    this.media = src;
    const { nid, hub_id } = src.actualNode();
    this.mset({ nid, hub_id });
    return this.fetchMediaInfo(() => {
      this.media.wait(0);
      this.playNewTrack();
      this.loadNewTrackInfo();
      this.spinner(0);
      return;
    })
  }


  /**
  * 
  */
  _url() {
    let n = this.media || this;
    let { url } = n.actualNode(_a.audio);
    return url;
  }

  /**
   * @param {Letc} cmd
  */

  /**
   * The Details card is a separate WM window, so closing this player would
   * otherwise leave it orphaned over the desk.
   */
  onBeforeDestroy() {
    details.close(this);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(cmd) {
    const service = cmd.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _a.play:
        return this._play(cmd);

      case _a.next:
        return this.nextTrack();

      case _a.prev:
        return this.prevTrack();

      case 'loop':
        return this.loopTrack();

      case 'pause':
        return this._pause();

      case 'info':

        return details.open(this);

      // Move & Resize presets, from the shared topbar widget. Same snap
      // module the folder window and the other players use, so every window
      // snaps through one code path.
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

      default:
        // Gear-menu rows that act on the node itself go to the source MFS
        // view; everything else is player chrome and belongs to the base.
        if (DELEGATED_SERVICES.includes(service) && this._delegate(cmd)) return;
        super.onUiEvent(cmd);
    }
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

  /**
   * Window minimums the Move & Resize presets clamp to. Smaller than the
   * other players': this window is a compact transport, not a viewport.
   */
  _snapOpt() {
    return { minWidth: 280, minHeight: 200 };
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
   * 
  */
  _showInfo() {
    return this.fetchMediaInfo(() => {
      const wrapperInfo = this.__wrapperInfo;
      if (wrapperInfo.el.dataset.state === _a.closed) {
        wrapperInfo.feed(this.information(this));
      } else {
        wrapperInfo.clear();
      }
    })
  }


  /**
   * 
   * @param {*} cmd 
  */
  _play(cmd) {
    this.__audio.el.play();
  }

  /**
   * 
  */
  _pause() {
    this.__audio.el.pause();
  }

  /**
   * 
  */
  _onPlay() {
    const newTracks = this.parentFolder.getItemsByAttr(_a.filetype, _a.audio);
    if (this.playList.length == (newTracks.length - 1)) { return; }

    for (var n of newTracks) {
      if ((n.mget(_a.kind) != 'audio_player') && (!this.playList.includes(n))) {
        this.playList.push(n);
      }
    }

    return;
  }

  /**
   * 
   * @param {*} e 
   */
  _onTrackEnd(e) {
    this.spinner(1);
    return this.nextTrack();
  }

  /**
   * 
  */
  nextTrack() {
    this._currentTrack++;
    return this.changeTrack();
  }

  /**
   * 
  */
  prevTrack() {
    this._currentTrack--;
    return this.changeTrack();
  }

  /**
   * 
  */
  loopTrack() {
    const audioEl = this.__audio.el;
    if (audioEl.loop) {
      audioEl.loop = false;
      this.__musicLoop.el.dataset.active = _a.off;
    } else {
      audioEl.loop = true;
      this.__musicLoop.el.dataset.active = _a.on;
    }
    return;
  }

  /**
   * @param {*} cmd 
  */
  changeTrack() {
    if (this._currentTrack >= this.playList.length) { this._currentTrack = 0; }
    if (this._currentTrack < 0) { this._currentTrack = this.playList.length - 1; }

    this.media = this.playList[this._currentTrack];
    if (!this.media) return;
    const m = this.media.model.toJSON();
    delete m.kind;
    this.mset(m);
    return this.fetchMediaInfo(() => {
      this.spinner(0);
      this.playNewTrack();
      return this.loadNewTrackInfo();
    })
  }

  /**
   * 
  */
  playNewTrack() {
    const audioEl = this.__audio.el;
    audioEl.pause();
    audioEl.src = this._url();
    audioEl.load();
    audioEl.play();
    return;
  }

  /**
   * 
  */
  loadNewTrackInfo() {
    this.__musicMetadata.feed(require('./skeleton/metadata').default(this));
    return;
  }

}

__player_audio.initClass();

module.exports = __player_audio;
