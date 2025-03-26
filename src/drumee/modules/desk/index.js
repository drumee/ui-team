require("welcome/skin");
require("builtins/window/confirm/skin");

class __desk_ui extends LetcBox {
  constructor(...args) {
    super(...args);
    this.changeContextMenu = this.changeContextMenu.bind(this);
    this.refreshContextMenu = this.refreshContextMenu.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.mediaDragLeaveAvatar = this.mediaDragLeaveAvatar.bind(this);
    this.mediaDragOverAvatar = this.mediaDragOverAvatar.bind(this);
    this.mediaDragDropOnAvatar = this.mediaDragDropOnAvatar.bind(this);
    this._dragOver = this._dragOver.bind(this);
    this._upload = this._upload.bind(this);
    this._dragLeave = this._dragLeave.bind(this);
    this.route = this.route.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.checkIntro = this.checkIntro.bind(this);
    this.dmzCopyMedia = this.dmzCopyMedia.bind(this);
    this.checkUserOnBoarding = this.checkUserOnBoarding.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.acknowledge = this.acknowledge.bind(this);
    this._openTab = this._openTab.bind(this);
    this.dmzDetailResponse = this.dmzDetailResponse.bind(this);
    this.disconnectShared = this.disconnectShared.bind(this);
    this.setModuleState = this.setModuleState.bind(this);
    this.lazyClasses = this.lazyClasses.bind(this);
  }

  static initClass() {
    require("./skin");
    this.prototype.className = "desk-ui";
    this.prototype.figName = "desk_module";
    this.prototype.behaviorSet = { bhv_socket: 1 };
    this.prototype.events = { drop: "_upload" };
  }

  /**
   *
   */
  initialize(opt) {
    window.Desk = this;
    super.initialize(opt);
    localStorage.iconType = localStorage.iconType || _a.vignette;

    this._uid = Visitor.id;

    this.sbMeasures = {
      resizeIcon: 0,
    };
    this.declareHandlers();

    this._updateContextMenu = this._updateContextMenu.bind(this);

    RADIO_BROADCAST.on(_e.select, this._updateContextMenu);
    setTimeout(this.lazyClasses, 5000);
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_BROADCAST.off(_e.select, this._updateContextMenu);
  }

  /**
  *
  */
  async onDomRefresh() {
    this._pending = { available: false };
    if (Visitor.device() === _a.mobile) {
      this.feed(require("./skeleton/mobile")(this));
    } else {
      this.feed(require("./skeleton")(this));
    }
    await this.ensurePart("desk-content");
    await this.ensurePart("wrapper-module");
    this.route();
  }

  /**
   * 
   */
  restart() {
    wsRouter.resetSocket();
    this.onDomRefresh();
  }

  /**
  *
  */
  _updateContextMenu(media) {
    const m = this.getPart("menu-settings");
    if (_.isEmpty(Wm.getGlobalSelection())) {
      m.__items.el.dataset.action = 0;
    } else {
      m.__items.el.dataset.action = 1;
    }
    this.autoMenu(media);
  }

  /**
  *
  */
  changeContextMenu(state) {
    this.findPart("menu-settings").changeState(state);
  }

  /**
   * 
   * @returns 
   */
  refreshContextMenu() {
    const selected = Wm.getGlobalSelection();
    const protectBtn = this.__topProtectedBtn;
    let count = 0;
    if (!selected.length) return;
    for (var s of selected) {
      if (s.mget(_a.status) === _a.locked) {
        count = count + 1;
      }
    }
    let locked = count === selected.length;
    if (locked) {
      protectBtn.mset(_a.chartId, "protected-unlock");
      protectBtn.setLabel(LOCALE.UNPROTECTED);
    } else {
      protectBtn.mset(_a.chartId, "protected-lock");
      protectBtn.setLabel(LOCALE.PROTECTED);
    }
  }

  /**
   *
   */
  autoMenu() {
    if (_.isEmpty(Wm.getGlobalSelection())) {
      this.changeContextMenu(0);
    } else {
      this.changeContextMenu(1);
      this.refreshContextMenu();
    }
  }

  /**
   *
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "ref-avatar":
        /** wait for  $el.droppable*/
        this.ensurePart("desk-content").then(()=>{
          child.$el.droppable({
            tolerance: "touch",
            over: this.mediaDragOverAvatar,
            out: this.mediaDragLeaveAvatar,
            drop: this.mediaDropOnAvatar,
            greedy: true,
          })
        })

        this.avatar = child;
        return Visitor.on(_e.change, (m) => {
          if (m.changed && m.changed.mtime) {
            return child.reload();
          }
        });

      case "avatar-listener":
        return (this._avatarListener = child);

      case "search-box":
        return (this._searchBoxInner = child);

      case "wrapper-popup":
        this.popup = child;
        return this.popup.collection.on(_e.remove, () => {
          const c = this.popup.children.last();
          if (c.isLazyClass || this.popup.isEmpty()) {
            return;
          }
          const f = () => {
            Wm.windowsLayer.$el.removeClass("creating-hub");
            return (this.popup.el.dataset.state = _a.closed);
          };
          return setTimeout(f, Visitor.timeout(300));
        });

      case "main-menu":
        return (this._mainMenu = child);

      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;
        return;

      case "desk-content":
        this.content_wrapper = child;
        return;

      case "desk-wrapper":
        return (this.desk_wrapper = child);

      case "user-dropdown":
        child.on(_e.open, () => {
          try {
            return (this.__userContainer.el.dataset.state = 1);
          } catch (error) { }
        });
        if(!Visitor.get(_a.privilege)){
          Visitor.once('online', ()=>{
            child.restart();
          });  
        }
        return child.on(_e.close, () => {
          try {
            return (this.__userContainer.el.dataset.state = 0);
          } catch (error) { }
        });

      case "wrapper-module":
        this.moduleWrapper = child;
        child.collection.on(_e.remove, (c) => {
          if (this._swapping) {
            return;
          }
          if (child.collection.length === 0) {
            Backbone.history.navigate(_K.module.desk);
            this.getPart("top-bar").el.dataset.state = 0;
          }
          this._mainMenu.el.setAttribute(_a.data.state, "");
          child.el.hide();
          return Wm.showIcons();
        });
        return; 

      case "desk-tooltip":
        return (this.tooltip = child);

      case "share-bar-countdown-timer":
        var f = () => {
          const data = {
            service: SERVICE.adminpanel.mimic_end_bytime,
            hub_id: Visitor.get(_a.id),
            orgid: Visitor.get("org_id"),
            mimic_id: Visitor.get("mimic_id"),
          };
          this.postService(data);
        };
        return child.on(_e.done, () => setTimeout(f, 5000));

      case "menu-settings":
        return child.on(_e.open, this.refreshContextMenu);
    }
  }

  /**
   *
   */
  mediaDragLeaveAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.avatar.el.dataset.over = _a.no;
  }

  /**
   *
   */
  mediaDragOverAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (ui.helper.moving == null) {
      return;
    }
    ui.helper.moving.valid = true;
    this.avatar.el.dataset.over = _a.yes;
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  mediaDragDropOnAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (ui.helper.moving == null) {
      return;
    }
  }

  /**
   *
   */
  _upload(e) {
    return Wm.upload(e);
  }

  /**
   *
   */
  _dragOver(e, ui) {
    Wm.el.dataset.selected = _a.upload;
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _dragLeave(e, ui) {
    Wm.el.dataset.selected = _a.off;
  }

  /**
   *
   */
  route(opt) {
    if (opt == null) {
      opt = [];
    }
    opt = Visitor.parseModule();
    const sub_module = opt[1];
    if (sub_module != null) {
      Kind.waitFor("window_launcher").then(() => {
        this._openTab(sub_module, opt);
      });
    } else {
      if (!this.moduleWrapper) {
        Backbone.history.location.reload();
        return;
      }
      if (!this.moduleWrapper.isEmpty()) {
        this.moduleWrapper.children.last().softDestroy();
      }
    }

    this.trigger(_e.ready);
    this.checkIntro();
  }

  /**
   *
   */
  onChildBubble(c) {
    if (
      (typeof mouseDragged !== "undefined" && mouseDragged !== null) ||
      c.mget(_a.service) != null ||
      c.status === _e.data
    ) {
      return;
    }
    return Wm.unselect();
  }

  /**
   * @param {Object} c
   */
  checkIntro(c) {
    if (Visitor.get("is_dmz_hub_copy") == _a.yes) {
      return this.dmzCopyMedia(c);
    }
    this.checkUserOnBoarding(c);
  }

  /**
   *
   */
  checkForPaymentInfo(args = {}) {
    if (_.isEmpty(args)) {
      args = Visitor.parseModuleArgs();
    } // do not remove

    if (_.isEmpty(args.payment)) {
      return;
    }

    // to check for successful and failed payment status
    if (args.payment && args.success) {
      if (!_.isEmpty(args.subscription_id)) {
        return this.checkForPaymentStatus(args);
      }
    }

    // to check for canceled transaction
    if (args.payment == "false" && args.cancel) {
      return this.showPaymentStatus({ status: _a.cancel });
    }
  }

  /**
   *
   */
  checkForPaymentStatus(args) {
    return this.fetchService({
      service: SERVICE.subscription.payment_status,
      subscription_id: args.subscription_id,
      hub_id: Visitor.id,
    })
      .then((data) => {
        return this.showPaymentStatus(data);
      })
      .catch((e) => {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      });
  }

  /**
   *
   */
  showPaymentStatus(data) {
    const infoSkl = require("./skeleton/payment/status-info").default(
      this,
      data
    );
    return this.__wrapperPopup.feed(infoSkl);
  }

  /**
   * @param {Object} c
   */
  dmzCopyMedia(c) {
    if (Visitor.get("is_dmz_hub_copy") == _a.no) {
      return;
    }
    this.fetchService({
      service: SERVICE.media.dmz_detail,
      hub_id: Visitor.id,
    }).then((data) => {
      this.dmzDetailResponse(data);
    })
  }

  /**
   * @param {Object} c
   */
  checkUserOnBoarding(c) {
    if (Visitor.data("intro") === _a.no) {
      return;
    }

    this.__wrapperPopup.feed(
      require("./skeleton/common/intro-popup").default(this)
    );
  }

  /**
   *
   */
  async playIntroVideo() {
    let c = await Wm.playTutorial("intro");
    this.__wrapperPopup.clear();
    c &&
      c.once(_e.destroy, () => {
        this.__wrapperPopup.feed(
          require("./skeleton/common/intro-popup").default(this)
        );
      });
  }

  /**
   *
   */
  skipIntroPopup() {
    return this.postService({
      service: SERVICE.drumate.intro_acknowledged,
      hub_id: Visitor.id,
    }).then((data) => {
      Visitor.set(data);
      return this.__wrapperPopup.clear();
    });
  }

  /**
   * @param {Object} c
   */
  checkBrowserSupport(c) {
    if (
      localStorage.getItem("skip-browser-check") ||
      (Visitor.browserSupport() && !Visitor.parseModuleArgs().browser)
    ) {
      return;
    }
  }

  /**
   *
   */
  _loadModule(kind, args) {
    const start = () => {
      const item = {
        kind,
        trigger: this.findPart("ref-avatar"),
        handler: {
          uiHandler: this,
        },
      };
      this._swapping = 0;
      if (this.moduleWrapper.isEmpty()) {
        this.moduleWrapper.feed(item);
      } else {
        const c = this.moduleWrapper.children.last();
        if (c.mget(_a.kind) === kind && _.isFunction(c.route)) {
          c.route();
        } else {
          this._swapping = 1;
          c.parent.collection.remove(c.model); // null, null, ()=>
          this.moduleWrapper.feed(item);
        }
      }
      this._mainMenu.el.setAttribute(_a.data.state, 0);
      this.getPart("top-bar").el.dataset.state = 1;
    };

    if (Kind.exists(kind)) {
      return start();
    }
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    if (mouseDragged || !window.Wm) {
      return;
    }

    switch (service) {
      case _e.lock:
        return Wm.lock();

      case _e.upload:
        return Wm.handleUpload();

      case _e.download:
        return Wm.download();

      case _e.launch:
        return Wm.launch(
          { kind: cmd.mget(_a.respawn) },
          { explicit: 1, singleton: 1 }
        );

      case "open-contact-manager":
        return Wm.launch(
          { kind: cmd.mget(_a.respawn), args: cmd.mget(_a.router) },
          { explicit: 1, singleton: 1 }
        );

      case "close-popup":
      case "close-modal":
        this.popup.children.last().softDestroy();
        return Backbone.history.navigate(_K.module.desk);

      case "general-menu":
        return (this.getPart("top-bar").el.dataset.state = cmd.model.get(
          _a.state
        ));

      case "skip-browser-check":
        localStorage.setItem("skip-browser-check", 1);
        Wm.closeAlert();
        return;

      case "menu-settings":
        if (cmd.mget(_a.state)) {
          return this._updateContextMenu();
        }
        break;

      case _e.copy:
      case _e.cut:
        return Wm.storeClipboard(service);

      case _e.paste:
        return Wm.paste();

      case _e.search:
        return Wm.search(cmd, args);

      case "copy-link":
        return Wm.copyLink();

      case "toggle-fullscreen":
        return Wm.toggleFullscreen();

      case "disconnect-shared":
        return this.disconnectShared(cmd);

      case "network-event":
        return noOperation();

      case "close-info-popup":
        this.__wrapperPopup.clear();
        return Backbone.history.navigate(_K.module.desk);

      case "skip-intro-popup":
        return this.skipIntroPopup();

      case "play-intro-video":
        return this.playIntroVideo();

      case "close-popup":
        return this.__wrapperPopup.clear();

      default:
        Wm.unselect();
    }
  }

  /**
   * 
   * @param {*} message 
   */
  acknowledge(message) {
    let c = require("libs/preset/ack")(this, message, null, {
      presetClass: "link",
    });
    c.className = `${c.className} ${this.fig.group}-topbar__acknowledge-content`;
    this.__acknowledge.feed(c);
    c = this.__acknowledge.children.last();
    c.selfDestroy();
  }

  /**
   *
   */
  _openTab(name, opt) {
    switch (name) {
      case "chat":
        var f = () => {
          this._loadModule(name, opt[2]);
        };
        return setTimeout(f, 200);

      case "account":
      case "bigchat":
      case "addressbook":
      case "transferbox":
      case "helpdesk":
      case "supportticket":
        return Wm.launch(
          { kind: `window_${name}` },
          { explicit: 1, singleton: 1 }
        );

      case "adminpanel":
        if (Visitor.domainCan(_K.permission.admin_view)) {
          return Wm.launch(
            { kind: `window_${name}` },
            { explicit: 1, singleton: 1 }
          );
        }
        break;
    }
  }

  /**
   * @param {*} data
   */
  dmzDetailResponse(data) {
    const copyMedia = (_flag) => {
      return this.postService({
        service: SERVICE.media.dmz_copy,
        flag: _flag,
        hub_id: Visitor.id,
      }).then(() => {
        return Wm.closeAlert();
      });
    };

    return Wm.confirm({
      title: LOCALE.CONGRATULATIONS,
      message: require("./skeleton/common/dmz-copy-media").default(this, data),
      confirm: LOCALE.YES,
      confirm_type: "primary",
      cancel: LOCALE.NO,
      cancel_type: "secondary",
      buttonClass: "dmz-copy-media",
      mode: "hbf",
    })
      .then(copyMedia(_a.yes))
      .catch(copyMedia(_a.no));
  }

  /**
   *
   * @param {*} cmd
   */
  disconnectShared(cmd) {
    const data = {
      orgid: Visitor.get("org_id"),
      mimic_id: Visitor.get("mimic_id"),
      hub_id: Visitor.id,
    };
    if (Visitor.get("mimic_type") === _a.mimic) {
      data.service = SERVICE.adminpanel.mimic_end_bymimic;
    }
    if (Visitor.get("mimic_type") === _a.victim) {
      data.service = SERVICE.adminpanel.mimic_end_byuser;
    }
    this.postService(data);
  }

  /**
   *
   * @param {*} s
   */
  setModuleState(s) {
    this.moduleWrapper.el.dataset.state = s;
  }

  /**
   *
   */
  lazyClasses() {
    for (var k of ["window_confirm", "media_uploader"]) {
      Kind.waitFor(k);
    }
  }
}

__desk_ui.initClass();

module.exports = __desk_ui;

