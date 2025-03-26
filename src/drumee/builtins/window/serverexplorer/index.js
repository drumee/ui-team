
const { randomString } = require("core/utils")
const __window_singleton_interact = require('window/interact/singleton');

class __window_serverexplorer extends __window_singleton_interact {
  constructor(...args) {
    super(...args);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.isFolder  = 1;
    super.initialize(opt);

    this.type = opt.type;
    this.selectedImportFileList = [];
    this.selectedExportDestination = '';
    this.origin = opt.source;
    this._currentPath = "/";
    
    this._setSize({
      height: 480, width: 680,
      minHeight: 300, minWidth: 480,
    });

    this.skeleton = require("./skeleton").default(this);
    this.contextmenuSkeleton = 'a';

    this.bindEvent(_a.live);
  }

  /**
   * 
  */
  onDomRefresh() {
    this.raise();
  }
  
  /**
   * @param {*} child 
   * @param {*} pn 
  */
  onPartReady (child, pn) {
    switch(pn) {
      case _a.content:
        this._content = child;
        const fileList = {
          kind : 'widget_efs_list',
          path : '/',
          type : this.type,
          showBreadcrumb: false,
          uiHandler: this
        }
        this._content.feed(fileList);
        this.setupInteract();
        break;

      case 'breadcrumbs':
        this.breadcrumbs = child;
        break;
      
      case "breadcrumbs-roll":
        this.breadcrumbsRoll = child;
        child.collection.on(_e.remove, () => {
          if (child.collection.length === 0) {
            this.__breadcrumbsContainer.setState(0);
          }

          if (child.collection.length) {
            return this.__breadcrumbsContainer.setState(1);
          }
        });
        this.trigger('breadcrumbs-roll-ready');
        break;
  
      // default:
      //   super.onPartReady(child, pn);
    }
  }

  /**
   * 
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service)
    this.debug(`onUiEvent service = ${service}`, cmd, this, args)

    switch (service) {
      case _a.openLocation:
        if (cmd.mget(_a.role) == _a.breadcrumbs) {
          return this.openLocation(cmd);
        }
        return this.openLocation(cmd.source);

      case "previous":
        return this.previousLocation();

      case 'select-file':
        if (this.type == _a.import) {
          return this.selectImportFilesList(cmd.source);
        } else {
          return this.selectExportFilesList(cmd.source);
        }

      case 'import-files':
        return this.importFiles();

      case 'export-files':
        return this.exportFiles();

      case _e.mkdir:
        return this.createDirectory();

      case 'close-model':
        return this.closeOverlay();

      case 'close-overlay':
        return this.closeOverlay();

      case _e.close:
        return this.goodbye();
      
      case 'hide-progress':
        const progressEl = Wm.getItemsByAttr('transactionId', this._transactionId)[0];
        return setTimeout(() => {
          progressEl.el.hide();
        }, 1000);

      //   default:
      //     super.onUiEvent(cmd, args);
    }
  }

  /**
   * 
   */
  openLocation (source) {
    this.debug('openLocation', source, this);
    let path = source.mget(_a.path);
    const fileList = {
      kind : 'widget_efs_list',
      path : path,
      type : this.type,
      showBreadcrumb: true,
      uiHandler: this
    }

    this._currentPath = path;

    if (path == '/') {
      fileList.showBreadcrumb = false;
      this.updateBreadcrumbs(path);
    } else {
      this.__buttonsContainer.el.dataset.mode = _a.open;
    }

    // resetting the previously selected files
    if (this.type == _a.import) {
      this.__filesCount.set({content: '1'});
      if (path == '/') {
        this.__filesCount.set({content: '0'});
        this.__buttonsContainer.el.dataset.mode = _a.closed;
      }
    }
    this.selectedImportFileList = [path];
    this._content.feed(fileList);
    return
  }

  /**
   * 
   */
  previousLocation() {
    var last = this.breadcrumbsRoll.children.last();
    var breadcrumbsChild = this.breadcrumbsRoll.children;
    var previousIndex = breadcrumbsChild.length - 2;
    if (previousIndex < 0) {
      previousIndex = 0
    }
    const previousElement = this.breadcrumbsRoll.children.findByIndex(previousIndex)
    if (!previousElement) {
      return this.__breadcrumbsContainer.el.hide();
    }
    // this.debug('previous 111', previousElement, this);
    return this.openLocation(previousElement);
  }

  /**
   * @param {*} menu 
   * @returns 
   */
  adjustBreadcrumbs(menu) {
    return this.breadcrumbsRoll;
  }

  /**
   * 
   */
  createDirectory() {
    return this.openOverlay({
      kind :"widget_sv_new_folder",
      type: this.type,
      path: this._currentPath,
      uiHandler: this,
      source: this
    });
  }

  /**
   * 
  */
  selectImportFilesList (cmd) {
    const data = this.getData(_a.formItem);
    this.selectedImportFileList = data.fileList.filter(row=> row.file).map(row=> { return row.file});
    
    // to set the files list count and show/hide buttons
    const selectedFilesCount = this.selectedImportFileList.length || '0';
    this.__filesCount.set({content: selectedFilesCount}); 
    
    if (selectedFilesCount > 0) {
      this.__buttonsContainer.el.dataset.mode = _a.open;
    } else if ((selectedFilesCount == 0) && (this._currentPath == '/')) {
      this.__buttonsContainer.el.dataset.mode = _a.closed;
    }
    return
  }

  /**
   * 
   */
  selectExportFilesList (cmd) {
    const data = this.getData(_a.formItem);
    this.selectedExportDestination = data.fileList.filter(row=> row.file).map(row=> { return row.file}).toString();
    return
  }

  /**
   * 
  */
  fetchImportMediaAttr(media) {
    let opt = {
      pid: media.mget(_a.nid),
      recipient_id: media.mget(_a.hub_id)
    }

    if (media.mget(_a.filetype) == _a.hub) {
      opt.pid = media.mget(_a.actual_home_id);
      opt.recipient_id = media.mget(_a.nid);
    }

    return opt;
  }

  /**
   * 
  */
  fetchExportMediaAttr(media) {
    let opt = {
      nid: media.mget(_a.nid),
      hub_id: media.mget(_a.hub_id)
    }

    if (media.mget(_a.filetype) == _a.hub) {
      opt.nid = media.mget(_a.actual_home_id);
      opt.hub_id = media.mget(_a.nid);
    }

    return opt;
  }
  /**
   * 
  */
  importFiles() {
    const opt = this.fetchImportMediaAttr(this.origin);
    this._transactionId = randomString(3);

    if (this.selectedImportFileList.length == 0) {
      this.selectedImportFileList = [this._currentPath];
    }

    let dataOpt = {
      service: "mfs.server_import",
      source_list: this.selectedImportFileList,
      hub_id: Visitor.id,
      transactionid: this._transactionId,
      ...opt
    }

    const progressSkeleton = require('./skeleton/progress')(this);
    Wm.windowsLayer.append(progressSkeleton);

    return this.fetchService(dataOpt, {async: 1}).then((res) => {
      // this.debug('importFiles api response', res, this);
      if(_.isEmpty(res)) return;
      return this.el.hide();
    }).catch((e) => {
      const progressEl = Wm.getItemsByAttr('transactionId', this._transactionId)[0];
      if (!_.isEmpty(progressEl)) { progressEl.goodbye(); }
      return this.warn(LOCALE.SOMETHING_WENT_WRONG);
    })
  }

  /**
   * 
  */
  exportFiles () {
    const opt = this.fetchExportMediaAttr(this.origin);
    this._transactionId = randomString(3);

    if (_.isEmpty(this.selectedExportDestination)) {
      this.selectedExportDestination = this._currentPath;
    }
    
    const progressSkeleton = require('./skeleton/progress')(this);
    Wm.windowsLayer.append(progressSkeleton);

    return this.fetchService({
      service: "mfs.server_export",
      nodes: [opt],
      destination: this.selectedExportDestination,
      transactionid: this._transactionId,
      hub_id: Visitor.id
    }, {async: 1}).then((res) => {
      // this.debug('exportFiles api response', res, this);
      if(_.isEmpty(res)) return;
      return this.el.hide();
    }).catch((e) => {
      const progressEl = Wm.getItemsByAttr('transactionId', this._transactionId)[0];
      if (!_.isEmpty(progressEl)) { progressEl.goodbye(); }
      return this.warn(LOCALE.SOMETHING_WENT_WRONG);
    })
  }

  /**
   * @param {object|null} skeleton
   * @return {void} 
   */
  openOverlay(skeleton = null) {
    const overlayWrapper = this.getPart('overlay-wrapper')
    overlayWrapper.el.dataset.mode = _a.open
    if (skeleton)
      return this.getPart('wrapper-overlay-notifier').feed(skeleton)
  }

  /*
   *
  */
  closeOverlay(cmd = {}) {
    const overlayWrapper = this.getPart('overlay-wrapper')
    const notifierWrapper = this.getPart('wrapper-overlay-notifier')
    notifierWrapper.feed('')
    overlayWrapper.el.dataset.mode = _a.closed
    notifierWrapper.el.dataset.mode = _a.closed
    return
  }

  /**
  * @param {*} data 
  * @returns 
  */
  updateBreadcrumbs(data) {
    if (data == '/') {
      return this.__breadcrumbsContainer.el.hide();
    } else {
      data = data.replaceAll(/(\/)+/g, '/').replace(/(\/)*$/i, '');
      let fileList = data.split('/');
      const p = [];
      let pat = '';
      for (let item of fileList) {
        const i = [];
        i[_a.filename] = item;
        if (item == '') { pat = '/'; }
        else { pat += `${item}/` }
        i[_a.path] = pat;

        p.push(require('./skeleton/breadcrumbs-item')(this, i));
      }

      let f = () => {
        this.breadcrumbsRoll.feed(p);
        this.breadcrumbsRoll.el.show();
        this._path = data;
        if (this.breadcrumbsRoll.collection.length < 2) {
          this.__breadcrumbsContainer.el.hide();
          if (this.actionContainer != null) {
            this.actionContainer.el.dataset.state = 0;
          }
        } else {
          this.__breadcrumbsContainer.el.show();
          if (this.actionContainer != null) {
            this.actionContainer.el.dataset.state = 1;
          }
          this.__breadcrumbsPrevious.el.show();
        }
      }

      if (!this.breadcrumbsRoll) {
        this.once('breadcrumbs-roll-ready', f);
      } else {
        f();
      }
    }
  }

  /**
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
  */
  onWsMessage(service, data, options) {
    this.debug(`AAA:415 ServerExplorer service=${service}`, data);
    switch(options.service) {
      case 'mfs.serverimport': 
      case 'mfs.serverexport':
        const progressEl = Wm.getItemsByAttr('transactionId', data.transactionid)[0];
        // this.debug('progressEl', progressEl, this);
        if (!_.isEmpty(progressEl)) {
          if (this._transactionId == data.transactionid) {
            this._dataProgress = data.progress;
            this.__progress.update(data.progress);
          }
          if ((data.progress == 100) || (data.phase == "completed")) {
            progressEl.el.show();
            return setTimeout(() => {
              progressEl.goodbye();
              this.goodbye();
            }, 1500);
          }
        } else {
          this.warn('progress bar not found');
        }
        return
    }
  }
}

module.exports = __window_serverexplorer;
