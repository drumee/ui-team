
const { fitBoxes } = require("@drumee/ui-essentials")
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");
const Rectangle = require('rectangle-node');
const CHANGE_RADIO = "change:radio";
const __utils = require("window/utils");

class __window_interact_player extends __utils {
  constructor(...args) {
    super(...args);
    this.change_size = this.change_size.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragStop = this._dragStop.bind(this);
    this._resizeStart = this._resizeStart.bind(this);
    this._resizeStop = this._resizeStop.bind(this);
    this._resizing = this._resizing.bind(this);
    this.constrainResize = this.constrainResize.bind(this);
  }
  /**
   *
   */
  static initClass() {
    this.prototype.radioChannel = _.uniqueId('wm-radio-');
    this.prototype.behaviorSet = {
      bhv_radio: 1,
    };
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    let pos;
    super.initialize(opt);
    this.model.set(_a.radio, Env.get("wm-radio"));
    this.isPlayer = 1;
    this.declareHandlers();
    this.model.set(_a.bubble, 1);
    this.raise = this.onChildBubble;

    this.offset = {
      left: 0,
      top: 0,
    };
    this._lastX = 0;
    // Deterministic cascade: every player centers on the same workspace
    // point, and the legacy anti-overlap layers never move them apart
    // (the `_lastX` term is never incremented and `anti_overlap` only
    // matches exact positions). Step each new player down-right like OS
    // windows so simultaneous opens stay individually reachable.
    try {
      const siblings = Wm.getWindowsPool().children.filter(
        (w) => w.isPlayer && !w.isDestroyed()
      ).length;
      this._stackShift = (siblings % 8) * 28;
    } catch (e) {
      this._stackShift = 0;
    }
    this.model.set({
      radio: Env.get("wm-radio"),
    });
    const width = window.innerWidth * 0.5;
    const height = window.innerHeight * 0.95;

    this._trigger = this.mget(_a.trigger);
    if (this._trigger != null) {
      if (_.isFunction(this._trigger.addPlayer)) {
        this._trigger.addPlayer(this);
      }
      pos = this._trigger.$el.offset();
      if ((pos.left + width) > window.innerWidth) pos.left = window.innerWidth - width;
      if ((pos.top + height) > window.innerHeight) pos.top = window.innerHeight - height;
      if (pos.top < 0) pos.top = 0;
      if (pos.left < 0) pos.left = 0;
    } else {
      pos = {
        left:
          (window.innerWidth - width) / 2 - Wm.$el.offset().left + this._lastX,
      };
      if (pos.top < 10) pos.top = 10;
    }
    this.style.set({
      margin: 0,
      padding: 0,
      width,
      height,
      position: _a.absolute,
      opacity: 0,
      transformOrigin: `-${this.offset.left}px -${this.offset.top}px`,
    });

    this.style.set(pos);
    this.size = {
      width,
      height: height - this.topbarHeight,
    };

    this.minimizeLocation = {
      top: window.innerHeight,
      left: window.innerWidth / 2 - 320,
    };

    if (Visitor.device() === _a.mobile) {
      this.size = Wm.size;
    }
    this.media = opt.media;
    if (opt.nid && !opt.media) {
      let media = Wm.getItemsByAttr(_a.nid, opt.nid)[0];
      if (media && media.isMfs) this.media = media;
    }
    if (!this.media) return;
    this.copyPropertiesFrom(this.media);
    this.mset({
      service: _e.raise,
    });

    this.parentFolder = opt.media.logicalParent;
    this.contextmenuSkeleton = "a";
    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);

  }

  /**
   *
   * @param {*} cmd
   */
  selector(enable) {
    if (typeof (Selector) === 'undefined') return;
    if (!Selector) return;
    if (enable) {
      Selector.enable();
    } else {
      Selector.disable();
    }
  }

  /**
   * 
   */
  failedToStart(reason, show = 1) {
    this.warn(`ERR:126 -- Failed to start`, this, reason);
    this.suppress();
    if (this.media) this.media.wait(0);
    if (show) Wm.alert(LOCALE.ERROR_NETWORK);
  }

  /**
   *
   */
  parseInfo(data) {
    this.info = null;
    if (!data) return false;
    if (_.isString(data)) {
      this.info = JSON.parse(data);
    } else {
      this.info = data;
    }
    if (_.isEmpty(this.info)) {
      return false;
    }
    if (_.isString(this.info)) {
      this.info = JSON.parse(this.info);
    }
    let metadata = this.metadata();
    try {
      let md = this.info.stats.metadata;
      if (_.isString(md)) {
        try {
          metadata = { ...metadata, ...JSON.parse(md) };
        } catch (e) { }
      } else {
        metadata = { ...metadata, ...md };
      }

      this.mset({ metadata });
      if (this.media) {
        this.media.mset({ metadata });
      }
    } catch (e) { }
    this.info.metadata = this.metadata();
    return this.info;
  }

  /**
   * 
   */
  fetchInfo() {
    const { nid, hub_id } = this.actualNode();
    const { keysel } = bootstrap(); let opt = {
      service: SERVICE.media.info,
      nid,
      hub_id,
      keysel
    };
    this.pollCount++;
    return this.fetchService(opt);
  }

  /**
   *
   * @param {*} cmd
   */
  change_size(cmd, max_size) {
    let anim, state;
    if (_.isInteger(cmd)) {
      this.model.set(_a.value, cmd);
      state = cmd;
    } else {
      this.model.set(_a.value, cmd.mget(_a.value));
      state = cmd.get(_a.state);
    }
    this.upsizing = state;
    if (state === 1 || max_size) {
      anim = max_size || this.max_size();
      this.position = this.$el.position();
      this.defaultSize = {
        width: this.$el.width(),
        height: this.$el.height(),
      };
    } else {
      anim = {
        top: this.position.top,
        left: this.position.left,
        width: this.defaultSize.width,
        height: this.defaultSize.height,
      };
      this.playSize = null;
    }

    this._prepareChange(anim);
    anim.onComplete = () => {
      this.setContentSize();
    };
    anim.ease = Expo.easeOut;
    TweenMax.to(this.$el, 0.5, anim);
  }

  /**
 * 
 * @param {*} attr 
 * @param {*} name 
 */
  update_name(attr, content) {
    let title = this.getPart('player-title');
    if (!title) return
    if (attr == _a.filename) {
      title.set({ content });
    }
  }

  /**
   * 
   * @returns 
   */
  setupInteract() {
    if (this.media) {
      this.media.wait(0)
    }

    return this.waitElement(this.el, () => {
      this.$el.draggable({
        distance: 5,
        //containment,
        scroll: true,
        start: this._dragStart,
        stop: this._dragStop,
        scroll: false,
        handle: `.${this.fig.group}__header`,
        cancel: ".slidebar",
        // Shield child iframes (e.g. OnlyOffice editor) so a fast drag over the
        // iframe doesn't lose mouse events and stall the drag.
        iframeFix: true,
      });
      this.setContainment();
      if (this.mget(_a.resizable) != _a.disable) {
        this.$el.resizable({
          start: this._resizeStart,
          stop: this._resizeStop,
          resize: this.constrainResize,
          aspectRatio: false,
          scroll: false,
          handles: "all",
        });
      }

      return (this.bbox = new Rectangle(
        this.$el.offset().left,
        this.$el.offset().top,
        this.$el.width(), //r.width,
        this.$el.height() // r.height
      ));
    });
  }

  /**
   * 
   * @param {*} anim 
   */
  _prepareChange(anim) {
    this.newSize = {
      width: anim.width,
      height: anim.height,
    };

    this.__content.children.each((c) => {
      if (_.isFunction(c.pause)) {
        c.pause("resize");
      }
    });
  }

  /**
   * 
   * @param {*} s 
   */
  setContentSize(s) {
    let scale;
    if (this.upsizing) {
      scale = this.newSize.width / this.size.width;
    } else {
      scale = this.size.width / this.newSize.width;
    }
    this.size = {
      width: this.newSize.width,
      height: this.newSize.height - this.topbarHeight,
    };
    this.__content.children.each((c) => {
      if (_.isFunction(c.resizeX)) {
        c.mset({
          ratio: scale,
        });
        c.resizeX(this.newSize.width);
      }
      if (_.isFunction(c.resume)) {
        c.resume(this, _a.idle);
      }
    });

    this.bbox = new Rectangle(
      this.$el.offset().left,
      this.$el.offset().top,
      this.$el.width(),
      this.$el.height()
    );
  }

  /**
   *
   * @param {*} msg
   * @param {*} stack
   */
  crash(msg, stack) {
    Wm.alert(msg);
    this.warn("GOT ERROR", stack);
    console.trace();
    this.suppress();
    this.media && this.media.wait(0);
  }

  /**
   * A player shows exactly one node, but the base class handles trash pushes
   * as a list window would: its "remove self" test compares the hub-prefixed
   * filepath the server sends against this widget's own filepath, and a
   * player's model (copied from the grid tile) never matches — so a file
   * deleted by someone else stayed happily on screen. Intercept the deletion
   * services here, where options.sender (who deleted it) is still available,
   * and freeze the view instead.
   */
  handleWsEvent(args = {}) {
    const { data, options = {} } = args || {};
    const service = options.service;
    const removals = _.compact(["media.remove", SERVICE.media.trash, "media.purge"]);
    if (service && removals.includes(service)) {
      const rows = _.isArray(data) ? data : [data];
      const hit = rows.find((r) => r && this._isViewedNode(r));
      if (hit) return this._freezeDeletedView(hit, options.sender);
    }
    return super.handleWsEvent(args);
  }

  /**
   * Does this deletion row concern the node on display? Exact nid match
   * covers the file itself; the path-prefix test covers a parent folder
   * being trashed. The prefix test reads whichever path field the model
   * happens to carry — when none is present we simply don't detect the
   * ancestor case, which is no worse than before.
   * @param {*} row one node from the media.remove payload
   */
  _isViewedNode(row) {
    let cur = {};
    try { cur = this.actualNode() || {}; } catch (e) { /* not fed yet */ }
    const curNid = cur.nid != null ? cur.nid : this.mget(_a.nid);
    if (row.nid != null && curNid != null && `${row.nid}` === `${curNid}`) {
      return true;
    }
    const curHub = cur.hub_id != null ? cur.hub_id : this.mget(_a.hub_id);
    if (row.hub_id == null || curHub == null) return false;
    if (`${row.hub_id}` !== `${curHub}`) return false;
    const own = this.mget("ownpath") || this.mget(_a.filepath) || this.mget("file_path");
    if (!own) return false;
    for (const p of [row.ownpath, row.filepath]) {
      if (p && p !== "/" && own.startsWith(`${p}/`)) return true;
    }
    return false;
  }

  /**
   * The node on display no longer exists: stop playback, blur the content
   * out of reach, and tell the user who deleted it. The window itself stays
   * up until they acknowledge (Ok → file-deleted-ack → goodbye) so the
   * explanation isn't a window vanishing under their cursor.
   * @param {*} row the deleted node's payload row
   * @param {*} sender who performed the deletion (from ws options)
   */
  _freezeDeletedView(row, sender) {
    if (this._fileGone) return;
    this._fileGone = 1;
    // Slideshow timers live on the window (image player); real <video>/<audio>
    // elements are stopped directly since each player wires playback its own way.
    try { if (_.isFunction(this.pause)) this.pause(); } catch (e) { /* no slideshow */ }
    for (const m of this.el.querySelectorAll("video,audio")) {
      try { m.pause(); } catch (e) { /* already stopped */ }
    }
    if (this.__content && this.__content.el) {
      const el = this.__content.el;
      el.style.filter = "blur(6px)";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
    }
    // Server-built fullname is `firstname + " " + lastname` even when the
    // lastname is empty — trim so the sentence doesn't read "by Name .".
    const who = sender && `${sender.fullname ||
      _.compact([sender.firstname, sender.lastname]).join(" ")}`.trim();
    const msg = who
      ? LOCALE.PREVIEW_FILE_DELETED_BY.format(who)
      : LOCALE.PREVIEW_FILE_DELETED;
    this.warning(msg, "file-deleted-ack");
  }

  /**
   * 
   */
  _showInfo() {
    const wrapperInfo = this.__wrapperInfo;
    if (wrapperInfo.el.dataset.state === _a.closed) {
      wrapperInfo.feed(this.information(this));
    } else {
      wrapperInfo.clear();
    }
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStart(e, ui) {
    this.selector(0);
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStop(e, ui) {
    this.selector(1);
    this.bbox = new Rectangle(
      this.$el.offset().left,
      this.$el.offset().top,
      this.$el.width(),
      this.$el.height()
    );
  }

  /**
   * Never leave the resize shield behind if the player is torn down mid-drag —
   * a stray full-viewport overlay would swallow every click.
   */
  onBeforeDestroy() {
    this._removeResizeShield();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _resizeStart(e, ui) {
    this.selector(0);
    this._sizeCtrl && this._sizeCtrl.changeState(0);
    this._addResizeShield();
    super._resizeStart(e, ui);
  }

  /**
   * jQuery UI tracks the resize via mousemove on the parent document. When the
   * cursor passes over a child iframe (e.g. the OnlyOffice editor) the iframe
   * captures the mouse events and the parent stops receiving them, so an edge
   * resize stutters/freezes on fast moves while corner handles (which drag
   * outward, away from the iframe) stay smooth. Lay a transparent full-viewport
   * shield over everything for the duration of the drag so every mousemove/up
   * lands on the parent document. (resizable has no `iframeFix` option — only
   * draggable does — so this has to be manual.)
   */
  _addResizeShield() {
    if (this._resizeShield) return;
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;background:transparent;cursor:inherit;";
    document.body.appendChild(d);
    this._resizeShield = d;
  }

  /**
   * Remove the resize shield added in _resizeStart.
   */
  _removeResizeShield() {
    if (!this._resizeShield) return;
    this._resizeShield.remove();
    this._resizeShield = null;
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _resizeStop(e, ui) {
    this._removeResizeShield();
    this.selector(1);
    this._image = null;
    this._video = null;
    this.__content.children.each(function (c) {
      if (_.isFunction(c.resizeStop)) {
        c.resizeStop(e, ui);
      }
    });
    this.bbox = new Rectangle(
      this.$el.offset().left,
      this.$el.offset().top,
      this.$el.width(), //r.width,
      this.$el.height() // r.height
    );
    this.defaultSize = {
      width: this.$el.width(),
      height: this.$el.height(),
    };
    this.setContainment();
    this.trigger(_e.resize, ui)
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _resizing(e, ui) {
    if (e.pageX < 0) {
      ui.size.width = this._lastWidth;
      ui.position.left = 0;
      return true;
    }
    if (e.pageY < 0) {
      ui.size.height = this._lastHeight;
      ui.position.top = this._minY;
      return true;
    }

    this._lastHeight = ui.size.height;
    this._lastWidth = ui.size.width;
  }

  /**
   * 
   */
  showSpinner() {
    if (this._spinner && !this._spinner.isDestroyed()) return;
    this.spinnerTimer = setTimeout(() => {
      this.append({ kind: 'spinner' });
      this._spinner = this.children.last();
      this.spinnerTimer = null;
    }, 300)
  }

  /**
   * 
   */
  hideSpinner() {
    if (this.spinnerTimer) {
      clearTimeout(this.spinnerTimer);
    }
    if (this._spinner) {
      this._spinner.suppress();
    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        if (!this.contentKind) break;
        child.on(_e.show, () => {
          Kind.waitFor(this.contentKind).then(() => {
            this.start(this.media);
          });
        });
        break;

      case "topbar":
        this.setupInteract();
        break;

      case _a.download:
        if (this.mget(_a.privilege) & _K.permission.read) {
          child.el.dataset.downloadable = 1;
        } else {
          child.el.dataset.downloadable = 0;
        }
        break;
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  /**
   * In a DMZ share, extracting content (download / print) without the share's
   * download grant is gated like any other beyond-grant action: the button stays
   * visible, but on click the sharebox routes anonymous visitors to sign-up/login
   * and signed-in non-members to Request Access (Figma flow). Returns true when it
   * gated (caller should stop). Outside DMZ, or with the grant, returns false.
   */
  _dmzGateDownload() {
    if (Visitor.inDmz && !this.canDownload()) {
      this.triggerHandlers({ service: 'dmz-request-download' });
      return true;
    }
    return false;
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.close:
        return this.goodbye();

      // Ok on the "file was deleted" overlay: the node is gone, so a window
      // showing its ghost has nothing left to offer — close it outright.
      case "file-deleted-ack":
        return this.goodbye();

      case _e.raise:
      case "desktop_info":
      case "change-crop":
      case "rotating":
      case "editing":
        return this.raise();

      case _e.minimize:
        return this.minimize(cmd);

      case "print":
        if (this._dmzGateDownload()) return;
        return this.printPdf();

      case _e.download:
        if (this._dmzGateDownload()) return;
        this.service = _a.idle;
        return this.download();

      case "info":
        return this._showInfo();

      case "change-size":
        return this.change_size(cmd);

      case "open-menu":
        return this.__content.children.last().loadMenu(this.__menuBox);

      default:
        this.raise();
        return this.warn(WARNING.method.unprocessed.format(service));
    }
  }


  /**
   * 
   * @param {*} size 
   * @param {*} cb 
   * @param {*} from 
   */
  display(size, cb, from = { scale: 0.15, opacity: 0 }) {
    // Raise once when the player first becomes visible. Re-raising from
    // every async load callback lets the last-LOADED window steal the top
    // spot, scrambling z-order by network timing when several files are
    // opened in a row.
    if (!this._raisedOnDisplay) {
      this._raisedOnDisplay = 1;
      this.raise();
    }
    let o = require("window/configs/default")();
    this.el.dataset.ready = 1;
    this.el.style.pointerEvents = "";
    if (this._isPlaying) this.size = this.max_size();
    this.size = this.size || o.imagePlayer;
    size = size || o.imagePlayer;
    let s = fitBoxes(this.size, size);
    let height = s.height + o.topbarHeight;
    let shiftY = this.mget("shiftY") || o.marginY || 0;
    let shiftX = this.mget("shiftX") || o.marginX || 0;
    const max_height = window.innerHeight - o.offsetY - 2 * o.marginY;
    // The workspace lives to the right of the desk sidebar, so the usable width
    // is the viewport minus the sidebar. Wm.$el (the WM container) starts at the
    // sidebar's right edge, so its left offset is the sidebar width — subtract
    // it so wide media never extends under the sidebar / past the workspace.
    const sidebar = Wm.$el ? Wm.$el.offset().left : 0;
    const max_width = window.innerWidth - 2 * o.marginX - sidebar;
    // Clamp both dimensions independently. Each branch scales width/height
    // together so the aspect ratio is preserved (letterbox). These must NOT be
    // `else if`: a wide media that overflows height can still overflow width
    // after the first clamp, so the width check has to run too.
    if (height > max_height) {
      s.width = (s.width * max_height) / height;
      height = max_height;
    }
    if (s.width > max_width) {
      height = (height * max_width) / s.width;
      s.width = max_width;
    }
    // Center the media within the workspace (the WM container, which sits below
    // the top header and to the right of the sidebar). `x`/`y` are relative to
    // the container's own origin — the player's offset parent — so we center
    // against the container's own width/height directly; no viewport-to-
    // container offset conversion is needed.
    const ws_width = Wm.$el ? Wm.$el.width() : window.innerWidth;
    const ws_height = Wm.$el ? Wm.$el.height() : window.innerHeight;
    let x = (ws_width - s.width) / 2 + (this._stackShift || 0);
    let y = (ws_height - height) / 2 + (this._stackShift || 0);
    let pos = {};
    let pin = this.mget("pin") || {};
    if (Visitor.isMobile()) {
      pos = { left: 0, top: 0 };
      s.width = window.innerWidth;
      height = window.innerHeight;
      x = 0;
      this._lastX = 0;
    } else {
      if (pin.width) {
        pos = pin;
      } else {
        pos = {
          top: y + shiftY,
          left: x + shiftX,
        };
      }
      this.anti_overlap(pos);
      if (pos.top < 10) pos.top = 10;
    }
    if (pin.height) height = pin.height;
    if (pin.width) s.width = pin.width;
    if (this.isReloading) {
      from.scale = 1;
      from.opacity = 0.6;
      this.isReloading = 0;
    }
    let to = {
      width: s.width,
      height: height,
      scale: 1,
      opacity: 1,
      ease: Expo.easeInOut,
      ...pos,
      onComplete: () => {
        this.$el.width(s.width);
        this.$el.height(height);
        if (_.isFunction(cb)) cb(this);
      },
    };
    if (to.left < 0) to.left = 50
    if (to.top < 0) to.top = 50
    if (!Visitor.isMobile()) {
      if (to.left + to.width > window.innerWidth)
        to.left = window.innerWidth - to.width;
      if (to.top + to.height > window.innerHeight)
        to.top = window.innerHeight - to.height;
    }
    TweenMax.fromTo(this.$el, 1.5, from, to);
  }

  /**
   * 
   */
  raise() {
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} origin 
   */
  onChildLoaded(child, origin) {
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} origin 
   */
  onChildBubble(child, origin) {
    this.triggerMethod(CHANGE_RADIO);
  }


}
__window_interact_player.initClass()
module.exports = __window_interact_player;
