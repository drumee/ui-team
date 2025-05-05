

const { timestamp, loadJS, toggleState } = require("core/utils")
const Rectangle = require('rectangle-node');
const OPEN_NODE = "open-node";
require("./skin");
const media_core = require("./core");
const { copyToClipboard } = require("core/utils")
class __media_interact extends media_core {
  constructor(...args) {
    super(...args);
    this.helper = this.helper.bind(this);
    this.dispatchUiEvent = this.dispatchUiEvent.bind(this);
    this._hover = this._hover.bind(this);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragging = this._dragging.bind(this);
    this._dragStop = this._dragStop.bind(this);
  }

  /**
   *
   * @param {*} reason
   * @param {*} timeout
   */
  moveForbiden(reason, timeout) {
    const d = document.getElementById(this._id + "-forbiden");
    _.delay(this.moveAllowed.bind(this), Visitor.timeout());
    if (d) {
      return;
    }
    this.el.dataset.raised = 1;
    this.content.$el.prepend(require("./template/forbiden")(this, reason));
  }

  /**
   *
   */
  moveAllowed() {
    const d = document.getElementById(this._id + "-forbiden");
    this.el.dataset.raised = 0;
    if (d != null) {
      d.remove();
    }
  }

  /**
   *
   */
  helper() {
    return require("./template/helper")(this);
  }

  /**
   *
   * @param {*} ui
   */
  initHelper(ui) {
    let rlPOS = -15;
    let zPOS = 50;
    ui.helper.empty();
    ui.helper.moving = this;
    this.ui = ui;
    const make_helper = (sibling) => {
      sibling.el.dataset.drag = _a.on;
      zPOS = zPOS - 1;
      const helper = sibling.$el.clone();
      helper.moving = sibling;
      rlPOS = rlPOS - 5;
      helper.css({
        position: _a.absolute,
        left: rlPOS,
        top: rlPOS,
        zIndex: zPOS,
        margin: 0,
        opacity: 1,
        width: _K.size.full,
        height: _K.size.full,
      });
      return helper;
    };
    let leader = make_helper(this);
    leader.css({ zIndex: zPOS + 10 });
    this.$el.addClass("leader");
    ui.helper.append(leader);
    const selected = Wm.getGlobalSelection();
    if (!selected.length) {
      return;
    }
    let t = require("./template/files-count")(this, selected.length);
    leader.append(t);
    let i = 0;
    let n = 5;
    this.el.dataset.drag = "leader";
    while (i < n && selected[i] != null) {
      if (selected[i] !== this) {
        ui.helper.append(make_helper(selected[i]));
      }
      i++;
    }
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStart(e, ui) {
    if (!this.allowedAction()) {
      this.moveForbiden(LOCALE.FORBIDEN_MOVE);
      this.disabled = true;
      return;
    }
    window.mouseDragged = true;
    this.el.dataset.drag = _a.on;
    this.initBounds();
    this.initHelper(ui);
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragging(e, ui) {
    if (!this.allowedAction()) {
      return;
    }
    this.selected = {};
    if (this.disabled) {
      return;
    }
    this.rectangle = new Rectangle(
      ui.offset.left,
      ui.offset.top,
      ui.helper.width() * 0.7,
      ui.helper.height() * 0.7
    );
    this.selfOverlapped = this.bbox.intersection(this.rectangle);
    Wm.capture(this);
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStop(e, ui) {
    if (this.isHoveringBin) {
      return;
    }

    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!this.allowedAction()) {
      this.moveAllowed();
      this.disabled = false;

      return;
    }
    this.el.dataset.drag = _a.off;
    const selected = Wm.getGlobalSelection();
    if (selected.length > 1) {
      for (let obj of Array.from(selected)) {
        obj.el.dataset.drag = _a.off;
      }
    }
    this.content.el.dataset.icontype = this.iconType;
    if (!Wm.insert(this) && this.over) {
      this.over.moveIn(this);
    }
    this.initBounds();
    window.mouseDragged = true;

    return true;
  }

  /**
   *
   * @param {*} delay
   */
  initBounds(delay) {
    let ox, oy;
    //if (delay == null) { delay = 700; }
    const o = this.$el.offset();
    try {
      ox = this.getLogicalParent().getOffsetX();
      oy = this.getLogicalParent().getOffsetY();
    } catch (error) {
      ox = 0;
      oy = 0;
    }
    this.self = null;
    this.left = null;
    this.right = null;
    this.over = null;
    this.bbox = new Rectangle(
      o.left + ox,
      o.top + oy,
      this.$el.width(),
      this.$el.height()
    );
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.mset(_a.bubble, 0);
    this.el.dataset.role = _a.root;
    this.el.onmouseenter = this._mouseenter;
    this.el.onmouseleave = this._mouseleave;
    this.service = _a.idle;
    this.el.onclick = this.dispatchUiEvent;
    try {
      const m = JSON.parse(this.mget(_a.metadata));
      if (
        (m._seen_ && !m._seen_[Visitor.id]) ||
        this.mget(_a.phase) === "notify"
      ) {
        this._unseen = 1;
        this.mset({
          notify: "",
        });
      }
    } catch (error) { }
    if (this.mget(_a.uiHandler) == null) {
      this.mset({
        uiHandler: [this.getLogicalParent()],
      });
    }
    let hub = 0;
    this.containsHub = this.mget(_a.filetype) == _a.hub;
    if (!_.isEmpty(this.mget(_a.hubs))) {
      hub = 1;
      this.containsHub = true;
    }
    this.feed(
      Skeletons.Box.X({
        className: `${this.fig.family}__container ${this.mget(_a.filetype)}`,
        sys_pn: _a.content,
        active: 0,
        dataset: {
          hub,
        },
      })
    );
    this.el.dataset.selected = this.mget(_a.state);
    this.el.setAttribute(_a.id, `media-${this._id}`);
    this.parent.off(_e.scroll, this.initBounds.bind(this));
    this.parent.on(_e.scroll, this.initBounds.bind(this));

    if (this.mget(_a.file)) {
      return;
    }

    this.model.set({
      rank: parseInt(this.mget(_a.rank)),
    });
    this.initURL();
    this.syncData();
  }

  /**
   *
   */
  defaultTrigger(e) {
    if (mouseDragged) {
      return;
    }
    this.service = this.mget(_a.service) || OPEN_NODE;
    this.model.set(_a.state, 0);
    this.el.dataset.selected = 0;
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.service = this.service;
    if (this.waitPreview()) return;
    this.wait(1, 1000);
    this.triggerHandlers(e);
    if (this.isHubOrFolder) {
      this.el.dataset.read = 0;
    } else {
      if (this._unseen) {
        this.markAsSeen();
      }
    }
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e);
    if (service != "tick") {
      let delay = 1000;
      if (this.mget(_a.filetype) === _a.document) delay = 5000;
      if (this._isWaiting || timestamp() - this._clickTimestap < delay)
        return;
    }
    this._clickTimestap = timestamp();
    switch (service) {
      case "open-creator":
      case "open-settings":
      case _a.outbound:
      case _a.inbound:
      case _a.access:
        this.service = service;
        this.triggerHandlers({ service });
        break;

      case "tick":
        this.tick(e);
        break;

      case "commit-rename": {
        this.commitRename(e);
        break;
      }
      case _e.rename: {
        this.prepareRename(e);
        break;
      }
      case "enable":
        this.toggleStatus();
        break;

      case "remove-upload":
      case "remove-minifyer":
      case "remove-transfer":
        this.removeMedia(e, service);
        break;

      case _e.download:
        break;

      case "wait-preview":
        Wm.alert(LOCALE.WAIT_FOR_CREATION.format(LOCALE.PREVIEW));
        break;

      case _a.href:
        let c = e.target;
        let url = null;
        while (c) {
          url = c.getAttribute(_a.url);
          if (url) break;
          c = c.parentElement;
        }
        let opt = Visitor.parseLocation(url);
        this.triggerHandlers({
          service: _e.launch,
          hub_id: opt.hub_id,
          kind: opt.kind,
        });
        this._pendingMeeting = opt.hub_id;
        this.restart();
        break;

      case undefined:
      case null:
        this.defaultTrigger(e);
        break;

      default:
        if (e.target.tagName.match(/^(input)$/i)) {
          return;
        }
        if (this.entry && !this.entry.isDestroyed()) {
          this.collection.remove(this.entry.model);
        }
    }

    return false;
  }

  /**
   *
   */
  _setupInteract() {
    const opt = {
      distance: 5,
      cursorAt: this.cursorPosition,
      start: this._dragStart,
      drag: this._dragging,
      stop: this._dragStop,
      opacity: 0.7,
      helper: this.helper,
      handle: `.${this.fig.family}__container`,
      containment: [0, 40, window.innerWidth, window.innerHeight - 40], //Desk.$el
      appendTo: _a.body, // Desk.$el #
      scroll: false,
    };
    const k = () => {
      this.$el.draggable(opt);
      this.initBounds();
    };
    this.waitElement(this.el, k);

    const mimetype = this.mget(_a.mimetype);
    if (mimetype != null && this.mget(_a.mimetype).match(/^audio/)) {
      this.model.set(_a.filetype, _a.audio);
    }

    this.content.el.dataset.capability = this.imgCapable();
    if (this._oldType != null) {
      this.$el.removeClass(this._oldType);
    }
    this.$el.addClass(this.mget(_a.filetype));
    this.$el.addClass(this.mget(_a.area));
    this._oldType = this.mget(_a.filetype);

    const id = this._id + "-notify-count";
    this.waitElement(id, () => {
      this._notify = document.getElementById(id);
      if (this._renameOnStart) {
        this.rename();
      }
    });

    const tt_id = this._id + "-filename";
    this.waitElement(tt_id, () => {
      this._longName = document.getElementById(tt_id);
      this._longName.onmouseenter = (e) => {
        if (e.buttons) return;
        this._filenameHover(_a.on, e);
      };
      this._longName.onmouseleave = (e) => {
        clearTimeout(this._timer.filename);
        this._filenameHover(_a.off, e);
      };
    });
  }

  /**
   *
   */
  _mobileInteract() {
    thiw.debug("MOBILE INTERACT : TBD");
  }

  /**
   *
   */
  setupInteract() {
    if (this.mget(_a.interactive) === 0) return;
    let filetype = this.mget(_a.filetype);
    let f = filetype == _a.vector ? _a.orig : _a.vignette;
    const { url } = this.actualNode(f);
    this.model.atLeast({ url });
    switch (filetype) {
      case _a.video:
      case _a.image:
      case _a.vector:
        this.fetchFile({ url })
          .then(async (blob) => {
            if (!blob) {
              this.warn(`Got no blob from ${url}`);
              return;
            }
            switch (blob.error) {
              case 404:
                this.mset(_a.capability, 0);
                this.content.el.innerHTML = this.innerContent(this);
                this._setupInteract();
                this.trigger("content-ready");
                this.warn(`File not found from ${url}. Auto removed from DOM`);
                return;//this.suppress();
              default:
                if (blob.error) return;
            }

            let u = URL.createObjectURL(blob);
            this.mset(_a.url, u);
            this.content.el.innerHTML = this.innerContent(this, u);
            this._setupInteract();
            this.trigger("content-ready");
          })
          .catch((e) => {
            this.mset({ filetype: _a.error });
            this.content.el.innerHTML = this.innerContent(this);
            this._setupInteract();
          });
        break;
      default:
        this.content.el.innerHTML = this.innerContent(this);
        this._setupInteract();
        this.trigger("content-ready");
    }
  }


  /**
   * 
   * @param {*} ui 
   * @returns 
   */
  moved(ui) {
    const dx = Math.abs(ui.originalPosition.left - ui.position.left);
    const dy = Math.abs(ui.originalPosition.top - ui.position.top);
    if (dx < 175 && dy < 50) {
      return false;
    }
    return true;
  }

  /**
   *
   */
  unselect() {
    if (!this.get(_a.state) && !this._renaming) return;
    this.model.unset("handSelect");
    this.setState(0);
    this.el.dataset.selected = this.mget(_a.state);
    this.el.dataset.phase = "";
    this.overed(_a.off);
    this._changeState("checkbox", "selected", this.mget(_a.state));
    const status = this.status || this.mget(_a.status);
    switch (status) {
      case _e.rename:
        this.requestRename();
        return;
    }

    if (this.entry && !this.entry.isDestroyed()) {
      this.requestRename();
    }
    try {
      if (this.children.last().mget(_a.sys_pn) === "contextmenu") {
        this.collection.pop();
      }
    } catch (error) { }

    this.trigger(_e.unselect);
  }

  /**
   * 
   * @param {*} opt 
   * @param {*} hide 
   * @returns 
   */
  select(opt, hide) {
    this.setState(1);
    this.el.dataset.selected = this.mget(_a.state);
    return this.mset(opt);
  }

  /**
   *
   * @param {*} value
   * @param {*} service
   */
  _createInput(value, opt) {
    if (value == null) {
      value = "";
    }
    const multiline = /\<br\>/.test(value);
    value = value.replace(/\<br\>/g, "\n");
    this.append(
      Skeletons.Textarea({
        className: `${this.fig.family}__input`,
        sys_pn: _a.entry,
        name: _a.lastname,
        volatility: 1,
        value,
        require: _a.any,
        bubble: 0,
        mode: _a.commit,
        rows: this.rowsCount(value),
        uiHandler: [this],
        partHandler: [this],
        ignoreEnter: true,
        preselect: 1,
        removeOnEscape: 1,
        ...opt
      })
    );

    const c = this.children.last();
    c.on(_e.keyup, (a) => {
      let r;
      if (!a.target) {
        return;
      }
      if (a.target.value.length > 12 || multiline) {
        r = 2;
      } else {
        r = 1;
      }
      return a.target.setAttribute(_a.data.row, r);
    });
    const id = this._id + "-filename";
    this._filename = null;
    this.waitElement(id, () => {
      this._filename = document.getElementById(this._id + "-filename");
      return (this._filename.style.visibility = _a.hidden);
    });
    c.once(_e.destroy, (a) => {
      return (this._filename.style.visibility = _a.visible);
    });

    RADIO_CLICK.trigger(_e.click);
  }

  /**
   * @param {Letc} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    let { nid, hub_id } = this.actualNode();
    switch (service) {
      case _e.rename:
        this.service = service;
        if (cmd.status == _e.Escape) {
          return;
        }
        if ([_a.commit, _e.Enter].includes(cmd.status)) {
          return this.requestRename(cmd);
        } else {
          const fname = cmd.mget(_a.value);
          this._nameConflict = null;
          if (this._nameExists(fname)) {
            return (this._nameConflict = fname);
          }
        }
        break;
      case 'add-folder':
        this.service = service;
        const filename = cmd.mget(_a.value);
        this.mset({ filename })
        if ([_a.commit, _e.Enter].includes(cmd.status)) {
          const filename = cmd.mget(_a.value);
          this.mkdir(filename);
          return;
        }
        break;

      case "direct-rename":
        return this.rename();

      case "set-as-homepage":
        return this.postService(SERVICE.media.set_homepage, ({ nid, hub_id }));

      case _e.download:
        return this.download();

      case _e.remove:
        return this.putIntoTrash();

      case "load-script":
        let o = this.actualNode(_a.orig);
        loadJS(o.url)
          .then(() => {
            Wm.alert(LOCALE.SCRIPT_X_LOADED_SUCCESSFULLY.format(o.publicUrl));
          })
          .catch((e) => {
            Wm.alert(e);
          });
        return;

      case _e.rotate:
        return this.rotate(cmd.mget(_a.value));

      case _e.lock:
        return this.lock();

      case _a.link:
        return this.viewerLink().then((url) => {
          copyToClipboard(url);
          Wm.acknowledge();
        });

      case "direct-url":
        let url = this.directUrl();
        if (this.mget(_a.area) == _a.share) {
          this.viewerLink().then((link) => {
            url = `${link}/${nid}/get`;
          });
          copyToClipboard(url);
          Wm.acknowledge();
          return;
        }
        if (!url) break;
        copyToClipboard(url);
        Wm.acknowledge();
        break;

      case _a.acknowledge:
        return this.collection.remove(cmd.model);

      case "new-media":
      case "new-messages":
        args.trigger = this;
        return this.triggerHandlers(args);

      case _a.properties:
        return this.triggerHandlers({ trigger: this, service });

      case "share-qrcode":
        if (/^(dmz|share)$/i.test(this.mget(_a.area))) {
          this.viewerLink().then((url) => {
            Wm.showQrCode(url);
          });
        } else {
          this.viewerLink().then((url) => {
            Wm.showQrCode(url + `/${this.mget(_a.nid)}/play`);
          });
        }
        break;
      case "show-qrcode":
        return this.fetchService(SERVICE.room.public_link, { nid, hub_id }).then((data) => {
          Wm.showQrCode(data.link);
        });

      case "seo-index":
        return this.postService(SERVICE.seo.create, { nid, hub_id });

      case _a.chat:
        args = {
          type: "channel",
          hub_id,
          nid,
        };
        return this.bubbleService(service, cmd._args);

      case _e.copy:
        Visitor.set({ clipboard: this });
        this.triggerHandlers({ service: "copy-media" });
        Wm.storeClipboard(_e.copy, this);
        break;

      case _e.paste:
        if (!this.isGranted(_K.permission.write)) return;
        let media = Visitor.get("clipboard");
        if (!media) return;
        this.moveIn(media, 1);
        break;

      case "shortcut":
        this.postService(SERVICE.media.link, {
          nid,
          hub_id,
          recipient_id: Visitor.id,
          pid: Visitor.get(_a.home_id),
        });
        break;

      case _e.upload:
        Wm.__fileselector.open((e) => {
          this.uploadInplace(e);
        });
        break;

      case "set-as-background":
        this.setAsBackground();
        break;

      case "open-file-location":
      case "restore-to-desk":
      case "delete-permanently":
        this.emitServiceToHandler(service, args);
        break;

      case "start-meeting":
        this.emitServiceToHandler(_e.start, args);
        break;

      case "copy-meeting-link":
        this.emitServiceToHandler(_e.copy, args);
        break;

      case "delete-meeting":
        this.emitServiceToHandler("delete-popup", args);
        break;

      case _e.settings:
        this.emitServiceToHandler("hub-settings", args);
        break;

      case "export-to-server":
      case "import-from-server":
        Wm.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this,
          },
          { explicit: 1, singleton: 1 }
        );
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * @param {*} service
   */
  emitServiceToHandler(service, args) {
    args.trigger = this;
    args.service = service;
    return this.triggerHandlers(args);
  }

  /**
   *
   */
  setAsBackground() {
    let opt = {
      wallpaper: {
        nid: this.mget(_a.nid),
        hub_id: this.mget(_a.hub_id) || this.mget(_a.ownerId),
        vhost: this.mget(_a.vhost),
      },
    };
    return this.postService(
      {
        service: SERVICE.drumate.update_settings,
        settings: opt,
        hub_id: Visitor.id,
      },
      { async: 1 }
    ).then((data) => {
      Visitor.set({ settings: JSON.parse(data.settings) });
      uiRouter.setWallpaper(Visitor.wallpaper());
    });
  }

  /**
   * hover without media, only mouse
   * @param {*} state
   */
  _filenameHover(state, e) {
    if (this.get(_a.state)) return;
    this._changeState(_a.filename, _a.hover, state);
    //}
    if (state == _a.on) {
      this._timer.filename = _.delay(() => {
        if (this._renaming) return;
        this._changeState(_a.tooltips, _a.hover, state);
      }, Visitor.timeout(800));
    } else {
      this._changeState(_a.tooltips, _a.hover, state);
    }
  }

  /**
   * hover without media, only mouse
   * @param {*} state
   */
  _hover(state, e) {
    if (!e) return;
    this.el.dataset.hover = state;
    this.content.el.dataset.hover = state;
    this._changeState("checkbox", _a.hover, state);
    this._changeState("remove", _a.hover, state);
    this._changeState("share", _a.hover, state);
    this._changeState("access", _a.hover, state);
    this._changeState("info", _a.hover, state);

    if (state == _a.off) {
      this._changeState(_a.tooltips, _a.hover, state);
    }

  }

  /**
   * overed with another media
   * @param {*} state
   */
  overed(state, moving) {
    if (moving) {
      moving.over = this;
      if (state !== _a.over) moving.over = null;
    }
    if (state !== _a.over) this.over = null;
    this.el.dataset.over = state;
    this.content.el.dataset.over = state;
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _mouseenter(e) {
    if (e.buttons) return;
    const n = this._notificationsBox;
    if (n != null && !n.isDestroyed()) {
      return;
    }
    const f = () => {
      this._hover(_a.on, e);
      this.enablePreview(true);
    };
    this._timer.hover = _.delay(f, 200);
  }

  /**
   * 
   * @param {*} e 
   */
  _mouseleave(e) {
    this.iconType = localStorage.iconType;
    this.content.el.dataset.icontype = this.iconType;
    clearTimeout(this._timer.hover);
    this._hover(_a.off, e);
    if (!this.imgCapable() || this.get(_a.filetype) === _a.hub) {
      this.iconType = _a.vector;
      this.content.el.dataset.icontype = this.iconType;
    }
  }

  /**
   * 
   * @returns 
   */
  _poke() {
    return this.anim([0.3, { scale: 1.2 }], [0.3, { scale: 1 }]);
  }

  /**
   * 
   * @returns 
   */
  isHandSelect() {
    return this.mget("handSelect");
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  tick(e) {
    this.status = _a.idle;
    this.model.set(_a.state, 1 ^ toggleState(this.mget(_a.state)));
    const state = this.mget(_a.state);
    this.el.dataset.selected = state;

    if (state) {
      this.service = _e.select;
      this.mset({
        handSelect: e.ctrlKey,
      });
    } else {
      this.service = _e.unselect;
      this.model.unset("handSelect");
      this.trigger(_e.unselect);
    }

    this.el.dataset.sharing = _a.off;
    this._changeState("checkbox", "selected", state);
    RADIO_BROADCAST.trigger(_e.select, this);
    return;
  }

  /**
   *
   */
  afterMoveIn(m, paste = 0, mode) {
    this.refreshNotification();
    m.getLogicalParent().syncOrder();
    this._poke();
    if (paste) return;
    if (m.isAttachment()) return;
    if (m.get(_a.actual_home_id) != this.get(_a.actual_home_id)) {
      mode = _a.copy;
    }
    if (
      m.get(_a.filetype) == _a.hub &&
      m.get(_a.home_id) == this.get(_a.home_id)
    ) {
      mode = _a.move;
    }
    if (mode == _a.copy) return;
    m.suppress();
  }
}
__media_interact.initClass();

module.exports = __media_interact;
