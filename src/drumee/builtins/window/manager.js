// require("jquery-ui/ui/widgets/droppable");
// require("jquery-ui/ui/widgets/resizable");

if (window.innerWidth > 900) {
  // touch-punch reads $.ui.mouse.prototype at module load time; load the
  // mouse widget first so it isn't undefined.
  require("jquery-ui/ui/widgets/mouse");
  require("jquery-ui-touch-punch");
}
const Rectangle = require("rectangle-node");
const mfsInteract = require("./interact");
const pseudo_media = require("media/pseudo");
const { xhRequest, dataTransfer } = require("@drumee/ui-essentials");
const { createQrcode } = require("@drumee/ui-essentials");
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

class __window_manager extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.showContent = this.showContent.bind(this);
    this.hideIcons = this.hideIcons.bind(this);
    this.showIcons = this.showIcons.bind(this);
    this._kbHandler = this._kbHandler.bind(this);
  }

  /**
   *
   */
  static initClass() {
    this.prototype.isFolder = 1;
    this.prototype.radioChannel = _.uniqueId("wm-radio-");
    this.prototype.events = {
      click: "_click",
      dragenter: "fileDragEnter",
      dragover: "fileDragOver",
    };
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin/window");
    super.initialize(opt);
    window.Wm = this;
    if (this.mget("desk")) {
      this._desk = this.mget("desk");
    } else if (window.Desk) {
      this._desk = window.Desk;
    }
    this.model.atLeast({
      privilege: _K.privilege.owner,
    });

    this.mset({
      hub_id: Visitor.id,
      home_id: Visitor.get(_a.home_id),
    });

    this._timeout = false;
    this._uid = Visitor.id;
    this.clipboard = {};
    this.pseudo_media = new pseudo_media();
    this.pseudo_media.parent = this;
    this.offsetY = -115;
    this._dlFifo = [];
    this.declareHandlers();
    this._pendingStart = {};
  }

  /**
   *
   */
  _kbHandler(e) {
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  maxHeight(item) {
    return (
      this.iconsList.$el.height() +
      this.iconsList.$el.offset().top -
      item.$el.offset().top -
      10
    );
  }

  /**
   *
   * @param {*} client
   */
  getContactStatus(id) { }

  /**
   *
   * @param {*} opt
   * @returns
   */
  info(opt) {
    if (_.isString(opt)) {
      return this.getWindowsPool().append({
        kind: "window_info",
        message: opt,
      });
    } else {
      return this.getWindowsPool().append({
        kind: "window_info",
        body: opt,
      });
    }
  }

  /**
   *
   * @param {*} e
   */
  fileDragEnter(e) {
    this.pseudo_media.dragEnter(e);
  }

  /**
   *
   * @param {*} e
   */
  fileDragOver(e) {
    this.capture(this.pseudo_media.dragOver(e));
  }

  /**
   *
   */
  handleUpload() {
    let target = this.getActiveWindow();
    return this.__fileselector.open((e) => {
      if (target && target !== this) target.raise();
      this.upload(e);
    });
  }

  /**
   *
   * @param {*} e
   * @param {*} token
   * @returns
   */
  upload(e, token) {
    let target;
    if (e && e.target.dataset.partname == "ref-bin") {
      return; // Drop over trash bin
    }
    if (this._target && this._target.isWallpaperSettings) {
      return;
    }
    if (this._target && !_.isEmpty(this._target.captured)) {
      if (this.captured && this.captured != this._target.captured) {
        for (let k in this.captured) {
          const v = this.captured[k];
          if (v != null) {
            if (_.isFunction(v.resetMotion)) {
              v.resetMotion();
            }
            if (_.isFunction(v.overed)) {
              v.overed(_a.off);
            }
          }
        }
      }

      this.captured = this._target.captured;
    }
    if (this.captured && this.captured.over) {
      // Drop onto a folder tile -> upload INTO that folder.
      const dest = this.captured.over;
      if (e.type === _e.drop) {
        this._bundleDrop(dest, e, token);
        if (dest.on) dest.on(_e.reset, () => (this.captured.over = null));
        setTimeout(this.resetShift.bind(this), 300);
        return;
      }
      target = dest;
      target.uploadInplace(e);
      target.on(_e.reset, () => {
        return (this.captured.over = null);
      });
      setTimeout(this.resetShift.bind(this), 300);
      return;
    }

    switch (e.type) {
      case _e.change:
        target = this.getActiveWindow();
        break;
      case _e.drop:
        target = target || this._target || this.getActiveWindow() || this;
        if (!target.el) {
          return;
        }
        target.el.dataset.over = _a.off;
        break;
      default:
        target = this._target || this.getActiveWindow();
        break;
    }

    if (target == null) {
      Butler.say(LOCALE.WRONG_DROP_AREA);
      return;
    }

    // Drag-drop (file + folder, mixed) -> route through the proven make_dir-first
    // bundle orchestrator (BundleJob) instead of legacy per-pseudo upload.
    if (e.type === _e.drop) {
      this._bundleDrop(target, e, token);
      setTimeout(this.resetShift.bind(this), 300);
      return;
    }

    this.sendTo(target, e, 0, token);
    setTimeout(this.resetShift.bind(this), 300);
  }

  /**
   * Read a file/folder drop into a stable BundleEntry tree and run it through the
   * bundle orchestrator (make_dir-first, sequential upload, shared-hub safe).
   * Handles mixed file+folder drops uniformly. Falls back to the legacy sendTo
   * for non-file drops (text, links).
   * @param {*} target  drop destination (folder window or folder tile)
   * @param {*} e       the drop event
   * @param {*} token
   */
  async _bundleDrop(target, e, token) {
    let transfer;
    try {
      transfer = dataTransfer(e); // synchronous: captures FileSystemEntry items NOW
    } catch (err) {
      transfer = null;
    }
    if (!transfer || (!transfer.files.length && !transfer.folders.length)) {
      if (target && target.acceptMedia) this.sendTo(target, e, 0, token); // non-file drop -> legacy
      return;
    }
    const destNid = (target && typeof target.getCurrentNid === "function") ? target.getCurrentNid() : null;
    const hub_id = (target && typeof target.mget === "function") ? target.mget(_a.hub_id) : null;
    const Entry = require("media/bundle/entry");
    const UploadProgress = require("./upload-progress");
    let roots;
    try {
      roots = await Entry.entriesFromDataTransfer(transfer);
    } catch (err) {
      this.warn("drop read failed", err);
      roots = [];
    }
    if (!roots.length) {
      Butler.say(LOCALE.UPLOAD_ERROR || "Nothing to upload");
      return;
    }
    UploadProgress.runBundle(roots, destNid, hub_id, (target && target.acceptMedia) ? target : null);
  }

  /**
   *
   * @param {*} moving
   * @returns
   */
  selectWindow(moving) {
    let target = null;
    let max = 1;
    for (let c of Array.from(this.getWindowsPool().children.toArray())) {
      c.el.dataset.selected = 0;
      c.el.dataset.over = _a.off;
      if (c.mget(_a.minimize)) continue;
      if (c.isWallpaperSettings) return c;
      if (c.acceptMedia) {
        if (moving.intersect(c) > 0.7) {
          if (c.isChatWindow) {
            if (moving.mget("isAttachment")) {
              return null;
            }
          }
          const z = parseInt(c.getActualStyle(_a.zIndex));
          if (z > max) {
            target = c;
            max = z;
          }
        }
      } else if (c.isPlayer) {
        if (moving.intersect(c) > 0) {
          return null;
        }
      }
    }
    if (target != null) {
      target.el.dataset.selected = 1;
      target.el.dataset.over = _a.on;
      if (this._lastTarget == null || this._lastTarget !== target) {
        target.syncBounds();
        this._lastTarget = target;
      }
      if (this._lastTarget != null) {
        this._lastTarget.resetShift();
      }
      if (!target.isDestroyed()) return target;
    }
    return this;
  }

  /**
   *
   * @param {*} view
   * @returns
   */
  release(view) {
    this._currentBrowser = null;
    return (() => {
      const result = [];
      for (let c of Array.from(this.getWindowsPool().children.toArray())) {
        if (!c.isDestroyed() && _.isFunction(c.feed)) {
          this._currentBrowser = c;
          break;
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  /**
   *
   * @param {*} w
   * @param {*} type
   * @returns
   */
  responsive(w, type) {
    if (this._isResizing || !this.iconsList || this.getViewMode() === _a.row) {
      return;
    }
    w = window.innerWidth - (window.innerWidth % 62);
    _K.docViewer.width = Math.min(DEFAULT_WIDTH, window.innerWidth - 5);
    _K.docViewer.height = Math.min(DEFAULT_HEIGHT, window.innerHeight);
    _K.docViewer.width = Math.min(DEFAULT_WIDTH, window.innerWidth - 5);
    _K.docViewer.height = Math.min(DEFAULT_HEIGHT, window.innerHeight);

    const h = window.innerHeight - 125;
    const dw = w - this.iconsList.$el.width();
    const dh = h - this.iconsList.$el.height();
    this.syncGeometry();
    if (this.isWm) {
      this.$el.css({ width: "" });
    }
    this.getWindowsPool().children.each((c) => {
      const cx = c.$el.offset().left;
      const cy = c.$el.offset().top;
      const cw = c.$el.width();
      const ch = c.$el.height();
      const max_w = window.innerWidth - 30;
      const max_h = window.innerHeight - 90;
      let opt = {};
      if (c._moved) {
        const r = new Rectangle(0, 0, w, h);
        const rc = new Rectangle(cx, cy, cw, ch);
        if (r.intersection(rc) && cw < max_w) {
          return;
        }
      }

      if (c.mget(_a.kind) === "audio_player") {
        let o = c.$el.position();
        if (Visitor.isMobile()) {
          o.left = 0;
          o.top = 0;
        }
        c.$el.css({ left: o.left + dw });
        c.$el.css({ top: o.top + dh });
      }
      //c.syncGeometry();
      const right = cx + cw;
      let d = 0;
      if (cw > max_w) {
        opt = {
          left: 10,
          width: max_w,
        };
      } else {
        d = right - window.innerWidth;
        if (d >= 0) {
          let left = c.$el.position().left - d;
          if (left < 0) {
            left = 0;
          }
          opt = { ...opt, left };
        }
      }

      //bottom = cy #+ ch
      if (ch > max_h) {
        opt = { ...opt, height: max_h };
      } else {
        let d = cy - window.innerHeight;
        if (d >= 0) {
          let top = c.$el.position().top - d;
          if (top < -125) {
            top = -125;
          }
          opt = { ...opt, top };
        }
      }
      c.$el.css(opt);
      c.style.set(opt);
      if (c.syncGeometry) {
        c.syncGeometry();
      }
      if (c.setupInteract) {
        c.setupInteract();
      }
    });
  }

  /**
   *
   * @param {*} c
   * @param {*} args
   * @returns
   */
  onChildBubble(c, args) {
    if (args == null) {
      args = {};
    }
    if ([_e.data, _a.idle].includes(c.status) || args.service) {
      return;
    }
    if (c.mget(_a.bubble) == _a.none) return;
    this.onUiEvent(c);
  }

  /**
   *
   * @param {*} v
   * @returns
   */
  addWindow(v) {
    return this.getWindowsPool().append(v);
  }

  /**
   *
   */
  addFolder(opt) {
    const target = this.getActiveWindow(1);
    const folder = {
      ...opt,
      kind: target._getKind(),
      filetype: _a.folder,
      phase: _a.creating,
      logicalParent: target,
      pid: target.getCurrentNid(),
      hub_id: target.mget(_a.hub_id),
      service: "add-folder",
    };
    target.insertMedia(folder);
    target.scrollToBottom();
  }

  /**
   *
   * @param {*} mkdir
   * @returns
   */
  getActiveWindow(mkdir) {
    if (mkdir == null) {
      mkdir = 0;
    }
    for (let c of Array.from(this.getWindowsPool().children.toArray())) {
      if (c.acceptMedia && !c.isDestroyed()) {
        if (c.mget(_a.state)) {
          if (!mkdir) {
            return c;
          }
          if (
            [_a.folder, "website", "team", _a.sharebox].includes(c.fig.name)
          ) {
            return c;
          }
        }
      }
    }
    return this;
  }

  /**
   *
   */
  getActivePlayer() {
    for (let c of Array.from(this.getWindowsPool().children.toArray())) {
      if (c.isPlayer && c.mget(_a.state) && !c.isDestroyed()) {
        return c;
      }
    }
  }

  /**
   *
   * @param {*} opt
   */
  download(opt) {
    let s, p;
    s = this.getGlobalSelection();
    p = this.getActivePlayer();
    if (p != null) {
      s.push(p);
    }
    // }

    if (_.isEmpty(s)) {
      Butler.alert(LOCALE.PLZ_SELECT_FILES_TO_DOWNLOAD, {
        title: LOCALE.ALERT_DOWNLOAD,
        button: "OK",
      });
      return;
    }

    if (s.length === 1 || _.some(s, (e) => e.isHandSelect())) {
      var f = () => {
        const v = s.shift();
        if (v == null) {
          return;
        }
        v.once(_e.loaded, f);
        return v.download();
      };
      f();
      return;
    }

    this.getWindowsPool().append({
      kind: "window_downloader",
      token: this.mget(_a.token),
      nodes: s,
    });
  }

  /**
   *
   * @returns
   */
  getGlobalSelection() {
    let f = [];
    this.getWindowsPool().children.each((w) => {
      if (_.isFunction(w.getLocalSelection)) {
        return (f = f.concat(w.getLocalSelection()));
      }
    });
    f = f.concat(this.getLocalSelection());

    return f;
  }

  /**
   *
   * @param {*} child
   * @param {*} pn
   * @returns
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.list: //"window-wrapper"
        child.once(_e.eod, () => {
          this.trigger("top-level-ready");
        });
        return this.buildIconsList(child, pn);
      case "windows-layer":
      case "headless-layer":
        if (pn === "windows-layer") this.windowsLayer = child;
        if (pn === "headless-layer") this.headlessLayer = child;
        this._responsive = () => {
          const f = () => {
            this.responsive();
          };
          setTimeout(f, 500);
        };
        RADIO_BROADCAST.on(_e.responsive, this._responsive);
        child.onAddKid = (c) => {
          c.once(_e.destroy, () => {
            const last = child.children.last();
            if (Visitor.parseModule().includes("dmz")) {
              location.host = Host.get(_a.domain);
            }
            if (last != null && _.isFunction(last.raise)) {
              return last.raise();
            }
          });
          child.el.style.width = "";
          child.el.style.height = "";
          if (c.get(_a.kind) === "window_search") {
            return;
          }
          // Prevent Overlapping
          let opt = require("window/configs/default")();
          let w = parseInt(c.style.get(_a.width)) || opt.iconWidth;
          let h = parseInt(c.style.get(_a.height)) || opt.iconHeight;
          let cr = new Rectangle(
            c.style.get(_a.top),
            c.style.get(_a.left),
            w,
            h,
          );
          let i = 1;
          for (var k of child.children.toArray()) {
            if (c.cid !== k.cid) {
              let kr = new Rectangle(
                k.style.get(_a.top),
                k.style.get(_a.left),
                w,
                h,
              );
              if (cr.intersection(kr)) {
                let o = {
                  shiftX: 2 * opt.marginX * i,
                  shiftY: 2 * opt.marginY * i,
                };
                c.model.set(o);
                i++;
              }
            }
          }
        };
        break;
      case "wrapper-tooltips":
        return (this.tooltipsWrapper = child);
    }
  }

  /**
   *
   * @param {*} kind
   * @returns
   */
  getItemByKind(kind) {
    for (let c of Array.from(this.getWindowsPool().children.toArray())) {
      if (c.mget(_a.kind) === kind) {
        return c;
      }
    }
    return null;
  }

  /**
   *
   * @param {*} kind
   * @returns
   */
  countItemsByKind(kind) {
    let c = 0;
    for (let child of Array.from(this.getWindowsPool().children.toArray())) {
      if (child.mget(_a.kind) === kind) {
        c++;
      }
    }
    return c;
  }

  /**
   *
   * @param {*} c
   * @param {*} opt
   * @returns
   */
  getFileposition(c, opt) {
    const m = c.model;
    const width = this.$el.width();
    const height = this.$el.height();
    let p = {
      width: _K.docViewer.width, //_K.browser.width
      height: _K.docViewer.height, //_K.browser.height
      zIndex: 1000 + this.getWindowsPool().collection.length,
    };

    if (opt === _a.document) {
      p.left = width / 2 - p.width / 2;
      p.top = height / 2 - p.height / 2;
      return p;
    } else {
      p = c.$el.position();
      if (opt) {
        p.height = height - 20;
      }
      if (_K.docViewer.width > width) {
        p.left = 0;
      } else {
        p.left = (width - _K.docViewer.width) / 2;
        if (p.left < 0) {
          p.left = 0;
        }
      }
      if (_K.docViewer.height > height) {
        p.top = 0;
      } else {
        p.top = (height - _K.docViewer.height) / 2;
        if (opt) {
          p.top = -60;
        } else if (p.top < 0) {
          p.top = 0;
        }
      }
      if (
        m.get(_a.area) === _a.private ||
        m.get(_a.service) === "quick-share"
      ) {
        p.width = _K.size.full;
        p.height = _K.size.full;
        p.top = -60;
      }

      if (m.get(_a.area) === _a.public) {
        p.width = this.$el.width() - 50;
        p.height = this.$el.height() - 50;
        p.top = 0;
        p.left = 25;
      }
      return p;
    }
  }

  /**
   *
   * @param {*} c
   * @returns
   */
  getWindowPosition(c) {
    let p, s;
    p = c.$el.offset();
    if (Visitor.isMobile()) {
      p.left = 0;
      p.top = 0;
      p.height = window.innerHeight - 70;
      p.width = window.innerWidth;
      return p;
    }

    const m = c.model;
    if (m.get(_a.position) === _a.auto) {
      p = {
        left: window.innerWidth / 2 - _K.docViewer.width / 2,
        top: this.offsetY + 50,
      };
      return p;
    }

    const width = this.$el.width();
    const height = this.$el.height();
    p = c.$el.offset();
    const pm = { ...p };
    let y = p.top;
    p.width = _K.docViewer.width;
    p.height = _K.docViewer.height;
    p.zIndex = 1000 + this.getWindowsPool().collection.length;
    if (p.left + _K.docViewer.width > width) {
      p.left = width - _K.docViewer.width - 52;
      if (p.left < 0) {
        p.left = 0;
      }
    }
    if (p.top + _K.docViewer.height > height) {
      p.top = height - _K.docViewer.height;
      if (p.top < 0) {
        p.top = 0;
      }
    }

    let rect_window = new Rectangle(p.left, p.top, p.width, p.height);
    const rect_media = new Rectangle(
      pm.left,
      pm.top,
      c.$el.width(),
      c.$el.height(),
    );
    if (pm.top > height / 2) {
      s = -10;
    } else {
      s = 10;
    }
    let i = rect_window.intersection(rect_media);
    let area = 0;
    if (i) {
      area = i.area() / rect_media.area();
    }
    p.top = y + 15;
    let offset = window.innerHeight - (p.top + p.height + 50);
    if (offset < 0) p.top = p.top + offset;
    return p;
  }

  // ===========================================================
  //
  // ===========================================================
  getPlayerPosition(kind, sync) {
    if (sync == null) {
      sync = 0;
    }
    let x = 0;
    let y = 0;
    let i = 0;
    let row = 0;
    let col = 0;
    let items = 0;
    const item_width = 376;
    const width = this.iconsList.$el.width();

    const height = this.iconsList.$el.height() - (this.offsetHeight || 80);
    const space = width % item_width;
    for (let c of Array.from(this.getWindowsPool().children.toArray())) {
      if (c.mget(_a.kind) === kind) {
        i++;
        items++;
        col++;
        if (width - item_width * i < item_width) {
          i = 0;
          col = 0;
          row++;
        }
      }
    }
    x = space / 2 + col * item_width;
    y = row * 58;
    const r = { left: x, top: height - y, height: 54 };
    if (Visitor.isMobile()) {
      r.left = 0;
      r.top = 0;
    }
    return r;
  }

  /**
   *
   * @param {*} c
   * @param {*} opt
   * @returns
   */
  getWindowPreset(c, opt) {
    let home_id;
    let nid = 0;
    const m = c.model;
    if (m.get(_a.filetype) !== _a.hub) {
      home_id = m.get(_a.home_id);
      nid = m.get(_a.nodeId);
    } else {
      home_id = m.get("actual_home_id");
    }
    const item = {
      area: m.get(_a.area),
      nid,
      filename: m.get(_a.filename),
      filetype: m.get(_a.filetype),
      hub_id: m.get(_a.hub_id),
      home_id,
      name: m.get(_a.filename),
      vhost: m.get(_a.vhost),
      holder_id: m.get(_a.holder_id),
      privilege: ~~m.get(_a.privilege),
      useKeyEvent: 1,
      style: this.getWindowPosition(c),
      service: "open-node",
      state: m.get(_a.state),
      trigger: c,
      uiHandler: [this],
      media: c,
      radio: _a.on,
      state: _a.on,
      ...opt,
    };

    const state = m.get(_a.state);
    if (state != null) {
      item.state = state;
    }
    return item;
  }

  /**
   *
   * @param {*} media
   * @param {*} args
   */
  openManager(media, args) {
    this.confirm({
      title: LOCALE.ACTION_NOT_PERMITTED,
      message: args.message,
      cancel_type: "secondary forbiden",
      cancel: LOCALE.OK, //LOCALE.CLOSE,
      cancel_action: _e.close,
      buttonClass: "forbidden",
      maxsize: 2,
      mode: "hbf1",
    })
      .then(() => {
        this.__wrapperModal.clear();
        this.openHubManager(media, "openSettings");
      })
      .catch((e) => {
        this.__wrapperModal.clear();
      });
  }

  /**
   * Returns the window container for the current mode:
   * - Headless mode (workspace opened from the sidebar): windows are added
   *   to headlessLayer, which hosts the singleton headless window_folder.
   * - Regular mode (workspace opened as a floating window, or no workspace
   *   open): windows are added to windowsLayer as usual.
   */
  getWindowsPool() {
    if (this.headlessLayer && !this.headlessLayer.isEmpty()) return this.headlessLayer
    return this.windowsLayer
  }

  /**
   *
   */
  _launchApp(media, args) {
    const item = this.getWindowPreset(media, args);
    const fType = media.mget(_a.filetype);
    let app = require("./configs/application")(fType, item);
    if (_.isEmpty(app) || !app.kind) {
      app = { ...app, kind: "props_viewer", media };
    }
    app.style = this.getWindowPosition(media);
    if (app) {
      let launchTag = _.uniqueId();
      Kind.waitFor(app.kind).then(() => {
        try {
          app.launchTag = launchTag;
          this.getWindowsPool().append(app);
        } catch (e) {
          let widget = this.getWindowsPool().children.last();
          this.warn(`Failed to launch kind=${app.kind}`, widget, e);
          if (widget && widget.mget("launchTag") == launchTag) {
            widget.suppress();
          }
          Wm.alert(LOCALE.INTERNAL_ERROR);
          media.wait(0);
        }
      });
      return true;
    }
    return false;
  }

  /**
   *
   * @param {*} media
   * @param {*} moving
   * @returns
   */
  openContent(media, args) {
    if (!media.wait) return;
    if (media.mget(_a.status) === _a.deleted) {
      media.wait(0);
      return;
    }
    if (pointerDragged) {
      return;
    }
    this.verbose("openContent[927]:", media, args)
    const fType = media.mget(_a.filetype);
    switch (fType) {
      case _a.hub:
        return this.openHubManager(media);

      case _a.web:
        media.wait(0);
        if (media.mget("dataType") == "drumee.note") {
          return this._launchApp(media);
        }
        window.open(media.srcUrl(), "_blank");
        break;

      case _a.skeleton:
        xhRequest(media.actualNode().url)
          .then((skl) => {
            media.wait(0);
            if (skl.loader) {
              let loader = window[skl.loader];
              let method = loader[skl.method];
              if (_.isArray(skl.arguments)) {
                for (var i in skl.arguments) {
                  if (_.isBoolean(skl.arguments[i].trigger)) {
                    skl.arguments[i].trigger = media;
                  }
                }
                method.apply(loader, skl.arguments);
              } else {
                if (_.isBoolean(skl.arguments.trigger))
                  skl.arguments.trigger = media;
                method.apply(loader, [skl.arguments]);
              }
            }
          })
          .catch(() => {
            this.alert(e.toString());
            media.wait(0);
          });
        break;

      default:
        const singletonTypes = [_a.video, _a.audio];
        if (singletonTypes.includes(fType) && this.checkAlreadyOpened(media)) {
          return;
        }

        if (fType == _a.audio) {
          let w = this.getItemByKind("audio_player");
          if (w) {
            w.changeSource(media);
            return;
          }
        }

        if (this._launchApp(media, args)) return;

        if (!window.open(c.mget(_a.src), "_blank")) {
          Butler.say(LOCALE.WINDOW_BLOCKED);
          return;
        }
    }
  }

  /**
   *
   * @param {*} media
   */
  showProperties(media) {
    this.confirm(media.mget(_a.extension).printf(LOCALE.NO_PLAYER_FOR_X_FILE))
      .then(() => {
        media.download();
      })
      .catch(() => { });
  }

  /**
   *
   * @param {*} media
   * @returns
   */
  checkAlreadyOpened(media) {
    let w = this.getWindowsPool().children.find(
      (r) => r.mget(_a.nid) == media.mget(_a.nid),
    );
    if (w && !w.isDestroyed()) {
      if (media.mget(_a.kind) == _a.media) {
        setTimeout(() => {
          media.wait(0);
        }, 1500);
      }

      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          w.wake();
          let dock = this.__dock;
          return dock
            .getItemsByAttr(_a.nid, media.mget(_a.nid))[0]
            .selfDestroy({
              now: true,
              callback: () => dock.__dockMinifier.updateDockMinifier(),
            });
        }
        w.raise();
      };
      setTimeout(f, 100);

      return true;
    }
    return false;
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  openPlayer(item) {
    let opt;
    if (item.mget(_a.media)) {
      opt = item.mget(_a.media).model.toJSON();
      opt.media = item.mget(_a.media);
    } else {
      opt = item.model.toJSON();
      opt.media = item;
    }
    if (item.source) {
      opt.type = item.source.mget(_a.type);
    }

    opt.kind = "previewer";
    opt.radio = _a.on;
    opt.trigger = opt.media;
    opt.service = null;
    return this.getWindowsPool().append(opt);
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  openKind(item) {
    let opt;
    if (item.mget(_a.media)) {
      opt = item.mget(_a.media).model.toJSON();
      opt.media = item.mget(_a.media);
    } else {
      opt = item.model.toJSON();
      opt.media = item;
    }

    opt.type = item.source.mget(_a.type) || item.source.mget(_a.respawn);

    opt.kind = opt.type;
    opt.radio = _a.on;
    opt.trigger = item.source;
    opt.service = null;
    return this.getWindowsPool().append(opt);
  }

  /**
   *
   * @param {*} arg
   * @param {*} o
   * @returns
   */
  launch(arg, o) {
    let opt;
    if (o == null) {
      o = {};
    }
    this.verbose("manager:launch[1099]", arg, o)
    if (o.singleton) {
      // Derive the "is this already open?" key in priority order:
      //   1. explicit o.unique (legacy callers, e.g. window/team)
      //   2. arg.wm_unique_id (most callers — folder, chat-item, dock)
      //   3. fall back to first window of this kind (kind-only singletons
      //      like support-ticket and pricing)
      const uniqueKey = o.unique
        ? o.unique
        : (arg && arg.wm_unique_id
          ? { key: 'wm_unique_id', value: arg.wm_unique_id }
          : null);
      let w;
      if (uniqueKey) {
        w = this.getItemsByAttr(uniqueKey.key, uniqueKey.value)[0];
      } else {
        w = this.getItemsByKind(arg.kind)[0];
      }
      if (w && !w.isDestroyed()) {
        const f = () => {
          if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
            return w.wake(arg.source);
          }
          w.raise();
        };
        setTimeout(f, 100);
        return false;
      }
    }

    if (o.explicit || o.options === "explicit") {
      Kind.waitFor(arg.kind).then(() => {
        this.getWindowsPool().append(arg);
      });
      return true;
    }

    try {
      opt = arg.model.toJSON();
      opt.trigger = opt.source || arg;
    } catch (error) {
      opt = arg || {};
    }

    const type = opt.type || opt.filetype;
    if ((!opt.nid || !opt.hub_id) && !type) {
      this.warn(ERROR.attr_required.format("nid and hub_id"));
      return false;
    }

    opt.args = opt;
    opt.radio = _a.on;
    opt.kind = "window_launcher";
    this.getWindowsPool().append(opt);
    return true;
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  openWindow(item) {
    item.kind = item.kind || _a.media;
    item.position = _a.auto;
    this.__modal.feed(item);
    const media = this.__modal.children.last();
    this.openContent(media);
    const f = () => media.cut();
    return setTimeout(f, 300);
  }

  /**
   *
   * @param {*} skl
   * @returns
   */
  alert(skl) {
    if (skl == null) {
      let pending = this.__wrapperModal.children.last();
      if (pending && !/window_info/.test(pending.mget(_a.kind))) {
        return;
      }
      this.__wrapperModal.clear();
      return;
    }
    if (_.isString(skl)) {
      skl = {
        kind: "window_info",
        message: skl || "No message!",
      };
      Kind.waitFor("window_info").then(() => {
        return this.__wrapperModal.feed(skl);
      });
      return;
    }
    if (skl.body) {
      skl = {
        kind: "window_info",
        body: skl.body,
      };
    } else if (!skl.kind) {
      skl = {
        kind: "window_info",
        body: skl,
      };
    }
    return new Promise((resolve, reject) => {
      Kind.waitFor(skl.kind).then((a) => {
        const s = this.__wrapperModal.feed(skl);
        resolve(s);
      });
    });
  }

  /**
   *
   * @param {*} skl
   * @param {*} opt
   * @returns
   */
  confirm(skl, opt = {}) {
    const kind = "window_confirm";
    if (_.isString(skl)) {
      skl = {
        message: skl || LOCALE.CONFIRM,
      };
    } else {
      skl = {
        ...skl,
        ...opt,
      };
    }
    let w = opt.wrapper || this.__wrapperModal;
    return new Promise(function (resolve, reject) {
      Kind.waitFor(kind).then((a) => {
        const s = w.feed({ ...skl, kind });
        s.ask().then(resolve).catch(reject);
      });
    });
  }

  /**
   *
   * @param {*} skl
   * @param {*} opt
   * @returns
   */
  choice(message, ...questions) {
    const kind = "window_choice";
    let w = this.__wrapperModal;
    return new Promise(function (resolve, reject) {
      Kind.waitFor(kind).then((a) => {
        const s = w.feed({ questions, kind });
        s.ask(message, questions).then(resolve).catch(reject);
      });
    });
  }

  /**
   * Show move destination picker popup
   * @param {object|object[]} items - Media item(s) to move
   * @returns {Promise} resolves with { destination, destinations, items }
   *   destinations: array of { nid, hub_id, filename, wsName, isFolder, home_nid }
   */
  move(items, opt = {}) {
    const kind = "window_move";
    let skl = _.isString(items)
      ? { message: items }
      : { items, ...opt };
    let w = opt.wrapper || this.__wrapperModal;
    return new Promise(function (resolve, reject) {
      Kind.waitFor(kind).then((a) => {
        const s = w.feed({ ...skl, kind });
        s.move(items).then(resolve).catch(reject);
      });
    });
  }

  /**
   *
   */
  closeAlert() {
    let media = this.__wrapperModal.children.last();
    media.goodbye();
  }

  /**
   *
   * @param {*} ext
   * @returns
   */
  showContent(ext) {
    let opt = { ...Visitor.parseModuleArgs(), ...ext };
    if (!opt.nid || !opt.hub_id) {
      Butler.say("Invalid link");
      return;
    }
    const args = {
      nid: opt.nid,
      hub_id: opt.hub_id,
    };
    xhRequest(SERVICE.media.get_node_attr, args)
      .then((payload) => {
        const { data } = payload;
        data.privilege = data.permission;
        if (data.permission) {
          return this.openWindow(data);
        } else {
          opt = {
            kind: "window_info",
            message: LOCALE.FILE_NOT_FOUND,
          };
          return this.getWindowsPool().append(opt);
        }
      })
      .catch((e) => {
        opt = { kind: "window_info" };
        return this.getWindowsPool().append(opt);
      });
  }

  /**
   *
   * @returns
   */
  hideIcons() {
    return this.iconsList.$el.hide();
  }

  /**
   *
   */
  showQrCode(text = "") {
    let id = `canvas-${this.mget(_a.widgetId)}`;
    let content = Skeletons.Element({
      tagName: "img",
      sys_pn: "qr-code",
      attribute: { id },
    });
    let body = require("./skeleton/body-wrapper")(this, content);
    this.alert({ body });
    createQrcode({ id, text });
  }

  /**
   *
   */
  showIcons() {
    this.iconsList.$el.show();
  }

  /**
   *
   */
  onNewHub(data = {}) {
    /** DISABLED FOR UX REASON */
    // this.getItemsByAttr(_a.nid, data.nid).filter((c) => {
    //   this.verbose("AAA1326:[onNewHub]", c)
    //   this.openHubManager(c, "openSettings");
    // });
  }

  /**
   *
   */
  newVersion() {
    if (this.__windowsLayer && this.__windowsLayer.isEmpty()) {
      location.reload();
    } else {
      this.confirm({
        message: LOCALE.INFO_NEW_VERSION,
        cancel: LOCALE.LATER,
        cancel_action: _e.close,
      })
        .then(() => {
          location.reload();
        })
        .catch(() => { });
    }
  }
}
__window_manager.initClass();

module.exports = __window_manager;
