const OPEN_NODE = "open-node";

const mfsInteract = require('../interact');
class __window_trash extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._restoreFile = this._restoreFile.bind(this);
    this._deleteFiles = this._deleteFiles.bind(this);
    this._openNode = this._openNode.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.isTrash = 1;
    this.mset({
      hub_id: Visitor.id,
      privilege: _K.privilege.owner
    });
    this.style.set({
      left: window.innerWidth - this.size.width - Wm.$el.offset().left - 10,
      top: window.innerHeight - this.size.height - Wm.$el.offset().top - 75,
      width: this.size.width,
      height: this.size.height
    });
    this.contextmenuSkeleton = 'a';
    this.purgeInProgress = 0;
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.targetOnClose = this.mget(_a.trigger).$el; //Desk.bin.$el    
    const f = () => {
      this.feed(require("./skeleton/main")(this));
    };
    this.waitElement(this.el, f);
    return super.onDomRefresh();
  }

  /**
   * 
   * @param {*} media 
   * @returns 
   */
  _restoreFile(media) {
    if (!media) return;
    return this.postService({
      service: SERVICE.media.restore_into,
      hub_id: Visitor.id,
      recipient_id: Visitor.id,
      pid: Visitor.get(_a.home_id),
      list: [{
        nid: media.mget(_a.nid),
        pid: Visitor.get(_a.home_id),
        hub_id: media.mget(_a.hub_id),
        recipient_id: Visitor.id
      }]
    }).then((data) => {
      Wm.insertMedia(data, 0);
      media.suppress();
      this.feed(require("./skeleton/main")(this));
      Wm.reloadAll();
      if (this._refreshWm) {
        return Wm.reload();
      }
    });

  }

  /**
   * @param {Letc} media
  */
  deleteFilePermanently(media) {
    if (!media) return;

    const listOpt = {
      nid: media.mget(_a.nid),
      hub_id: media.mget(_a.hub_id)
    }

    this.postService({
      service: SERVICE.media.purge,
      list: [listOpt],
      hub_id: Visitor.id
    }).then((data) => {
      Array.from(data).map((row) =>
        this.removeById(row.id));
    });
  }

  /**
   * 
   * @returns 
   */
  _deleteFiles() {
    const list = this.getLocalSelection();
    if (_.isEmpty(list)) {
      return this.confirm(LOCALE.Q_DELETE_ALL_FILES).then(() => {
        this.postService({
          service: SERVICE.media.empty_bin,
          hub_id: Visitor.id
        }).then((data) => {
          this.feed(require("./skeleton/main")(this));
          RADIO_MEDIA.trigger(_a.free, data)
        })
      });
    } else {
      const files = [];
      for (let v of Array.from(list)) {
        if (v.model.get(_a.filetype) !== _a.hub) {
          let a = {
            nid: v.model.get(_a.nodeId),
            hub_id: v.model.get(_a.hub_id)
          }
          files.push(a);
        } else {
          files.push(v.model.get(_a.nodeId));
        }
      }
      return this.postService({
        service: SERVICE.media.purge,
        list: files,
        hub_id: Visitor.id
      });
    }
  }

  /**
   * 
   * @param {*} media 
   * @returns 
   */
  _openNode(media) {
    const ftype = media.get(_a.filetype);
    return this.debug(`NOP because ${media.get(_a.filename)} has been deleted`, media);
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    const api = {
      service: SERVICE.media.show_bin,
      page: 1,
      hub_id: Visitor.id
    };

    return api;
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {

      case "empty-bin":
        return this._deleteFiles();

      case 'delete-permanently':
        return this.deleteFilePermanently(cmd);

      case 'restore-to-desk':
        return this._restoreFile(cmd);

      default:
        return super.onUiEvent(cmd);
    }
  }

  /**
   * 
   */
  async purgeContent(data) {
    let { phase, progress, count, total } = data;
    if (total < 10 || (progress > 95 && !this.purgeInProgress)) return
    switch (phase) {
      case "prepare":
        if (this.purgeInProgress) break;
        this.purgeInProgress = 1;
        await Kind.waitFor('progress_bar')
        this.append(require('./skeleton/progress')(this));
        break
      case "progress":
        if (!this.purgeInProgress) {
          this.purgeInProgress = 1;
          await Kind.waitFor('progress_bar');
          await this.ensurePart(_a.list);
          this.append(require('./skeleton/progress')(this));
        }
        this.ensurePart('progress').then((p) => {
          p.update(progress)
        })
        break
      case "completed":
        this.purgeInProgress = 0;
        this.ensurePart('progress-container').then((p) => {
          p.suppress()
        })
        break;
    }
  }
  /**
   * 
   * @param {*} data 
   * @returns 
   */
  putIntoTrash(data) {
    if (!this.isTrash) {
      return;
    }
    data.kind = this._getKind();
    data.service = OPEN_NODE;
    data.uiHandler = [this];
    this.iconsList.append(data);
    this.syncBounds();
  }

  /**
   * 
   */
  removeContent(args) {
    if (_.isArray(args)) {
      for (let item of args) {
        this.putIntoTrash(item)
      }
      return;
    }
    this.putIntoTrash(args)
  }

  /**
   * 
   * @param {*} args 
   */
  updateContent(args) {
    /** DO NOT DELETE */
  }

  /**
   * 
   * @param {*} xhr 
   * @param {*} options 
   */
  newContent(xhr, options = {}) {
    /** DO NOT DELETE */
  }

  /**
    * 
    * @param {*} xhr 
    * @param {*} options 
    */
  renameContent(data) {
    /** DO NOT DELETE */
  }

  /**
   * 
   */
  moveContent() {
    /** DO NOT DELETE */
  }
}

module.exports = __window_trash;

// -------------------------- END OF MODULE ----------------------- #
