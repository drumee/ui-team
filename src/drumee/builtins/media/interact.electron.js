const EFFECTIVE = "effective"

/**
 *
 * @param {*} service
 * @param {*} data
 */
const __interact = require("./interact");
class __media_interact_electron extends __interact {
  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    super.initialize(opt);

    mfsActivity.on(
      `mfs-media-state:${opt.nid}`,
      this.handleSyncEvents.bind(this)
    );
    mfsActivity.on(`mfs-media-state:*`, this.handleSyncEvents.bind(this));
    this.on("media:created", this.syncLocalData.bind(this));
    this.on("media:modified", this.onRemoteModified.bind(this));
  }

  /**
   *
   */
  onBeforeDestroy() {
    super.onBeforeDestroy();
    let nid = this.mget(_a.nid);
    mfsActivity.off(`mfs-media-state:${nid}`, this.handleSyncEvents.bind(this));
    this.off("media:created", this.syncLocalData.bind(this));
    this.off("media:modified", this.onRemoteModified.bind(this));
  }

  /**
   *
   */
  async shouldSync() {
    const data = this.getDataForSync();
    if (!data) return;
    await mfsActivity.populatingCompleted();
    let effective = mfsActivity.syncEnabled();
    if (!effective) {
      this.handleSyncIcon({ effective: 0 });
      return;
    }
    MfsWorker.getSyncParams(data).then((args) => {
      this.handleSyncIcon(args);
    });

  }

  /**
   *
   * @param {*} opt
   */
  restart(opt) {
    super.restart(opt);
    this.handleSyncIcon();
  }

  /**
   *
   */
  handleSyncIcon(args) {
    if (args) {
      this.mset(args);
    }
    let tag = "no-sync";
    let el = document.getElementById(`${this._id}-${tag}`);
    if (this.mget(EFFECTIVE)) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      this.content.$el.prepend(require("./template/svg")(this, tag, tag, ""));
    }
  }
  /**
   *
   */
  _setupInteract() {
    super._setupInteract();
    this.shouldSync();
  }

  /**
   *
   * @param {*} data
   */
  refreshSyncView(data) {
    this.mset({ flags: data.flags });
    this.content.el.innerHTML = this.innerContent(this);
    this._setupInteract();
  }

  /**
   *
   */
  defaultTrigger(e) {
    this.debug(
      `AAA:105 filetype=${this.mget(_a.filetype)}`,
      mfsActivity.mget(EFFECTIVE),
      this.mget(EFFECTIVE)
    );
    if (!mfsActivity.syncEnabled()) {
      super.defaultTrigger(e);
      return;
    }
    let data = this.getDataForSync();
    if (this.mget(_a.filetype) == _a.document) {
      if (this._unseen) {
        this.markAsSeen();
      }
      setTimeout(() => {
        let d = lastDblClick.timeStamp - lastClick.timeStamp;
        this.debug(`AAA:112`, d, this.mget(_a.filepath), data);
        if (d > 0 && d < 100) {
          MfsScheduler.log("media.open", data);
        } else {
          super.defaultTrigger(e);
        }
      }, 300);
    } else {
      if (this.mget(EFFECTIVE) && this.isHubOrFolder) {
        MfsScheduler.log("media.browse", data);
      }
      super.defaultTrigger(e);
    }
  }

  /**
   *
   * @param {*} service
   * @param {*} data
   * @param {*} options
   * @returns
   */
  handleSyncEvents(data) {
    let progress = this._progress && !this._progress.isDestroyed();
    let { phase, effective, inherited, filepath } = data;
    switch (phase) {
      case "replacing":
      case "uploading":
      case "downloading":
        if (progress) break;
        let cancelable = data.phase == "uploading" ? 0 : 1;
        let mode = this.isGrid ? _a.grid : _a.row;
        this.append({
          kind: "progress",
          size: data.filesize,
          filename: LOCALE.SYNC_IN_PROGRESS, //data.filename,
          cancelable,
          mode,
          delay: 2000,
        });
        this._progress = this.children.last();
        this._progress.once(_e.cancel, () => {
          this.el.dataset.disabled = 0;
          data = this.getDataForSync();
          MfsWorker.abortSync(data);
        });
        this.el.dataset.disabled = 1;
        break;
      case "progress":
        this.el.dataset.disabled = 1;
        progress && this._progress.update(data);
        break;
      case "downloaded":
      case "uploaded":
        this.el.dataset.disabled = 0;
        this._progress && this._progress.goodbye();
        break;
      case "sync-state":
      case "end-of-task":
        if (effective === null) effective = 1;
        this.mset({ effective, inherited });
        this.restart();
        break;
    }
  }

  /**
   *
   */
  async syncLocalData() {
    this.debug(
      `AAA:133 --`,
      this.mget(EFFECTIVE),
      mfsActivity.mget(EFFECTIVE)
    );
    if (!mfsActivity.mget(EFFECTIVE) || this.mget(EFFECTIVE) === 0)
      return;
    let data = this.getDataForSync();
    if (!data || this.mget(_a.origin) == "websocket") return;
    MfsScheduler.log("media.init", data);
  }

  /**
   *
   * @returns
   */
  async onRemoteModified() {
    if (!mfsActivity.mget(EFFECTIVE) || this.mget(EFFECTIVE) === 0)
      return;
    let data = this.getDataForSync();
    if (!data) return;
    MfsScheduler.log("media.replace", data);
  }

  /**
   *
   * @param {*} ui
   * @param {*} event
   */
  contextmenuItems() {
    let items = super.contextmenuItems();
    this.debug("AAA:220", items)
    if (this.mget(EFFECTIVE)) items.unshift("showLocalLocation");
    console.trace()
    return items;
  }

  /**
   *
   * @returns
   */
  contextmenuItemsForHub() {
    let fileItems = super.contextmenuItemsForHub();
    if (mfsActivity.syncEnabled()) {
      if (this.mget(EFFECTIVE)) {
        fileItems.push("disableSync");
      } else {
        if (
          !this.mget("inherited") ||
          this.mget(_a.pid) == Visitor.get(_a.home_id)
        ) {
          fileItems.push("enableSync");
        }
      }
    }
    if (this.mget(EFFECTIVE)) {
      fileItems.unshift("seeLocalEntity");
    }
    return fileItems;
  }

  /**
   *
   */
  contextmenuItemsForFiles() {
    let fileItems = super.contextmenuItemsForFiles();
    let index = _.findIndex(fileItems, function (e) {
      return /^(unlock|lock)$/.test(e);
    });
    if (this.mget(EFFECTIVE)) {
      fileItems.splice(index, 0, "disableSync");
    } else {
      if (!this.mget("inherited")) fileItems.splice(index, 0, "enableSync");
    }
    //
    //this.debug('AAA:270', this, fileItems);
    fileItems.unshift("seeLocalEntity");
    return fileItems;
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.debug(`AAA:224 service=${service}`, this.mget(_a.path), args);
    let data = this.getDataForSync();
    let opt;
    switch (service) {
      case "disableSync":
        opt = { effective: 0, target: "remote" };
        this.mset(opt);
        MfsWorker.disableItemSync({ ...data, ...opt }).then(() => {
          this.restart();
        });
        break;

      case "enableSync":
        let effective = mfsActivity.syncEnabled();
        if (!effective) {
          Wm.showSyncTiips()
          return;
        }
        opt = { effective: 1, target: "remote" };
        this.mset(opt);
        MfsWorker.enableItemSync({ ...data, ...opt }).then((o) => {
          this.restart();
        });
        break;

      case "mfs-apply-remote":
        MfsWorker.syncItem({ ...data, bound: "remote" });
        break;

      case "mfs-apply-local":
        MfsWorker.syncItem({ ...data, bound: "local" });
        return;

      case "seeLocalEntity":
        data.args = { force: 1 };
        MfsScheduler.log("media.open", data);
        return;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   */
  _onMoveDone(data, socket) {
    this.debug("AAA:330", this.executedService, this.mget(_a.origin), data, socket, this);
    super._onMoveDone(data, socket);
    let opt = data;
    if (_.isArray(data)) opt = data[0];
    delete opt.uiHandler;
    if (this.mget(_a.origin) == "websocket") return;
    if (opt.__newItem && opt.__oldItem) {
      let src = { ...opt.__oldItem };
      let dest = { ...opt.__newItem };
      delete opt.__newItem;
      delete opt.__oldItem;
      opt.args = { src, dest };
    }
    MfsScheduler.log(this.executedService, opt);
  }

  /**
   *
   */
  afterMoveIn(m, paste = 0, mode, data) {
    this.debug("AAA:343", this.executedService, data, this);
    super.afterMoveIn(m, paste, mode, data);
    let opt = data;
    if (_.isArray(data)) opt = data[0];
    delete opt.uiHandler;
    if (this.mget(_a.origin) == "websocket") return;
    if (opt.__newItem && opt.__oldItem) {
      let src = { ...opt.__oldItem };
      let dest = { ...opt.__newItem };
      delete opt.__newItem;
      delete opt.__oldItem;
      opt.args = { src, dest };
    }
    MfsScheduler.log(this.executedService, opt);
  }
}

module.exports = __media_interact_electron;
