const ATTRIBUTES = [
  _a.nid,
  _a.pid,
  _a.hub_id,
  _a.filepath,
  _a.filename,
  _a.filetype,
  _a.src,
  _a.target,
  _a.type,
  _a.dest,
  _a.ctime,
  _a.mtime,
  _a.privilege,
  'inode',
  'src_name',
  'src_ext',
  'dest_name',
  'dest_ext'
];

/**
 * @extends LetcBox
*/
class __media_local extends LetcBox {

  /**
   * @param {*} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.contextmenuSkeleton = require('builtins/contextmenu/skeleton');
    if (this.mget('conflict')) {
      this.attribute.set({ conflict: 1 });
    }
    this.channel = opt.nid || opt.filepath;
    mfsActivity.on(
      `mfs-media-state:${this.channel}`, this.handleSyncEvents.bind(this)
    );
  }

  /**
   * 
   * @param {*} data 
   */
  handleSyncEvents(data) {

    this.debug("AAA:49", this, this.getHandlers(_a.ui), data);
    if (data && data.phase) this.goodbye();
  }
  /**
   * 
   */
  onDestroy() {
    mfsActivity.off(
      `mfs-media-state:${this.channel}`, this.handleSyncEvents.bind(this)
    );
    this.triggerHandlers({ service: "local-closed" })
  }

  /**
   * 
   */
  contextmenuItems() {
    let fileItems;
    let debugAction = null;
    // if (Visitor.profile().devel) debugAction = 'applyChange';
    debugAction = 'applyChange';
    if (this.mget(_a.target) == 'remote') {
      if (this.mget(_a.type) == 'ignored') {
        fileItems = ['removeFromCloud', 'enableSync'];
        // fileItems = [_e.show, 'removeFromCloud', 'enable_sync'];
      } else {
        switch (this.mget(_a.type)) {
          case 'deleted':
            fileItems = ['revertToCloudEntity', 'seeCloudEntity'];
            break;
          case 'created':
            fileItems = ['reverLocalCreated', 'seeLocalEntity'];
            break;
          case 'changed':
            fileItems = ['revertToCloudContent', 'seeLocalEntity', 'seeCloudEntity'];
            break;
          case 'renamed':
            fileItems = ['revertToCloudName'];
            break;
          case 'moved':
            fileItems = ['revertToCloudLocation'];
            break;
          default:
            fileItems = ['sendToCloud'];
        }
        //fileItems.unshift('seeCloudEntity');
      }
    } else { // Target = local
      if (this.mget(_a.type) == 'ignored') {
        fileItems = [_e.show, 'removeFromLocal', 'enableSync'];
      } else {
        switch (this.mget(_a.type)) {
          case 'deleted':
            fileItems = ['revertToLocalEntity', 'seeLocalEntity'];
            break;
          case 'changed':
            fileItems = ['revertToLocalContent', 'seeLocalEntity', 'seeCloudEntity'];
            break;
          case 'renamed':
            fileItems = ['revertToLocalName'];
            break;
          case 'moved':
            fileItems = ['revertToLocalLocation'];
            break;
          default:
            fileItems = ['sendToComputer'];
        }
        fileItems.unshift('seeLocalEntity');
      }
    }
    if (debugAction) fileItems.unshift(debugAction);
    fileItems.push('disableSync');
    return fileItems;
  }

  /**
   * @param {*} child
   * @param {*} pn
  */
  onPartReady(child, pn) { return null; }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
    this.$el.addClass(this.mget(_a.type));
  }

  /**
   * 
   */
  getData() {
    let data = {};
    let m = this.model;
    for (var k of ATTRIBUTES) {
      if ([_a.filename, _a.filepath].includes(k)) {
        data[k] = m.get(k).replace(/\<.+\>/g, '');
      } else {
        data[k] = m.get(k);
      }
    }
    return data;
  }

  /**
   * 
   */
  async refreshStates() {
    let handlers = this.getHandlers(_a.ui);
    for (var h of handlers) {
      if (h.refreshStates) {
        await h.refreshStates();
      }
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.type);
    if (!service) service = "web-mfs-open-media";
    this.debug(`onUiEvent service = ${service}`, this);
    let data = this.getData();
    let attr = { ...data };
    switch (service) {
      case 'disableSync':
        let opt = { sync: 0, target: 'remote' };
        this.mset(opt);
        MfsWorker.disableItemSync({ ...data, ...opt });
        break;

      case 'enableSync':
        opt = { sync: 1, target: 'remote' };
        this.mset(opt);
        MfsWorker.enableItemSync({ ...data, ...opt });
        break;

      case 'applyChange':
        this.debug("AAAA:199", this);
        MfsWorker.syncItem({ ...data, target: this.mget(_a.target), type: this.mget(_a.type) });
        return;

      case 'removeFromCloud':
        if (this.mget('nodetype') == _a.file) {
          MfsScheduler.log('file.deleted', data);
        } else {
          MfsScheduler.log('folder.deleted', data);
        }
        return;

      case 'revertToCloudEntity':
        MfsScheduler.log('media.init', data);
        return;

      case 'revertToCloudContent':
        MfsScheduler.log('media.init', { ...data, args: { force: 1 } });
        return;

      case 'revertToCloudName':
        attr = { ...data };
        data.__newItem = {
          ...attr,
          filepath: data.src,
          filename: data.src_name,
          ext: data.src_ext
        };
        data.__oldItem = {
          ...attr,
          filepath: data.dest,
          filename: data.dest_name,
          ext: data.dest_ext,
        };
        //this.debug("AAA:216", data);
        MfsScheduler.log('media.rename', data);
        return;

      case 'mfs-use-local-name':
        MfsWorker.syncItem({ ...data, target: 'remote', type: this.mget(_a.type) });
        return;

      case 'reverLocalCreated':
        // To revert locally created entity, remove it
        MfsScheduler.log('fs.remove', data);
        return;

      case 'saveToCloud':
        if (this.mget('nodetype') == _a.file) {
          MfsScheduler.log('file.created', data);
        } else {
          MfsScheduler.log('folder.deleted', data);
        }
        return;


      case 'seeLocalEntity':
        MfsScheduler.log('media.open', data);
        return;

      case 'seeCloudEntity':
        Wm.openContent(data);
        return;

      default:
        edBridge.send(service, data);
      //super.onUiEvent(cmd, args);
    }
  }
  /**
   * @param {*} xhr
   * @param {*} socket
  */
  on_rest_error(xhr, socket) {
    this.warn(`GOT SERVER ERROR :`, xhr);
  }
}


module.exports = __media_local