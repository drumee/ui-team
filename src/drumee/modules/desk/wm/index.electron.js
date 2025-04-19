const EFFECTIVE = "effective"
const WS_EVENT = "ws:event";

const __wm = require("./index");

class __window_manager extends __wm {
  constructor(...args) {
    super(...args);
    this.onDownstreamMfsEvent = this.onDownstreamMfsEvent.bind(this)
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    super.initialize(opt);

    window.JitsiMeetScreenObtainer = {
      openDesktopPicker: this.openDesktopPicker.bind(this),
    };

    require("router/bridge")(this, {
      "ipc-web-warning": "_showAlert",
      "mfs-settings-change": "_showSettingChangeAlert",
      "menu-web-show-helpdesk": "_showHelpDesk",
      "menu-sync-changed": "_hanldeSyncOptChanges",
      "user-web-close": "_onWinClose",
      "show-sync-help-in-web-render": "_handleSyncHelp",
      "main-new-version": "_handleVersion",
      "main-updates-progress": "_handleUpdateProgress",
      "mfs-media-state:*": "_changeGlobalSettings",
      "mfs-fs-ready": "_showChangelog",
      "mfs-sync-difference": "_showSyncDifferences",
      "mfs-event": "onUpstreamMfsEvent",
    });
  }

  /**
   *
   */
  async preset() {
    let { online } = await Account.userSettings();
    if (!online) {
      this.warn("AAA:51 -- Attempt to start while user is offline");
      return;
    }
    let { settings } = await MfsWorker.getEnv();
    this.debug("AAA:43 settings ", settings)
    this.mset(settings);
    Minishell.exec("media.getAccess", "microphone").then((granted) => {
      if (!granted) {
        this.alert(LOCALE.DEVICES_PERMISSION_DENIED);
      }
    });
    Minishell.exec("media.getAccess", "camera").then((granted) => {
      if (!granted) {
        this.alert(LOCALE.DEVICES_PERMISSION_DENIED);
      }
    });
    Minishell.exec("media.getAccess", "screen").then((granted) => {
      if (!granted) {
        this.alert(LOCALE.DEVICES_PERMISSION_DENIED);
      }
    });
    let changes = await MfsWorker.getChangelog();
    this._hanldeChangelogWindow(changes);
    this.trigger("mfs-ready");
  }

  /**
   *
   */
  async openDesktopPicker(opt, resolve, reject) {
    let sources = await Minishell.exec("screen.getAccess", "window", "screen");
    if (sources && sources[0]) {
      let { id } = sources[0];
      let streamType = id.split(':')[0];
      return resolve(id, streamType, false)
    }
    return reject(opt);
  }

  /**
   *
   * @param {*} changes
   */
  async _showSyncDifferences(changes) {
    this.debug("AAA:126", changes);
    this.modal({ kind: "window_changelog", screen: 'showChanges' });
  }

  /**
   * 
   * @param {*} changes 
   */
  async _hanldeSyncOptChanges(changes) {
    this.debug("AAA:112", this.mget(EFFECTIVE), changes);
    let { effective } = changes;
    if (effective != this.mget(EFFECTIVE)) {
      MfsWorker.getSyncParams().then((args) => {
        this.mset(args);
        Wm.restart();
        if (effective) {
          MfsScheduler.startSyncEngine();
        }
      })
    }
    this.mset(changes)
  }

  /**
   *
   * @param {*} changes
   */
  async _hanldeChangelogWindow(changes) {
    let { changeRate, engine, effective } = changes;
    //if (sync != null) this.mset({ sync, engine, effective });
    let localRoot = this.mget('localRoot');
    if (changes.error) {
      let msg = LOCALE[changes.error] || changes.error;
      delete changes.error;
      this.alert(msg);
      return;
    }

    delete changes.changeRate;
    await Kind.waitFor("window_changelog");
    if (changeRate > 0.5) {
      this.modal({ kind: "window_changelog", screen: "highRate", changes });
      return;
    }

    if (engine == 0) {
      this.debug("AAA:148", changes)
      if (!localStorage.getItem("hideSyncTips")) {
        this.debug("AAA:150", changes)
        this.modal({ kind: "window_changelog", screen: 'help', engine, localRoot });
      }
      return;
    }

    let gotChanges = this.hasChanges(changes);
    this.debug("AAA:138", { gotChanges }, this.mget(EFFECTIVE), effective);
    if (!gotChanges) {
      return;
    }
    this.modal({ kind: "window_changelog", screen: 'showChanges', changes, localRoot });
    let c = Wm.__wrapperModal.children.last();
    c.once(_e.destroy, () => {
      MfsScheduler.startSyncEngine();
    });
  }

  /**
   * 
   */
  onDownstreamMfsEvent(args) {
    let { data, options } = args || {};
    if (_.isArray(data)) {
      data.map((e) => {
        e.origin = "websocket";
      })
    } else {
      data.origin = "websocket";
    }
    MfsScheduler.log(options.service, data);
    this.debug("AAA:178", args)
  }

  /**
   *
   * @param {*} origin
   */
  onUpstreamMfsEvent(evt) {
    if (!evt) return;
    const { name } = evt;
    //const origin = "mfs";
    delete evt.name;
    evt.origin = "mfs";
    this.debug("AAA:194  onUpstreamMfsEvent", name, evt);
    // switch (name) {
    //   case "file.created":
    //   case "folder.created":
    //     this.onNewItem(evt);
    //     break;
    //   case "file.modified":
    //     this.onUpdateItem(evt);
    //     break;
    //   case "file.moved":
    //   case "folder.moved":
    //     this.onMoveItem(evt);
    //     break;
    //   case "file.renamed":
    //   case "folder.renamed":
    //     this.onRenameItem(evt);
    //     break;
    //   case "file.cloned":
    //   case "folder.cloned":
    //     this.onCopyItem(evt);
    //     break;
    //   default:
    //     this.warn(`Unhandled event ${name}`, evt);
    // }
  }

  /**
   *
   * @param {*} data
   */
  openContent(cmd, moving) {
    if (cmd.model) {
      return super.openContent(cmd, moving);
    }
    let items = this.selectItems(data);
    if (!items[0]) return;
    super.openContent(items[0], moving);
  }

  /**
   *
   */
  openCheckUpdate() {
    let message = {
      kind: "window_info",
      mode: "hb",
      message: {
        kind: "electron_update",
      },
    };
    this.alert(message);
  }

  /**
   *
   * @param {*} data
   */
  onNewItem(data, oldItem) {
    super.onNewItem(data, oldItem);
    delete data.logicalParent;
    if (data.origin == "mfs") return;
    MfsScheduler.log("media.new", data);
  }

  /**
   * 
   */
  showSyncTiips() {
    this.modal({ kind: "window_changelog", screen: 'help' });
  }

  /**
   *
   * @param {*} data
   */
  onUpdateItem(data) {
    let items = this.selectItems(evt);
    super.onUpdateItem(data, items);
    if (data.origin == "mfs") return;
    data.args = {
      changelog: { ...data.__changelog }
    }
    MfsScheduler.log("media.replace", data);
  }


  /**
   *
   * @param {*} data
   */
  onNewHub(data) {
    super.onNewHub(data);
    delete data.logicalParent;
    data.args = {
      changelog: { ...data.__changelog }
    }
    MfsScheduler.log("media.new", data);
  }

  /**
   *
   * @param {*} data
   */
  onRemoveItem(data) {
    super.onRemoveItem(data);
    delete data.logicalParent;
    this.debug("AAA:260 269:onRemoveItem", data.origin, data);
    if (data.origin == "mfs") return;
    data.args = {
      changelog: { ...data.__changelog }
    }
    MfsScheduler.log("media.remove", data);
  }

  /**
   *
   * @param {*} data
   */
  onCopyItem(data) {
    let origin = data.origin;
    this.debug("AAA:271 -- onCopyItem", data);

    if (!data.__oldItem || !data.__newItem) {
      this.warn("AAA:276 -- onCopyItem Invalid data", data);
      return;
    }
    this.onNewItem({ ...data.__newItem, origin });
    if (origin == "mfs") return;
    data.args = {
      src: { ...data.__oldItem },
      dest: { ...data.__newItem },
      changelog: { ...data.__changelog }
    };
    delete data.args.dest.__newItem;
    delete data.args.dest.__oldItem;
    MfsScheduler.log("media.copy", data);
  }

  /**
   *
   * @param {*} data
   */
  onMoveItem(data) {
    let origin = data.origin;
    this.debug("AAA:291 -- onMoveItem", origin, data);

    if (!data.__oldItem || !data.__newItem) {
      this.warn("AAA:276 -- onMoveItem Invalid data", data);
      return;
    }

    data.__oldItem.origin = origin;
    data.__newItem.origin = origin;
    super.onMoveItem(data, origin);
    if (origin == "mfs") return;
    data.args = {
      src: { ...data.__oldItem },
      dest: { ...data.__newItem },
      changelog: { ...data.__changelog }
    };
    MfsScheduler.log("media.move", data);
  }


  /**
   *
   */
  onRenameItem(data) {
    let origin = data.origin;
    this.verbose("AAA:312 -- onRenameItem", origin, data);
    if (!data.__oldItem || !data.__newItem) {
      this.warn("AAA:291 -- onRenameItem Invalid data", data);
      return;
    }

    data.__oldItem.origin = origin;
    data.__newItem.origin = origin;
    super.onRenameItem(data);
    if (origin == "mfs") return;
    data.args = {
      src: { ...data.__oldItem },
      dest: { ...data.__newItem },
      changelog: { ...data.__changelog }
    };
    MfsScheduler.log("media.rename", data);
  }

  /**
   * intentionally void
   */
  checkUserInteraction() { }

  /**
   *
   */
  _onWinClose() {
    this.debug("AAAAA:197 **************");
    this.trigger("desktop-close");
  }

  /**
   *
   * @param {*} data
   */
  dispatchInboundCall(data) {
    const currentRoom =
      Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
    if (!currentRoom || currentRoom.isDestroyed()) {
      Minishell.exec("window.maximze");
    }
    super.dispatchInboundCall(data);
  }

  /**
   *
   */
  onDomRefresh() {
    this.on(WS_EVENT, this.onDownstreamMfsEvent)
    super.onDomRefresh();
    Kind.waitFor("electron_activity").then(() => {
      this.append({ kind: "electron_activity", signal: "mfs:activity" });
      window.mfsActivity = this.children.last();
      setTimeout(this.checkForUpdate.bind(this), 60 * 1000);
      this.preset()
    });
  }


  /**
   *
   */
  async checkForUpdate(args) {
    this.debug("AAA:292 -- checkForUpdate");
    let check = await Minishell.exec("updater.checkForUpdates", args);
    this.debug("AAA:292", check);
    if (check.updateAvailable && check.version) {
      this.__wrapperTooltips.$el.addClass("check-update");
      this.__wrapperTooltips.feed(
        require("./skeleton/electron/new-version").default(this, check)
      );
    }
    setTimeout(() => {
      this.checkForUpdate();
    }, 60 * 60 * 1000);
  }

  /**
   *
   * @param {*} files
   */
  async _changeGlobalSettings(data) {
    delete data.nid;
    this.debug("AAA:55", data, data.effective != this.mget(EFFECTIVE));
  }

  /**
   *
   * @param {*} files
   */
  _showChangelog(files) {
    this.debug("AAA:72", files);
    //this.__wrapperModal.feed({ kind: 'window_changelog', files });
  }

  /**
   *
   * @param {*} files
   */
  _showAlert(args) {
    this.alert(args.message);
  }

  /**
   * 
   * @param {*} args 
   * @returns 
   */
  async _showSettingChangeAlert(args) {
    let { engine, sync, direction, mode, effective } = args;
    this.mset({ engine, sync, sync_direction, sync_mode, effective });
    this.debug("AAA:366", {
      engine,
      sync,
      direction,
      mode,
      effective,
    });
    let changes = await MfsWorker.getChangelog();
    if (!this.hasChanges(changes)) {
      return;
    }
    this.modal({ kind: "window_changelog", ...args, screen: 'showChanges' });
  }

  /**
   *
   */
  _showHelpDesk() {
    this.debug("AAA:28 -- HELPDESK");
    this.launch({ kind: "window_helpdesk" }, { explicit: 1, singleton: 1 });
  }

  /**
   *
   */
  modal(opt) {
    //console.trace();
    this.__wrapperModal.feed(opt);
  }

  /**
   *
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    this.debug(`AAA:375 service=${service}`, cmd, args);
    switch (service) {
      case "install-new-version":
        Minishell.exec("updater.quitAndInstall");
        this.debug("Restarting....");
        return;
      case "close-update-popup":
        return this.__wrapperTooltips.clear();

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   */
  newVersion() {
    // DO NOT REMOEVE
    // Overload parent behavior. Electron doesn't need to reload upon hash changed
  }

  /**
   *
   */
  _handleVersion(args) {
    this.debug("AAA:361", args);
    this.__wrapperTooltips.$el.addClass("check-update");
    this.__wrapperTooltips.feed(
      require("./skeleton/electron/new-version").default(this, args)
    );
  }

  /**
   *
   */
  async _handleSyncHelp() {
    let { settings } = await MfsWorker.getEnv();
    this.debug("AAA:43 settings ", settings)
    this.debug("SHOW HELP", this.mget('localRoot'))

    this.modal({
      kind: "window_changelog",
      screen: "help",
      localRoot: this.mget('localRoot'),
      effective: this.mget(EFFECTIVE),
    });
  }

  /**
   *
   */

  _handleUpdateProgress(args) {
    this.debug("AAA:432 _handleUpdateProgress", args);
    if (this.__updateProgress) {
      this.__updateProgress.el.style.width = `${args.percent}%`;
    }
  }

  // onWsMessage(service, data, options = {}) {
  //   this.verbose("onWsMessage[1410]: ", options.service, data, options, this);
  // }
}

module.exports = __window_manager;
