
const { filesize } = require("@drumee/ui-essentials")

/**
 * 
 */
const mfsInteract = require('../interact');
const MAX_BLOB_SIZE = 100000000;
// Motion (ms): the card appearing, docking, and closing — _animateShow,
// _animateSwitch, goodbye.
const DL_SHOW_MS = 200;
const DL_SWITCH_MS = 320;
const DL_CLOSE_MS = 180;
class __window_downloader extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    // Compact card, centred. The height follows the content (skin: height
    // auto, and the 600x320 .window__ui floor cancelled), so H is only the
    // estimate the initial centring uses; both steps — confirm and in
    // progress — land close to it.
    const W = 400, H = 300;
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
    this._animateShow();
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
    if (this.started) return;
    this.started = 1;
    const nodes = (this.mget(_a.nodes) || []).slice();
    // Folders and workspaces have no byte stream to follow: media download()
    // has the server zip them (download_tree) and a notification hands the
    // archive over. They keep that path; only files are fetched here.
    const isTree = (v) => [_a.hub, _a.folder].includes(v.mget(_a.filetype));
    const files = nodes.filter((v) => !isTree(v));
    nodes.filter(isTree).forEach((v) => v.download());
    if (!files.length) {
      this.goodbye();
      return;
    }
    const sizeOf = (v) => Number(v.mget(_a.filesize)) || 0;
    this._files = {
      list: files,
      index: 0,
      // Bytes of the files already finished, and of the one in flight.
      done: 0,
      loaded: 0,
      // From the listing, not content-length: fetchFile's total comes back 0
      // when the response has none, and a bar needs the whole up front.
      total: files.reduce((n, v) => n + sizeOf(v), 0),
      failed: 0,
      cancelled: 0,
      current: null,
    };
    this.feed(require('./skeleton/files')(this));
    this._dock();
    this._nextFile();
  }

  /**
   * Fetch the next file through the ROW'S fetchFile (ui-core mfs.js) — its
   * own url, auth and abort controller, and getBlob saves it — but with this
   * window's progress instead of the progress widget the row's download()
   * mounts inside media-row__container.
   */
  _nextFile() {
    const s = this._files;
    if (!s || s.cancelled || this.isDestroyed()) return;
    const v = s.list[s.index];
    if (!v) return this._filesDone();
    s.current = v;
    s.loaded = 0;
    const size = Number(v.mget(_a.filesize)) || 0;
    const name = String(v.mget(_a.filename) || "").replace(/\<.+\>/, "");
    const ext = v.mget(_a.extension) || v.mget(_a.ext);
    const download = ext ? `${name}.${ext}` : name;
    const index = s.index;
    const progress = {
      update: ({ loaded }) => {
        s.loaded = loaded;
        this._paintItem(index, 'downloading', loaded);
        this._paintFiles();
      },
    };
    this._paintItem(index, 'downloading', 0);
    this._paintFiles();
    let result;
    Promise.resolve()
      .then(() => v.fetchFile({ url: v.actualNode(_a.orig).url, progress, download }))
      .then((r) => (result = r), () => (result = { error: 1 }))
      .then(() => {
        if (s.cancelled || this.isDestroyed()) return;
        // fetchFile answers { error } on an HTTP failure and swallows a network
        // one (undefined, like a success) — a file that should have bytes and
        // got none counts as failed too.
        const failed = (result && result.error) || (size && !s.loaded);
        if (failed) s.failed++;
        this._paintItem(index, failed ? 'error' : 'done', s.loaded);
        s.done += size || s.loaded;
        s.loaded = 0;
        s.index++;
        this._nextFile();
      });
  }

  /**
   * One row of the files list (skeleton/files.js, upload's __progress-row):
   * its status — the skin shows the spinner, the check or the warning off
   * data-status — and its small count on the right: the size while pending,
   * the percentage while downloading, nothing once settled.
   * @param {Number} i row index in _files.list
   * @param {String} status pending | downloading | done | error
   * @param {Number} bytes bytes received for this file
   */
  _paintItem(i, status, bytes = 0) {
    const s = this._files;
    if (!s || !this.el || this.isDestroyed()) return;
    const fam = this.fig.family;
    const row = this.el.querySelector(`.${fam}__item[data-index="${i}"]`);
    if (!row) return;
    const v = s.list[i];
    const size = (v && Number(v.mget(_a.filesize))) || 0;
    const entering = row.dataset.status !== status;
    row.dataset.status = status;
    const meta = row.querySelector(`.${fam}__item-meta`);
    if (meta) {
      let text = '';
      if (status === 'downloading') {
        text = size ? `${Math.min(100, Math.round((bytes / size) * 100))}%` : filesize(bytes);
      } else if (status === 'pending') {
        text = size ? filesize(size) : '';
      }
      meta.textContent = text;
    }
    // Keep the file in flight in view as the list scrolls past its height.
    if (entering && status === 'downloading' && _.isFunction(row.scrollIntoView)) {
      row.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * The files step's bar, counter, file name and byte count.
   */
  _paintFiles() {
    const s = this._files;
    if (!s || !this.el || this.isDestroyed()) return;
    const q = (k) => this.el.querySelector(`.${this.fig.family}__${k}`);
    const n = s.list.length;
    const bytes = Math.min(s.done + s.loaded, s.total || Infinity);
    const pct = s.total
      ? Math.round((bytes / s.total) * 100)
      : Math.round((Math.min(s.index, n) / n) * 100);
    const fill = q('bar-fill');
    if (fill) fill.style.width = `${pct}%`;
    const title = q('files-title');
    const fname = q('files-name');
    if (s.index < n) {
      if (title) title.textContent = LOCALE.DOWNLOADING_X_OF_Y.format(s.index + 1, n);
      if (fname) fname.textContent = s.current ? String(s.current.mget(_a.filename) || "") : "";
    }
    const meta = q('meta-bytes');
    if (meta) meta.textContent = s.total ? `${filesize(bytes)} / ${filesize(s.total)}` : "";
    const percent = q('meta-percent');
    if (percent) percent.textContent = `${pct}%`;
  }

  /**
   * Every file has been through: say so, and stay up until closed.
   */
  _filesDone() {
    const s = this._files;
    if (!s || this.isDestroyed()) return;
    s.index = s.list.length;
    s.current = null;
    if (!s.failed) s.done = s.total;
    this._paintFiles();
    const main = this.el.querySelector(`.${this.fig.family}__files`);
    if (main) main.dataset.state = s.failed ? 'failed' : 'done';
    const q = (k) => this.el.querySelector(`.${this.fig.family}__${k}`);
    const title = q('files-title');
    if (title) {
      title.textContent = s.failed
        ? LOCALE.DOWNLOAD_X_FAILED.format(s.failed)
        : LOCALE.DOWNLOAD_COMPLETE;
    }
    const fname = q('files-name');
    if (fname) fname.textContent = '';
    if (this.__filesCancel && !this.__filesCancel.isDestroyed()) this.__filesCancel.suppress();
    if (this.__filesAction && !this.__filesAction.isDestroyed()) {
      this.__filesAction.mset({ service: _e.close });
      this.__filesAction.set({ content: LOCALE.CLOSE });
    }
    // No auto-close, success or not: the card stays on its result until it
    // is closed.
    this._running = 0;
    this.raise();
  }

  /**
   * Once a download is running, sit where the upload window sits (window/
   * upload-progress: fixed, bottom-right above the dock, 360px, over every
   * window layer). The skin does the placing off this flag — !important there
   * beats the centred left/top that initialize() wrote inline.
   */
  _dock() {
    this._running = 1;
    if (!this.el) return;
    // FLIP: where the card is (centred confirm step) before it docks, where it
    // lands after, then play the gap back so it glides into the corner.
    const before = this.el.getBoundingClientRect();
    this.el.dataset.docked = "1";
    this.el.dataset.expanded = "1";
    this._animateSwitch(before);
  }

  // ---- Motion ---------------------------------------------------------------
  // Web Animations rather than skin keyframes: the docked placement is
  // !important CSS and a CSS animation on __ui would restart whenever its
  // name changed with data-docked. el.animate() layers over all of that and
  // leaves nothing behind when it ends. Every one is skipped under
  // prefers-reduced-motion.

  _motionOk() {
    if (!this.el || !_.isFunction(this.el.animate)) return false;
    return !(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * Show: the confirm card rises in. Once — onDomRefresh can run again.
   */
  _animateShow() {
    if (this._shown) return;
    this._shown = 1;
    if (!this._motionOk()) return;
    this.el.animate(
      [
        { opacity: 0, transform: "translateY(8px) scale(0.97)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: DL_SHOW_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }

  /**
   * Switch, confirm → download in progress: the card glides from where it
   * was to the dock, and the new step fades in as it lands.
   * @param {DOMRect} before the card's box before docking
   */
  _animateSwitch(before) {
    if (!this._motionOk()) return;
    const after = this.el.getBoundingClientRect();
    if (before && before.width && after.width) {
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      const sx = before.width / after.width;
      this.el.animate(
        [
          { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx})` },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: DL_SWITCH_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
    const main = this.el.querySelector(`.${this.fig.family}__panel`);
    if (main && _.isFunction(main.animate)) {
      main.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: DL_SHOW_MS, delay: DL_SWITCH_MS / 3, easing: "ease-out", fill: "backwards" },
      );
    }
  }

  /**
   * Close: fade out — dropping a little when docked (back towards the dock,
   * as it came), easing back when centred — then go at once. Replaces
   * ui-core's default goodbye tween, which shrinks the window to 20% towards
   * its top-left corner (or its trigger): wrong for a card pinned
   * bottom-right. An explicit { now } still goes straight away.
   */
  goodbye(args) {
    if (this._leaving || this.isDestroyed()) return;
    if ((args && args.now) || !this._motionOk()) {
      this._leaving = 1;
      return super.goodbye({ ...(args || {}), now: true });
    }
    this._leaving = 1;
    const docked = this.el.dataset.docked === "1";
    const out = this.el.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: docked ? "translateY(16px)" : "translateY(8px) scale(0.97)" },
      ],
      { duration: DL_CLOSE_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    const go = () => {
      if (!this.isDestroyed()) super.goodbye({ now: true });
    };
    out.onfinish = go;
    // A hidden tab can hold the animation; never let the close hang on it.
    setTimeout(go, DL_CLOSE_MS + 200);
  }

  /**
   * The frame's collapse toggle (skeleton/frame.js): down to the header bar and
   * back, as the upload window's does. The skin keys off data-expanded.
   */
  toggleExpand() {
    if (!this.el) return;
    this.el.dataset.expanded = this.el.dataset.expanded === "0" ? "1" : "0";
  }

  /**
   * The frame's ×. While a download runs it cancels, as upload's × does —
   * the multiple-files queue at once, the .zip through its confirm — and once
   * it is done it just closes.
   */
  dismiss() {
    if (!this._running) return this.goodbye();
    if (this._files) return this.abortFiles();
    return this.abortDownload();
  }

  /**
   * Cancel: stop the file in flight (its own abort controller, set by
   * fetchFile) and drop the rest.
   */
  abortFiles() {
    const s = this._files;
    if (s) {
      s.cancelled = 1;
      const v = s.current;
      try {
        if (v && v.aborter) v.aborter.abort({ aborted: 1 });
      } catch (e) { }
    }
    this.goodbye();
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
      this._dock();
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
      // The frame swaps Cancel for Close off this (skeleton/frame.js).
      const main = this.el.querySelector(`.${this.fig.family}__zip`);
      if (main) main.dataset.state = 'done';
      this._running = 0;
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
      case 'abort-files':
        this[_.camelCase(service)]();
        break;

      case 'toggle-expand':
        return this.toggleExpand();

      case 'dismiss':
        return this.dismiss();

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
