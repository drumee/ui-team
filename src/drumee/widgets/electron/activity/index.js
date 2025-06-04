let POPULATED = 0;
const EFFECTIVE = "effective"
class ___electron_activity extends LetcBox {
  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this.skeleton = require("./skeleton")(this);
    require("../../../router/bridge")(this, {
      "mfs-activity": "_mfsActivity",
      "menu-sync-changed": "_syncOptChanged",
    });
    this.max = 5;
    this.loaded = {};
    this.total = {};
  }

  /**
   * 
   * @param {*} settings 
   */
  _syncOptChanged(settings) {
    this.mset(settings);
  }

  /**
   * 
   */
  syncEnabled() {
    if (this.mget(EFFECTIVE) == null || !POPULATED) {
      MfsWorker.getEnv().then((args) => {
        const { populated, settings } = args;
        POPULATED = populated;
        this.mset(settings);
      });
      return 0;
    }
    return this.mget(EFFECTIVE);
  }

  /**
   * 
   */
  populatingCompleted() {
    if (this.pendingPopulate) return this.pendingPopulate;
    this.pendingPopulate = new Promise((accept) => {
      if (POPULATED) {
        accept();
        clearInterval(this._timer);
        return
      }
      this._timer = setTimeout(() => {
        MfsWorker.getEnv().then((args) => {
          const { populated, settings } = args;
          POPULATED = populated;
          clearInterval(this._timer);
          this.mset(settings);
          accept()
        })
      }, 1000);
    })
    return this.pendingPopulate;
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    MfsWorker.getSyncParams().then((args) => {
      this.mset(args);
      this.ensurePart('led').then((p) => {
        p.el.dataset.sync = this.mget(EFFECTIVE);
      })
    });
  }

  _mfsActivity2(data) {
    this.debug("AAAA:71", data)
  }
  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _mfsActivity(data) {
    if (!data) return;
    if (data.events == 0) {
      this.__led.setState(0);
    } else {
      this.__led.toggleState(this.__led.el);
    }
    let { phase, sync, filepath } = data;
    let channel = data.nid || data.filepath;
    //delete data.phase;
    switch (phase) {
      case "downloading":
      case "replacing":
      case "uploading":
      case "progress":
        this._updateItemProgress(data);
        this.trigger(`mfs-media-state:${data.nid}`, data);
        break;
      case "downloaded":
      case "uploaded":
        data.loaded = 0;
        data.total = 1;
        data.progress = 0;
        this._updateItemProgress(data);
        this.trigger(`mfs-media-state:${data.nid}`, data);
        break;
      case "end-of-task":
        this.trigger(`mfs-media-state:${channel}`, data);
        break;
      case "task-terminated":
        this.debug("AAA:116", data)
        this.trigger(`mfs-task-terminated:*`, data);
        break;
      case "sync-state":
        if (channel == "*") {
          this.mset(data);
        }
        this.trigger(`mfs-media-state:${channel}`, data);
        break;
      case "update":
        this.mset(data.payload);
        break;
      case "total":
        this._updateTotalProgress(data);
        break;
    }
  }

  /**
   *
   */
  mfsPopulated() {
    return POPULATED;
  }

  /**
   * @param {Object} data
   **************************/
  _updateItemProgress(data) {
    let w = "100%";
    if (data.progress != null) {
      w = `${Math.round(data.progress)}%`;
    } else if (data.loaded && data.total && !_.isNaN(data.total)) {
      w = `${100 * Math.round(data.loaded / data.total)}%`;
    }
    this.__progressItem.el.style.width = w;
  }

  /**
   * @param {Object} data
   **************************/
  _updateTotalProgress(data) {
    let w = "0";
    if (data.progress != null) {
      w = `${Math.round(data.progress)}%`;
    }
    if (data.progress >= 100) w = "0";
    this.__progressTotal.el.style.width = w;
  }
}

module.exports = ___electron_activity;
