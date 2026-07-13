
const { filesize } = require("@drumee/ui-essentials")

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
    // Compact confirm-download modal (Figma 2914:186797 — 520px card). Fixed
    // size + centered so the redesigned card doesn't float in an oversized
    // window; the download-in-progress view reuses the same window/size.
    const W = 520, H = 440;
    this.style.set({
      width: W,
      height: H,
      left: Math.max(0, window.innerWidth / 2 - W / 2),
      top: Math.max(20, window.innerHeight / 2 - H / 2)
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
      // Use the share's CONTENT hub, not the connect host's hub. On a neutral
      // share host (share.<domain>) Host.id is the share-host hub, NOT where the
      // files live, so zip_size/media.zip would run against the wrong hub →
      // size:null + 403 PERMISSION_DENIED (works on desk only because an
      // authenticated session already resolves to its real hub). The sharebox
      // pins the content hub as Visitor.share_hub_id; the per-node list also
      // carries it (hub_id). Fall back to Host.id for legacy per-vhost links.
      this._api.hub_id = Visitor.get('share_hub_id') || hub_id || Host.id;
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
    // Two fixes here: (1) `data.zipname` was an undefined ReferenceError (should
    // be opt.zipname) — this branch (large "Single file .zip" downloads) threw
    // before ever starting; (2) carry the secure-share token so DMZ-share
    // recipients pass the server download guard (mirrors media/core.js). Encode
    // the name (archives carry spaces/colons).
    const _sst = this._token ? `&token=${encodeURIComponent(this._token)}` : '';
    let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${zip_id}&keysel=${keysel}&zipname=${encodeURIComponent(opt.zipname || '')}${_sst}`;
    super.getFromUrl(url);
    // Native browser download (no in-app byte progress) → simulated size-scaled
    // progress bar instead of the plain alert. Download itself is unchanged.
    Wm.downloadNotice(opt.zipname, this._zipsize);
    this.goodbye();
  }

  /**
   * Retrieve a prepared archive over the blob path (< MAX_BLOB_SIZE). Overrides
   * ui-core's download_zip, which built the media.zip URL with `name=` — but the
   * server does input.need('zipname') (→ 412 without it) — and sent no
   * secure-share token (→ 403 for a signed-in non-member recipient). Mirror
   * media/core.js: send `zipname` + the token + the CONTENT hub (this.mget
   * (hub_id) was set to the share's content hub in onDomRefresh). Without this,
   * "Single file .zip" of a shared folder failed even after the folder was
   * successfully staged server-side.
   */
  download_zip(o = {}) {
    let nid = o.nid || this.mget(_a.nid) || Visitor.get(_a.home_id);
    let hub_id = o.hub_id || this.mget(_a.hub_id) || Visitor.get(_a.id);
    let zip_id = o.zipid || this._zipid;
    let { svc, keysel } = bootstrap();
    let zipname =
      o.zipname || this.mget('zipname') || this.mget(_a.filename) ||
      Dayjs().format("[drumee]-YYYY-MM-DD");
    const _sst = this._token ? `&token=${encodeURIComponent(this._token)}` : '';
    let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${zip_id}&keysel=${keysel}&zipname=${encodeURIComponent(zipname)}${_sst}`;
    return this.fetchFile({
      url,
      progress: o.progress,
      download: `${zipname}.zip`,
    });
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
  // The progress bar (kind 'progress_bar', a ui-core widget) is not registered
  // in every context — e.g. the DMZ share bundle — so ensurePart('progress')
  // can resolve to a failover view that lacks update/setLabel/restart. Guard
  // every call so a missing progress widget never crashes the download; the
  // size-scaled Wm.downloadNotice still gives the user feedback for the (native)
  // transfer. Returns the widget only when it's the real, functional one.
  _progress(method, ...args) {
    const p = this.__progress;
    if (p && typeof p[method] === "function") return p[method](...args);
  }

  _hasProgress() {
    return this.__progress && typeof this.__progress.update === "function";
  }

  downloadZip(data) {
    if (this._isDownloading) return;
    if (this._zipsize > MAX_BLOB_SIZE) {
      this.getFromUrl(data);
      return;
    }
    this._progress('setLabel', data.zipname);
    this.once(_e.eod, () => {
      this._progress('setLabel', LOCALE.YOUR_DATA.printf(LOCALE.HAS_BEEN_SAVED));
      this.__btnCancel.suppress();
      this.__btnStatus.set({ content: LOCALE.ACK_REQ_OK });
      this.__btnAction.mset({ service: _e.close });
      this.el.show();
      this.raise();
      this.postService({ service: SERVICE.media.zip_release, id: data.zipid, token: this._token });
    });
    this._isDownloading = 1;
    this._progress('restart', this._filesize);
    this.download_zip({ ...data, progress: this._hasProgress() ? this.__progress : undefined })
      .then()
      .catch((e) => {
        this.warn("GOT ERRO WHILE DOWNLOADING", e);
        // this.postService({service: SERVICE.media.zip_release, id:data.zipid});
        if (/aborted/.test(e)) {
          this._progress('setLabel', LOCALE.CANCELED);
        } else {
          this._progress('setLabel', e);
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
        this._progress('update', progress);
        break;
      case 'exit':
        this.downloadZip(data);
        this._progress('setLabel', LOCALE.BACKUP_TIPS);
        break;
    }
  }

}


module.exports = __window_downloader;
