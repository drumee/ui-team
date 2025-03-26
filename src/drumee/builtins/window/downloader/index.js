
const { filesize } = require("core/utils")

/**
 * 
 */
const mfsInteract = require('../interact');
const MAX_BLOB_SIZE = 100000000;
class __window_downloader extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.style.set({
      width: this.size.width,
      height: this.size.height,
      left: window.innerWidth / 2 - this.size.width / 2
    });
    this._token = this.mget(_a.token) || ''
  }

  /**
   * 
   */
  onBeforeDestroy() {
    let nodes = this.mget(_a.nodes);
    for (let node of nodes) {
      node.unselect();
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    let nodes = this.mget(_a.nodes) || [];

    let list = [];
    let hub_id, nid;
    for (let node of nodes) {
      hub_id = node.mget(_a.hub_id);
      if (node.mget(_a.filetype) == _a.hub) {
        nid = node.mget(_a.actual_home_id)
      } else {
        nid = node.mget(_a.nid);
      }
      list.push({ hub_id, nid });
    }
    // Single folder
    if (this.mget(_a.folder)) list.push(this.mget(_a.folder));
    this._api = {
      service: SERVICE.media.zip_size,
      nodes: list,
      nid: 0,
      hub_id: this.mget(_a.hub_id) || Visitor.id,
      socket_id: Visitor.get(_a.socket_id),
    };
    if (this.mget(_a.token)) {
      this._api.hub_id = Host.id
      this._api.token = this.mget(_a.token);
    }
    this.mset({
      hub_id: this._api.hub_id,
      nid: this._api.nid
    });

    this.fetchService(this._api).then((data) => {
      this._zipsize = data.size;
      let size = filesize(data.size);
      let content = LOCALE.TOTAL_SIZE_OF_FILES.format(size);
      this.__filesize.set({ content });
    });
    this.raise();
  }


  /**
   * 
   */
  downloadFiles() {
    this.started = 1;
    let nodes = this.mget(_a.nodes);
    let f = () => {
      var v = nodes.shift();
      if (!v) {
        this.goodbye();
        return;
      }
      v.once(_e.loaded, f);
      v.download();
    }
    f();
  }

  /**
   * 
   */
  getFromUrl(opt) {
    let nid = opt.nid || this.mget(_a.nid) || Visitor.get(_a.home_id);
    let hub_id = opt.hub_id || this.mget(_a.hub_id) || Visitor.get(_a.id);
    let zip_id = opt.zipid || this._zipid;
    let { svc, keysel } = bootstrap();
    let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${zip_id}&keysel=${keysel}`;
    super.getFromUrl(url);
    Wm.alert(LOCALE.DOWNLOAD_LONG_TIME.format(opt.zipname, filesize(this._zipsize)));
    this.goodbye();
  }


  /**
   * 
   */
  prepareZip() {
    this._api.mode = ''; // wet run
    // Since it's an archive, there is no specific filename
    this._api.filename = Dayjs().format("[drumee]-YYYY-MM-DD");
    this.postService(this._api).then((data) => {
      this.feed(require('./skeleton/progress')(this, data.size));
      this._api.service = SERVICE.media.download;
      this._api.token = this._token;
      this.postService(this._api).then((opt) => {
        this.mset(opt);
        if (opt.wait == 0) {
          if (this._zipsize > MAX_BLOB_SIZE) {
            this.getFromUrl(opt);
          } else {
            this.downloadZip(opt);
          }
        }
      }).catch(this.warn.bind(this));
    }).catch(this.warn.bind(this));
  }

  /**
   * 
   */
  downloadZip(data) {
    if (this._isDownloading) return;
    if (this._zipsize > MAX_BLOB_SIZE) {
      this.getFromUrl(data);
      return;
    }
    this.__progress.setLabel(data.zipname);
    this.once(_e.eod, () => {
      this.__progress.setLabel(LOCALE.YOUR_DATA.printf(LOCALE.HAS_BEEN_SAVED));
      this.__btnCancel.suppress();
      this.__btnStatus.set({ content: LOCALE.ACK_REQ_OK });
      this.__btnAction.mset({ service: _e.close });
      this.el.show();
      this.raise();
      this.postService({ service: SERVICE.media.zip_release, id: data.zipid, token: this._token });
    });
    this._isDownloading = 1;
    this.__progress.restart(this._filesize);
    this.download_zip({ ...data, progress: this.__progress })
      .then()
      .catch((e) => {
        this.warn("GOT ERRO WHILE DOWNLOADING", e);
        // this.postService({service: SERVICE.media.zip_release, id:data.zipid});
        if (/aborted/.test(e)) {
          this.__progress.setLabel(LOCALE.CANCELED);
        } else {
          this.__progress.setLabel(e);
        }
      });

  }

  /**
   * 
   * @param {*} cmd 
   */
  abortDownload() {
    Wm.confirm({
      message: LOCALE.CONFIRM_CANCEL,
      confirm: LOCALE.CONFIRM,
      confirm_type: 'primary large',
      cancel: LOCALE.CLOSE,
      cancel_action: _e.close,
      buttonClass: 'abort-download',
      uiHandler: this,
      mode: 'hbf'
    }).then((o) => {
      this.postService({
        service: SERVICE.media.zip_cancel,
        id: this._zipid,
        hub_id: Visitor.get(_a.id),
        nid: Visitor.get(_a.home_id),
        cancelId: this._cancelId
      }).then(() => {
        this.goodbye();
      });
    }).catch(() => {
    })

  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service);
    switch (service) {
      case "download-files": case "prepare-zip": case 'abort-download':
        this[_.camelCase(service)]();
        break;

      case _e.close:
        return this.goodbye();

      case _a.hide:
        return setTimeout(() => {
          this.el.hide();
        }, 300)

      default:
        super.onUiEvent(cmd)
    }
  }

  /**
   * 
   * @param {*} channel 
   * @param {*} data 
   * @returns 
   */
  async handleDownload(data) {
    const { phase, progress, message } = data;
    let text;
    if (message && LOCALE[message]) {
      text = LOCALE[message];
    } else {
      text = message || "...";
    }
    if (this._prevText != text) {
      this.__btnStatus.set({ content: text });
      this._prevText = text;
    }
    if(!this.__progress){
      this.__progress = await this.ensurePart('progress');
    }
    switch (phase) {
      case 'archive':
        this.__progress.update(progress);
        break;
      case 'exit':
        this.downloadZip(data);
        this.__progress.setLabel(LOCALE.BACKUP_TIPS);
        break;
    }
  }

}


module.exports = __window_downloader;
