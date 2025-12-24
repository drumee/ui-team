
const EOD = "end:of:data";
const OPEN_NODE = "open-node";
const WS_EVENT = "ws:event";

const Rectangle = require('rectangle-node');
const { TweenMax, Expo } = require("gsap/all");
const ViewMode = new Map();
const DEFAULT = 'default';
ViewMode.set(DEFAULT, _a.icon);

class __window_mfs extends DrumeeMFS {
  constructor(...args) {
    super(...args);
    this.buildIconsList = this.buildIconsList.bind(this);
    this.newContent = this.newContent.bind(this);
    this.handleWsEvent = this.handleWsEvent.bind(this)
  }

  initialize(opt) {
    this._watchdog(opt);
    super.initialize(opt);
    this.topbarHeight = this.configs().topbarHeight;
    this._synced = {};
    this.mset({ echoId: Visitor.get(_a.socket_id) + this.cid })
    this.setViewMode();
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
    if (m.mget(_a.filetype) == _a.hub && m.mget(_a.actual_home_id)) {
      this.mset({ nid: m.mget(_a.actual_home_id) })
    }
    this.parentFolder = m.logicalParent || m.mget('logicalParent');
    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.on(_e.keyup, this._kbHandler);
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this._changelog_id = null;
    this._goneHiddenTime = new Date().getTime();
  }

  /**
   * 
   * @param {*} e 
   */
  onVisibilityChange(e) {
    this.visible = !document.hidden;
    let now = new Date().getTime();
    let prev = this._goneHiddenTime;
    this._goneHiddenTime = now;
    if ((now - prev) <= 5000) {
      return;
    }
    if (document.hidden) {
      return;
    }
    if (wsRouter.timestampAge() < 10000) return;
    this._checkChangelog();
  }


  /**
   * In case of updates through websocket were missing because of DOM gone idle for any reason
   * Try tu refresh by looking into changelog
   */
  _checkChangelog() {
    let pid = this.getCurrentNid();
    let cur_hub_id = this.mget(_a.hub_id);
    let args = { hub_id: this.mget(_a.hub_id) };
    if (this._changelog_id) {
      args.id = this._changelog_id;
    } else {
      args.last = 5;
    }
    let changed = 0;
    this.fetchService(SERVICE.changelog.read, args).then((data = []) => {
      if (!data.length) return;
      let rows = data.filter((e) => {
        const { src, dest, hub_id } = e;
        if (!hub_id || !src) return false;
        if (hub_id != cur_hub_id) return false;
        if (_.isArray(src)) {
          let s = src.filter((e) => {
            if (e.parent_id != pid) return false;
          })
          changed = changed + s.length;
        }
        if (_.isArray(dest)) {
          let s = dest.filter((e) => {
            if (e.parent_id != pid) return false;
          })
          changed = changed + s.length;
        }
        if (src.hub_id && src.hub_id != cur_hub_id) return false;
        if (dest.hub_id && dest.hub_id != cur_hub_id) return false;
        if (src.parent_id == pid) return true;
        if (dest.parent_id == pid) return true;
        return false;
      })
      this._changelog_id = data[0].id + 1;
      changed = changed + rows.length;
      if (changed) {
        this.fetchContent()
      }
    })

  }

  /**
   * 
   * @returns 
   */
  onBeforeDestroy(opt) {
    if (this._responsive) RADIO_BROADCAST.off(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.off(_e.keyup, this._kbHandler);
    Wm.off(WS_EVENT, this.handleWsEvent)
    if (super.onBeforeDestroy) {
      super.onBeforeDestroy(opt)
    }
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }


  /**
   * Ensure the widget will show.
   * Otherwise remove after timeout
   */
  _watchdog(opt) {
    this.on(_e.show, (e) => {
      if (this._watchdogTimer) {
        clearTimeout(this._watchdogTimer);
      }
    })
    this._watchdogTimer = setTimeout(() => {
      this.warn("Got watchdog timeout", this)
      this.suppress();
    }, 10000)
  }

  /**
   * 
   */
  onBeforeRender() {
    super.onBeforeRender();
    let last_y = 0;
    let last_x = 0;
    if (!Visitor.isMobile()) {
      for (var c of this.parent.children.toArray()) {
        last_y = c.style.get(_a.top);
        last_x = c.style.get(_a.left);
        if (c != this) {
          if (last_y == this.style.get(_a.top)) {
            let y = last_y + this.topbarHeight;
            if ((y + this.style.get(_a.height)) > window.innerHeight) {
              y = last_y - this.topbarHeight;
            }
            this.style.set({
              top: y
            });
          }
          if (last_x == this.style.get(_a.left)) {
            let x = last_x + this.topbarHeight;
            if ((x + this.style.get(_a.width)) > window.innerWidth) {
              x = last_x - this.topbarHeight;
            }
            this.style.set({
              left: x
            });
          }
        }
      }
    } else {
      this.style.set({ top: 0, left: 0 });
    }
    Wm.on(WS_EVENT, this.handleWsEvent)
  }

  /**
   * 
   * @param {*} k 
   */
  configs(k) {
    return require("window/configs/default")(k);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  buildIconsList(child, pn) {
    this.iconsList = child;
    this.mosaic = [];
    let timer = null;
    if (Visitor.isMobile()) {
      timer = setTimeout(() => {
        timer = null;
        child.el.dataset.wait = 1;
      }, 300);
    }
    child.on(EOD, () => {
      if (timer) clearTimeout(timer);
      child.el.dataset.wait = 0;
      child.$el.removeClass('drumee-sprinner');
      this.syncContent(EOD);
      this._dataReady = true;
      this.trigger(EOD);
    });
    this.syncBounds();
    if (this.getViewMode() === _a.row) {
      this.sortContent();
    }
    child.el.dataset.role = _a.container;
  }


  /**
   * 
   * @param {*} cmd 
   */
  max_size() {
    if (Visitor.isMobile()) {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
    return {
      top: 20,
      left: 10,
      width: window.innerWidth - 20,
      height: window.innerHeight - 90
    }
  }


  /**
   * 
   */
  acknowledge(msg = LOCALE.ACK_COPY_LINK) {
    var c = require('libs/preset/ack')(this, msg);
    c.className = `${c.className} ${this.fig.group}-topbar__copy-link-ack`;
    this.append(c);
    const l = this.children.last();
    var f = () => {
      return l.suppress();
    };
    return _.delay(f, Visitor.timeout());
  }

  /**
   * 
   * @param {*} xhr 
   * @param {*} options 
   */
  purgeContent(data) {
    /** DO NOT DELETE */
  }

  /**
   * Abstract
   */
  updateStatus(args) {
    /** DO NOT DELETE */
  }


  /**
   * 
   * @param {*} xhr 
   * @param {*} oldData 
   */
  newContent(xhr, options = {}) {
    const { data } = xhr;
    const { nid, pid } = data;
    let { echoId } = options;
    if (echoId == this.mget('echoId')) {
      return;
    }
    if (this.mget(_a.nid) != pid) return;
    let child = this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(data);
      if (c.restart) {
        setTimeout(() => { c.restart() }, 500);
      }
      return true;
    });
    if (child.length) return;
    data.format = this.mget(_a.format) || _a.card;
    data.kind = this._getKind();
    data.service = OPEN_NODE;
    if (this.iconsList) {
      if (data.position >= 0) {
        this.iconsList.append(data, data.position);
      } else {
        this.iconsList.append(data);
      }
    }
    this.syncBounds();
  }


  /**
   * 
   */
  removeContent(args) {
    if (_.isArray(args)) {
      for (let item of args) {
        this.removeContent(item)
      }
      return;
    }
    let { nid, hub_id, filepath } = args;
    if (this.media) {
      if (this.media.mget(_a.nid) == nid) {
        this.goodbye()
        return;
      }
    }

    /** Remove children */
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c || c.mget(_a.pid) != this.getCurrentNid()) return false;
      c.goodbye();
    });

    /** Remove self */
    let re = new RegExp('^' + filepath);
    let path = this.mget(_a.filepath)
    if (this.mget(_a.hub_id) == hub_id && re.test(path) && path != '/') {
      this.goodbye()
      return;
    }

  }

  /**
   * 
   */
  renameContent(data) {
    let { args } = data;
    let { dest } = args;
    let { nid, filename } = dest;
    if (this.mget(_a.nid) == nid) {
      this.mset(dest)
      this.update_name(_a.filename, filename)
    }
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      if (c.afterRename) c.afterRename(data);
    });
    if (dest.filetype == _a.hub) {
      this.updateSettings({ ...dest, fieldName: _a.filename })
    }
  }

  /**
   *
   */
  updateContent(args) {
    let { nid } = args;
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(args);
      if (c.restart) {
        c.restart();
      }
    });
    if (this.mget(_a.nid) == nid) {
      if (this.restart) {
        this.restart();
      }
    }
  }

  /**
   *
   */
  updateSettings(args) {
    let { id, fieldName } = args;
    args.name = args[fieldName];
    this.getItemsByAttr("settingsId", `${id}.${fieldName}`).filter((c) => {
      if (fieldName && args[fieldName]) args.name = args[fieldName];
      c.mset(args);
      c.reload();
    });
    if (fieldName == _a.filename) {
      if (this.__refWindowName) {
        this.__refWindowName.set({ content: args.name })
      }
    }
  }

  /**
   *
   */
  downloadContent(args) {
    let { zipid } = args;
    this.getItemsByAttr("zipid", zipid).filter((c) => {
      if (!c) return false;
      c.handleDownload(args);
    });
  }

  /**
    *
    */
  moveContent(src, dest) {
    let { nid, echoId } = src;
    if (echoId == this.mget('echoId')) {
      return;
    }
    let pid = this.getCurrentNid();
    if (![src.pid, dest.pid].includes(pid)) return
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      if (c.logicalParent.cid !== this.cid) return;
      if (pid != src.pid) return;
      c.goodbye();
      return true;
    });
    this.newContent({ data: dest });
  }

  /**
   * Abstract to handle ws event
   */
  handleWsEvent(args = {}) {
    let { data, options } = args || {};
    let { echoId, service } = options
    let { src, dest } = data.args || {};
    switch (service) {
      case SERVICE.media.rename:
        this.renameContent(data)
        break;

      case SERVICE.hub.delete_contributor:
      case SERVICE.hub.delete_hub:
      case SERVICE.desk.leave_hub:
      case "media.remove":
      case SERVICE.media.trash:
        this.removeContent(data);
        break;

      case "media.new":
      case SERVICE.desk.create_hub:
      case SERVICE.hub.add_contributors:
      case SERVICE.media.make_dir:
      case SERVICE.media.restore_into:
      case SERVICE.media.upload:
        this.newContent({ data }, options);
        break;

      case SERVICE.media.copy:
        this.newContent({ data: dest }, options);
        break;

      case SERVICE.hub.update_name:
        this.updateSettings(data);
        break;

      case "media.status":
        this.updateStatus(args);
        break;

      case "media.purge":
        this.purgeContent(data);
        break;

      case "media.update":
      case SERVICE.hub.set_privilege:
      case SERVICE.media.replace:
      case SERVICE.media.rotate:
        this.updateContent(data);
        break;

      case SERVICE.media.save:
        if (data.replace) {
          delete data.replace;
          this.updateContent(data);
        } else {
          this.newContent({ data }, options);
        }
        break;

      case SERVICE.media.relocate:
      case SERVICE.media.move:
        if (echoId) {
          src.echoId = echoId;
          dest.echoId = echoId;
        }
        this.moveContent(src, dest);
        break;

      case "media.download":
        this.downloadContent(data)
        break;

    }
  }


  /**
   * 
   * @param {*} message 
   * @param {*} _ui_ 
   */
  warning(message, closeService = "close-dialog", buttonStyle = "") {
    this.warn("AAA:32", message);
    if (!this.overlayWrapper || this.overlayWrapper.isDestroyed()) {
      this.append(Skeletons.Wrapper.Y({
        className: `${this.fig.group}__dialog-overlay`,
        name: "overlay"
      })
      );
      this.overlayWrapper = this.children.last();
    }
    this.el.dataset.dialog = _a.open;
    this.overlayWrapper.feed(require('./skeleton/tooltips/warning')(this, message, closeService, buttonStyle));
    this.overlayWrapper.once(_e.removeChild, () => {
      this.el.dataset.dialog = _a.closed;
    })
    return this.overlayWrapper.children.last();
  }

  /**
  * @param {*} cmd
  * @fires Wm#minimize
  */
  minimize(cmd) {
    const offset = this.$el.offset();
    let minimizeLocation = this.minimizeLocation || {};
    this.wakeUpState = {
      top: offset.top,
      left: offset.left,
      height: this.$el.height(),
      width: this.$el.width(),
      scale: 1,
      opacity: 1,
    }

    this.mset(_a.minimize, 1);
    TweenMax.fromTo(this.$el, 1.5, {},
      {
        width: 0,
        height: 0,
        top: window.innerHeight - 200,
        left: (window.innerWidth / 2) - 480,
        scale: 0,
        opacity: 0,
        ...minimizeLocation,
        ease: Expo.easeOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.minimize = 1;
          this.el.dataset.state = 0;
        }
      }
    );


    const win = Wm.__windowsLayer.children.toArray()
      .reverse()
      .find(win => (win.mget(_a.minimize) != 1))
    if (!_.isEmpty(win)) {
      _.delay(() => win.raise());
    }


    /**
     * Minimize event.
     * @event Wm#minimize
     * @param {*} object current window instance 
     */
    Wm.$el.trigger(_e.minimize, this)
  }

  /**
   * 
   * @param {*} cmd
   * @param {function} callback
   * @fires Wm#wake
   */
  wake(cmd, callback = null) {
    this.el.dataset.minimize = 0;
    this.mset(_a.minimize, 0)
    this.el.dataset.state = 1;
    this.raise();
    let fromVar = {}
    if (cmd) {
      fromVar = { ...cmd.$el.offset() }
    }

    TweenMax.fromTo(this.$el, 1.5,
      {
        ...fromVar,
        immediateRender: true
      },
      {
        ...this.wakeUpState,
        ease: Expo.easeInOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.state = 1;
          if (callback && _.isFunction(callback)) {
            callback()
          }
        }
      }
    );
    /**
     * Wake event.
     * @event Wm#wake
     * @param {*} object window instance 
     */
    Wm.$el.trigger(_e.wake, this)
  }

  /**
   *
  */
  async openFileLocation(cmd) {
    let found = Wm.getItemsByAttr(_a.nid, cmd.mget(_a.nid)).filter((e) => {
      return e.cid != cmd.cid
    })
    if (found[0] && found[0].el) {
      found[0].el.click()
      return;
    }

    found = Wm.getItemsByAttr(_a.nid, cmd.mget(_a.pid)).filter((e) => {
      return e.cid != cmd.cid
    })
    if (found[0] && found[0].el) {
      found[0].el.click()
      return;
    }

    let parent = await this.fetchService({
      service: SERVICE.media.attributes,
      nid: cmd.mget(_a.pid),
      hub_id: cmd.mget(_a.hub_id),
    }, { async: 1 });
    let { kind } = require('window/configs/application')(parent.area, '');

    let trigger = cmd;
    for (let c of Wm.__list.children.toArray()) {
      let re = new RegExp(c.mget(_a.filepath))
      if (re.test(parent.filepath)) {
        trigger = c;
        break;
      }
    }
    let opt = {
      trigger,
      ...parent,
      kind: kind || 'window_folder',
      style: cmd.$el.offset()
    }

    // to open the folder/hub directly when tries to open via url
    if (cmd.mget(_a.role) == _a.url) {
      opt.nid = cmd.mget(_a.nid);
      opt.style = { top: 120, left: 250 };
    }

    return Wm.launch(opt, { explicit: 1 });
  }

  /**
   * 
   * @param {*} d 
   */
  scrollToBottom(d) {
    this.__list && this.__list.scrollToBottom(d);
  }

  /**
   * 
   * @param {*} x 
   * @param {*} y 
   */
  scrollTo(x, y) {
    this.__list && this.__list.scrollTo(x, y);
  }

  /**
   * 
   */
  scrollHeight() {
    if (this.__list) return this.__list.scrollHeight();
  }

  /**
   * 
   */
  scrollTop() {
    if (this.__list) return this.__list.scrollTop();
  }


  /**
   * 
   */
  contentRectangle() {
    let r = this.__list || this;
    return new Rectangle(
      r.$el.offset().left,
      r.$el.offset().top,
      r.$el.width(),
      r.$el.height()
    );
  }

  /**
 * 
 */
  setContainment() {
    let minX = 0.75 * this.$el.width();
    if (minX < 150) minX = Math.min(150, this.$el.width());
    const containment = [-minX, 0, window.innerWidth * .9, window.innerHeight * .9];
    this.$el.draggable("option", { containment });
  }


  /**
   * 
   * @param {*} pos 
   */
  anti_overlap(pos) {
    let last_y = 0;
    let last_x = 0;
    let changed = false;
    for (var c of this.parent.children.toArray()) {
      last_y = c.$el.position().top;
      last_x = c.$el.position().left;
      if (c != this) {
        if (last_y == pos.top) {
          pos.top = last_y + 20;
          changed = true;
        }
        if (last_x == pos.left) {
          pos.left = last_x + 20;
          changed = true;
        }
      }
    }
    return changed;
  }

  /**
   * 
   * @param {*} ui 
   */
  constrainResize(e, ui) {
    if (!e) return false;

    if (e.pageX < 0) {
      ui.size.width = this._lastWidth;
      ui.position.left = 0;
      return true;
    }
    if (e.pageY < 0) {
      ui.size.height = this._lastHeight;
      ui.position.top = 0;
      return true;
    }
    this._lastHeight = ui.size.height;
    this._lastWidth = ui.size.width;
  }

  // ===========================================================
  //
  // ===========================================================
  _resizeStart(e, ui) {
    this.$el.resizable(_a.option, "maxWidth", ui.size.width + window.innerWidth - e.pageX);
    this.$el.resizable(_a.option, "maxHeight", ui.size.height + window.innerHeight - e.pageY);
    this._lastHeight = ui.size.height;
    this._lastWidth = ui.size.width;
    //this._minY = -Wm.$el.offset().top;
  }

  /**
   * 
   * @param {*} data 
   */
  addSyncedMadia(data) {
    if (!this.__list) return;
    for (var c of this.getItemsByAttr(_a.nid, data.nid)) {
      if (!c.isDestroyed()) return;
    }
    if (this._synced[data.nid]) return;
    if (data.parent_id === this.mget(_a.nid)) {
      data.kind = this._getKind();
      data.phase = _a.local;
      this._synced[data.nid] = 1;
      this.__list.collection.once(_e.add, () => { delete this._synced[data.nid] });
      if (data.position > 0) {
        this.__list.collection.add(data, { at: data.position })
      } else if (data.position == -1) {
        this.__list.prepend(data);
      } else {
        this.__list.append(data);
      }
    }
  }

  /**
  * @param {String} service
  * @param {Object} data
  * @param {Object} 
  */
  __onLiveUpdate(service, data, options = {}) {
    switch (options.service) {
      case 'user.poke':
        if (data.kind && data.sender) {
          Visitor.playSound(_K.notifications.drip, 0);
          let launch = () => {
            this.launch(data, { explicit: 1 })
          }
          Wm.confirm({
            title: data.name.printf(LOCALE.VIDEO_CONFERENCE),
            message: data.sender.printf(LOCALE.X_INVITE_YOU_MEETING),
            confirm: LOCALE.JOIN_MEETING,
            confirm_type: 'primary',
            cancel: LOCALE.SKIP,
            cancel_type: 'secondary',
            buttonClass: 'intro-popup',
            cancel_action: _e.close,
            mode: 'hbf'
          }).then(launch).catch(noOperation);
        }
        break;
      default:
        this.warn(`WWW:520 ${service} not found.`, data, options)
    }
  }

  /**
 * 
 */
  getViewMode() {
    this.viewMode = ViewMode.get(this.cid) || ViewMode.get(DEFAULT);
    return this.viewMode;
  }

  /**
   * 
   */
  setViewMode(mode = _a.icon) {
    ViewMode.set(this.cid, mode)
    ViewMode.set(DEFAULT, mode)
    this.viewMode = mode;
  }



}

module.exports = __window_mfs;
