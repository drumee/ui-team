// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/welcome/welcome
//   TYPE : 
// ==================================================================== *

class __electron_updater extends LetcBox {
  constructor() {
    super(...arguments);
    // edBridge.send('check-update-on-init', {});
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this.onCheckingUpdate = this.onCheckingUpdate.bind(this);
    this.onUpdateAvailable = this.onUpdateAvailable.bind(this);
    this.onUpdateNotAvailable = this.onUpdateNotAvailable.bind(this);
    this.onUpdateError = this.onUpdateError.bind(this);
    this.onDownloadProgress = this.onDownloadProgress.bind(this);
    this.onDownloaded = this.onDownloaded.bind(this);
    this.updateAction = this.updateAction.bind(this);
  }

  // >>=========================================================

  // >>=========================================================
  initialize(opt) {
    require('./skin');
    this.mset({
      flow: _a.y,
      restartapp: 0,
      updateavailable: 0
    });
    super.initialize(opt);
    this.debug("AAA:43", this);
    edBridge.on('updater-web-checking', this.onCheckingUpdate.bind(this));
    edBridge.on('updater-web-available', this.onUpdateAvailable.bind(this));
    edBridge.on('updater-web-not-available', this.onUpdateNotAvailable.bind(this));
    edBridge.on('updater-web-error', this.onUpdateError.bind(this));
    edBridge.on('updater-web-download-progress', this.onDownloadProgress.bind(this));
    edBridge.on('updater-web-download-ended', this.onDownloaded.bind(this))
    return this.declareHandlers();

  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onCheckingUpdate(param) {
    this.debug(param, "CHECKING UPDATE *****")
    let info = { content: `${LOCALE.PROCESSING}...` };
    let subInfo = { content: `${LOCALE.CURRENT_VERSION}: ${param.version}` };
    this.updateAction({info, subInfo});
  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onUpdateAvailable(param) {
    this.debug(param, "Update Available *****");
    if (!param.info) return;
    let info = { content: `${LOCALE.UPDATE_AVAILABLE} ${param.info.version}` };
    this.mset({
      downloading_version: param.info.version
    });
    this.updateAction({info});
  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onUpdateNotAvailable(param) {
    this.debug(param, "Update not Available *****");
    let info = { content: LOCALE.UPDATE_NOT_AVAILABLE };
    let action = {
      content: LOCALE.CLOSE,
      service: _e.close
    };
    this.updateAction({info, action});
  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onUpdateError(param) {
    this.debug(param, "UPDATE Error *****");
    let info = { content: LOCALE.NO_UPDATE };
    let action = {
      content: LOCALE.CLOSE,
      service: _e.close
    };
    if(param.error) info.content = param.error;
    this.updateAction({info, action});
  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onDownloadProgress(param) {
    //this.debug(param, "Download Progress *****");
    let subInfo = { 
      content: `${LOCALE.DOWNLOADING_NEW_VERSION}: ${this.mget('downloading_version')} - ${Math.round(param.info.percent)}%` 
    };
    this.__progressBar.el.style.width = `${Math.round(param.info.percent)}%`;
    this.updateAction({subInfo});
  }

  /**
   * 
   * @param {*} e 
   * @param {*} param 
   */
  onDownloaded(param) {
    this.debug(param, "AAA:123 Downloaded", this.__button);
    let info = { content: `${LOCALE.UPDATE_COMPLETED_NEW_VERSION_IS}:  ${param.info.version}` };
    let action = {
      content: LOCALE.START_LATEST_VERSION,
      service: 'restart'
    };
    this.updateAction({info, action});
  }

  /**
   * 
   * @param {*} info 
   * @param {*} subInfo 
   * @param {*} action 
   */
  updateAction(opt) {
    if(!opt) return;
    opt.info && this.__infoData.set(opt.info);
    opt.subInfo && this.__subInfo.set(opt.subInfo);
    if (_.isEmpty(opt.action)) {
      this.__button.set(opt.action);
      setTimeout(() => {
        this.__button.el.dataset.state = 0;
      }, 300);
    } else {
      this.__button.set(opt.action);
      setTimeout(() => {
        this.__button.el.dataset.state = 1;
      }, 300);
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require("./skeleton")(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    var service;
    service = cmd.model.get(_a.service);
    this.debug(`AAA:108 -- onUiEvent service=${service}`, cmd, args, cmd.status, this);
    switch (service) {
      case 'install':
        edBridge.send('web-updater-download', {});
        break;
      case 'restart':
        let action = {
          content: LOCALE.INITIALIZING,
          service: ''
        };
        this.updateAction({action});
        setTimeout(() => {
          edBridge.send('web-updater-quit+install', {});
        }, 500);  
        break;
      case _e.close:
        this.triggerHandlers({service})
        this.goodbye();
        break;
      default:
        break;
    }
    return cmd = null;
  }

  __dispatchRest(method, data) {
  }

};

// __electron_updater.prototype.figName = "electron_updater";

module.exports = __electron_updater;
