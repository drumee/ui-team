
const { fitBoxes } = require("core/utils")
const { TweenMax, Expo } = require("gsap/all");
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

    const width = window.innerWidth * 0.5;
    const height = window.innerHeight * 0.95;

    this._trigger = this.mget(_a.trigger);
    if (this._trigger != null) {
      if (_.isFunction(this._trigger.addPlayer)) {
        this._trigger.addPlayer(this);
      }
      pos = this._trigger.$el.offset();
      if (pos.top < 0) pos.top = 0;
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
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _resizeStart(e, ui) {
    this.selector(0);
    this._sizeCtrl && this._sizeCtrl.changeState(0);
    super._resizeStart(e, ui);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _resizeStop(e, ui) {
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
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.close:
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
        return this.printPdf();

      case _e.download:
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
    this.raise();
    let o = require("window/configs/default")();
    this.el.dataset.ready = 1;
    if (this._isPlaying) this.size = this.max_size();
    this.size = this.size || o.imagePlayer;
    size = size || o.imagePlayer;
    let s = fitBoxes(this.size, size);
    let height = s.height + o.topbarHeight;
    let dy = o.marginY;
    let shiftY = this.mget("shiftY") || o.marginY || 0;
    let shiftX = this.mget("shiftX") || o.marginX || 0;
    const max_height = window.innerHeight - o.offsetY - 2 * o.marginY;
    const max_width = window.innerWidth - 2 * o.marginX;
    //if(s.width > max_width) s.width = max_width;
    if (height > max_height) {
      s.width = (s.width * max_height) / height;
      height = max_height;
      dy = 0;
    } else if (s.width > max_width) {
      height = (height * max_width) / s.width;
      s.width = max_width;
    }
    let x = (max_width - s.width) / 2 - Wm.$el.offset().left + this._lastX;
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
          top: dy - this.offset.top + shiftY,
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

module.exports = __window_interact_player;
