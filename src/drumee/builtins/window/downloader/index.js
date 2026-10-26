
const { filesize } = require("@drumee/ui-essentials")

/**
 * 
 */
const mfsInteract = require('../interact');
const MAX_BLOB_SIZE = 100000000;
const { saveHeld } = require("libs/save-held");
// Motion (ms): the card appearing, docking, and closing — _animateShow,
// _animateSwitch, goodbye.
const DL_SHOW_MS = 200;
const DL_SWITCH_MS = 320;
const DL_CLOSE_MS = 180;
// Share of the archive bar given to the worker's quick preparation run, ahead
// of compression (_archivePercent).
const ARCHIVE_PREP_SHARE = 10;
// The most a folder's background zip is waited for (_awaitTreeZip).
const TREE_TIMEOUT_MS = 10 * 60 * 1000;
// The browser's "allow multiple downloads" prompt (_gateFirstTwo): how often
// the server is asked for the answer, how long it is waited for, and the gap
// between the first item and the second that raises the prompt.
const GATE_POLL_MS = 600;
const GATE_WAIT_MS = 3 * 60 * 1000;
const GATE_SECOND_MS = 300;
class __window_downloader extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    // Compact card. The skin places it — centred on the screen for the
    // confirm step, docked bottom-right once a download runs — and sizes its
    // height to the content; this inline box is only the fallback until the
    // skin applies.
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
    // Closed while the browser's prompt is up: the parked item ends empty.
    this._gateCancel();
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
    // Files AND folders, one queue, all reported in this window. Folders used
    // to run their row's own download() — ui-core mounts a progress bar inside
    // the row (media-row__container) and the row saved the zip itself; here
    // the window zips, fetches and saves each folder, with its own row in the
    // list (_saveTree).
    let list = (this.mget(_a.nodes) || []).slice();
    if (!list.length) {
      this.goodbye();
      return;
    }
    if (this._canGate(list)) list = this._gateOrder(list);
    const sizeOf = (v) => (this._isTree(v) ? 0 : Number(v.mget(_a.filesize)) || 0);
    this._files = {
      list,
      index: 0,
      // Bytes of the items already finished, and of the one in flight.
      done: 0,
      loaded: 0,
      // Files only, from the listing: a folder's size is known once zipped.
      total: list.reduce((n, v) => n + sizeOf(v), 0),
      failed: 0,
      cancelled: 0,
      current: null,
    };
    this.feed(require('./skeleton/files')(this));
    this._dock();
    if (!this._canGate(list)) return this._nextFile();
    this._gateFirstTwo().then((r) => {
      if (r === false) return this._nextFile(); // could not gate: as before
      if (r) this._nextFile();
    });
  }

  /**
   * Nothing is saved before the user has answered the browser's "allow
   * multiple downloads" prompt; on yes everything is, on no nothing is.
   *
   * A page may start ONE download on its own, and the browser holds every
   * further one behind that prompt. So the first two items go to the browser
   * through media.download_gate (server-team lib/download-gate):
   *  - the first is parked on the server — the browser lists nothing yet, but
   *    the page's one free download is spent;
   *  - the second raises the prompt, and is requested only on yes, which opens
   *    the gate: the server sends both to their file.
   * The server is polled for the answer; the rest of the queue then goes on
   * here, with its progress. Cancel, or no answer, closes it all.
   * @returns {Promise<true|false|null>} true: allowed, go on; false: could not
   * gate (go on as before); null: closed.
   */
  async _gateFirstTwo() {
    const s = this._files;
    const service = SERVICE.media.download_gate;
    const closed = () => !this._files || s.cancelled || this.isDestroyed();
    const paintAll = (status) => s.list.forEach((v, i) => this._paintItem(i, status, 0));
    this._gateTitle(LOCALE.PREPARING_DOWNLOAD);
    // Every item waits on the answer, not just the two that ask for it.
    paintAll('waiting');
    const targets = [];
    for (const i of [0, 1]) {
      // One after the other: a background zip is awaited one at a time.
      const t = await this._itemTarget(s.list[i], i);
      if (closed()) return null;
      if (!t || t.error) {
        paintAll('pending');
        return false;
      }
      targets.push(t);
    }
    const gate = `dl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const { svc, keysel } = bootstrap();
    const sst = this._token ? `&token=${encodeURIComponent(this._token)}` : '';
    const url = (t, role) => `${svc}${service}?hub_id=${t.hub_id}&nid=${t.nid}&gate=${gate}` +
      `&role=${role}&to=${encodeURIComponent(t.to)}&keysel=${keysel}${sst}`;
    this._gate = { gate, hub_id: targets[0].hub_id, nid: targets[0].nid };
    this._saveNative(url(targets[0], 'hold'), targets[0].name);
    setTimeout(() => {
      if (!closed()) this._saveNative(url(targets[1], 'open'), targets[1].name);
    }, GATE_SECOND_MS);
    this._gateTitle(LOCALE.ALLOW_DOWNLOADS_TO_START);
    const until = Date.now() + GATE_WAIT_MS;
    let state = '';
    while (!state && Date.now() < until) {
      await new Promise((r) => setTimeout(r, GATE_POLL_MS));
      if (closed()) return null;
      state = await this._gateState(0);
    }
    if (state !== 'open') {
      // No, or no answer: the parked first item ends empty, nothing is saved.
      this._gateCancel();
      if (!closed()) this.goodbye();
      return null;
    }
    this._gate = null;
    // Both are the browser's own downloads now — the smallest of the
    // selection (_gateOrder), through in a moment: checked at once. The
    // browser tells this page nothing of their bytes, so the bar leaves them
    // out until the end (_filesDone) — it follows only what this window
    // fetches, the rest of the queue.
    paintAll('pending');
    for (const i of [0, 1]) {
      this._paintItem(i, 'done', 0);
      s.total -= this._isTree(s.list[i]) ? 0 : Number(s.list[i].mget(_a.filesize)) || 0;
    }
    s.native = 2;
    s.index = 2;
    this._paintFiles();
    return true;
  }

  _canGate(list) {
    return list.length > 1 && !!SERVICE.media.download_gate && !!SERVICE.media.download_gate_state;
  }

  /**
   * The two items the browser downloads itself (_gateFirstTwo) go first: the
   * two smallest files — the browser reports no progress to this window, so
   * the big ones are better left to it — then folders, whose size is known
   * only once zipped. The rest keeps the selection's order.
   */
  _gateOrder(list) {
    const rank = (v) => (this._isTree(v) ? Infinity : Number(v.mget(_a.filesize)) || 0);
    const pair = list
      .map((v, i) => ({ v, i }))
      .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.v);
    return [...pair, ...list.filter((v) => !pair.includes(v))];
  }

  /**
   * The gate's answer, or with cancel, give it up.
   */
  async _gateState(cancel) {
    const g = this._gate;
    if (!g) return '';
    try {
      const r = await this.postService({
        service: SERVICE.media.download_gate_state,
        hub_id: g.hub_id,
        nid: g.nid,
        gate: g.gate,
        cancel: cancel ? 1 : 0,
        token: this._token,
      });
      return (r && r.state) || '';
    } catch (e) {
      return '';
    }
  }

  _gateCancel() {
    if (!this._gate) return;
    this._gateState(1);
    this._gate = null;
  }

  _gateTitle(text) {
    if (!this.el || this.isDestroyed()) return;
    const title = this.el.querySelector(`.${this.fig.family}__files-title`);
    if (title && text) title.textContent = text;
  }

  /**
   * Where the browser gets an item from itself: a folder's zip (made ready
   * first), or a file's own url — a path on this origin, for the gate to
   * send the browser to.
   * @returns {Promise<{to, name, hub_id, nid}|{error}>}
   */
  async _itemTarget(v, index) {
    let url, name, node;
    if (this._isTree(v)) {
      const z = await this._prepareTree(v, index);
      if (!z || z.error) return z || { error: 1 };
      ({ url, node } = z);
      name = `${z.name}.zip`;
    } else {
      url = v.actualNode(_a.orig).url;
      const base = String(v.mget(_a.filename) || "").replace(/\<.+\>/, "");
      const ext = v.mget(_a.extension) || v.mget(_a.ext);
      name = ext ? `${base}.${ext}` : base;
      node = { nid: v.mget(_a.nid), hub_id: v.mget(_a.hub_id) };
    }
    let to;
    try {
      const u = new URL(url, location.href);
      if (u.origin !== location.origin) return { error: "cross-origin" };
      to = u.pathname + u.search;
    } catch (e) {
      return { error: "no url" };
    }
    return { to, name, hub_id: node.hub_id, nid: node.nid };
  }

  /**
   * A folder or a workspace: zipped on the server before it is saved.
   */
  _isTree(v) {
    return !!v && [_a.hub, _a.folder].includes(v.mget(_a.filetype));
  }

  /**
   * A folder of the queue: zipped on the server (_prepareTree), then fetched
   * by this window and saved. Over MAX_BLOB_SIZE the browser downloads the zip
   * itself.
   * @returns {Promise<{loaded}|{error}>}
   */
  async _saveTree(v, index, onProgress) {
    const z = await this._prepareTree(v, index);
    if (!z || z.error) return z || { error: "no archive" };
    const { url, name, res } = z;
    if (Number(res.size) > MAX_BLOB_SIZE) {
      // Too big to hold in the page: the browser fetches it (no byte count).
      this._saveNative(url, `${name}.zip`);
      return { loaded: Number(res.size) };
    }
    const blob = await this.fetchFile({ url, progress: { update: ({ loaded }) => onProgress(loaded) } });
    if (!blob || blob.error || typeof blob.size !== "number") {
      return { error: (blob && blob.error) || "no archive" };
    }
    saveHeld.call(this, blob, `${name}.zip`);
    this.postService({ service: SERVICE.media.zip_release, id: res.zipid, token: this._token })
      .catch(() => {});
    return { loaded: blob.size };
  }

  /**
   * A folder zipped on the server and ready to fetch: media.download for this
   * one node, on its own hub, waited for when the server builds it in the
   * background (over 5 MB).
   * @returns {Promise<{url, name, node, res}|{error}>}
   */
  async _prepareTree(v, index) {
    const isHub = v.mget(_a.filetype) === _a.hub;
    const node = {
      nid: isHub ? v.mget(_a.actual_home_id) : v.mget(_a.nid),
      hub_id: v.mget(_a.hub_id),
    };
    const name = String(v.mget(_a.filename) || "").replace(/\<.+\>/, "") || "folder";
    const res = await this.postService({
      service: SERVICE.media.download,
      nodes: [node],
      nid: 0,
      hub_id: node.hub_id,
      socket_id: Visitor.get(_a.socket_id),
      mode: '',
      filename: name,
      token: this._token,
    });
    if (!res || !res.zipid) return { error: "no archive" };
    if (res.wait != 0) {
      const built = await this._awaitTreeZip(res.zipid, index);
      if (built && built.error) return built;
    }
    const { svc, keysel } = bootstrap();
    const sst = this._token ? `&token=${encodeURIComponent(this._token)}` : '';
    const url = `${svc}media.zip?hub_id=${node.hub_id}&nid=${res.nid || node.nid}&id=${res.zipid}` +
      `&keysel=${keysel}&zipname=${encodeURIComponent(res.zipname || name)}${sst}`;
    return { url, name, node: { nid: res.nid || node.nid, hub_id: node.hub_id }, res };
  }

  /**
   * A same-origin zip the browser downloads on its own (media.zip answers it
   * as an attachment).
   */
  _saveNative(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  /**
   * A folder the server zips in the background: its progress and its end come
   * over the socket as media.download pushes, which Wm routes to the item
   * carrying that zipid (window/utils downloadContent) — so this window
   * carries it while it waits; handleDownload settles the wait.
   */
  _awaitTreeZip(zipid, index) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => this._settleTreeZip({ error: "timeout" }), TREE_TIMEOUT_MS);
      this._treeZip = { zipid, index, resolve, timer };
      this.mset({ zipid });
      // Its end may have been pushed before this window held the zipid.
      const missed = require("libs/zip-pushes").take(zipid);
      if (missed) this.handleDownload(missed);
    });
  }

  _settleTreeZip(result) {
    const t = this._treeZip;
    if (!t) return;
    this._treeZip = null;
    clearTimeout(t.timer);
    t.resolve(result);
  }

  /**
   * Fetch the next item. A file through the ROW'S fetchFile (ui-core mfs.js)
   * — its own url, auth and abort controller; a folder by _saveTree. Either
   * way the bytes are reported here and saved by saveHeld (libs/save-held),
   * whose download survives the browser's "allow multiple downloads" prompt.
   */
  _nextFile() {
    const s = this._files;
    if (!s || s.cancelled || this.isDestroyed()) return;
    const v = s.list[s.index];
    if (!v) return this._filesDone();
    s.current = v;
    s.loaded = 0;
    const index = s.index;
    if (this._isTree(v)) {
      this._paintItem(index, 'downloading', 0);
      this._paintFiles();
      const onProgress = (loaded) => {
        s.loaded = loaded;
        this._paintItem(index, 'downloading', loaded);
        this._paintFiles();
      };
      Promise.resolve()
        .then(() => this._saveTree(v, index, onProgress))
        .catch((e) => ({ error: e }))
        .then((r) => {
          if (s.cancelled || this.isDestroyed()) return;
          const failed = !!(r && r.error);
          if (failed) {
            s.failed++;
            this.warn("downloader: folder not saved", v.mget(_a.filename), r.error);
          }
          this._paintItem(index, failed ? 'error' : 'done', s.loaded);
          s.loaded = 0;
          s.index++;
          this._nextFile();
        });
      return;
    }
    const size = Number(v.mget(_a.filesize)) || 0;
    const name = String(v.mget(_a.filename) || "").replace(/\<.+\>/, "");
    const ext = v.mget(_a.extension) || v.mget(_a.ext);
    const download = ext ? `${name}.${ext}` : name;
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
      .then(() => v.fetchFile({ url: v.actualNode(_a.orig).url, progress }))
      .then((r) => {
        // Without `download`, fetchFile hands the blob back instead of saving.
        if (r && typeof r.size === "number" && !r.error) {
          saveHeld.call(this, r, download);
          result = undefined;
        } else {
          result = r || { error: 1 };
        }
      }, () => (result = { error: 1 }))
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
   * @param {String} status pending | waiting | downloading | done | error
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
      if (status === 'downloading' && this._isTree(v)) {
        text = bytes ? filesize(bytes) : ''; // zipping on the server: the spinner says it
      } else if (status === 'downloading') {
        text = size ? `${Math.min(100, Math.round((bytes / size) * 100))}%` : filesize(bytes);
      } else if (status === 'waiting') {
        text = ''; // the spinner says it
      } else if (status === 'pending') {
        text = size && !this._isTree(v) ? filesize(size) : '';
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
    // Only what this window fetches is counted: the items the browser
    // downloads itself (s.native, at the head of the list) are not.
    const skip = s.native || 0;
    const tracked = s.list.slice(skip);
    // With folders in the queue, by item: a folder's size is only known once
    // the server has zipped it. A file in flight counts its own fraction.
    let pct;
    if (!tracked.length) {
      pct = 0;
    } else if (tracked.some((v) => this._isTree(v)) || !s.total) {
      const v = s.current;
      const size = v && !this._isTree(v) ? Number(v.mget(_a.filesize)) || 0 : 0;
      const part = size ? Math.min(1, s.loaded / size) : 0;
      pct = Math.round(((Math.min(Math.max(s.index - skip, 0), tracked.length) + part) / tracked.length) * 100);
    } else {
      pct = Math.round((bytes / s.total) * 100);
    }
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
    // Everything went to the browser: nothing here to call complete — it
    // says where the files are, and shows no bar.
    const allNative = !s.failed && (s.native || 0) >= s.list.length;
    if (s.native && !allNative) {
      // The browser had the two smallest files (_gateOrder) while this window
      // fetched the rest: counted now, with everything else.
      for (let i = 0; i < s.native; i++) {
        s.total += this._isTree(s.list[i]) ? 0 : Number(s.list[i].mget(_a.filesize)) || 0;
      }
      s.native = 0;
    }
    if (!s.failed) s.done = s.total;
    this._paintFiles();
    const main = this.el.querySelector(`.${this.fig.family}__files`);
    if (main) main.dataset.state = s.failed ? 'failed' : allNative ? 'browser' : 'done';
    const q = (k) => this.el.querySelector(`.${this.fig.family}__${k}`);
    const title = q('files-title');
    if (title) {
      title.textContent = s.failed
        ? LOCALE.DOWNLOAD_X_FAILED.format(s.failed)
        : allNative ? LOCALE.DOWNLOADING_IN_BROWSER : LOCALE.DOWNLOAD_COMPLETE;
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
      this._gateCancel();
      this._settleTreeZip({ error: "aborted" });
      try {
        if (this.aborter) this.aborter.abort({ aborted: 1 });
      } catch (e) { }
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
    let { nid, hub_id } = this._zipSource(opt);
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
    // The archive is ready and the BROWSER now fetches it (native download: no
    // byte progress reaches the page). Say so in this card and stay. This used
    // to close the card and open Wm.downloadNotice — a second window_info card
    // whose bar is simulated and parks near 90%, so the one download showed
    // two UIs and the second looked stuck.
    // Its row is checked; the bar goes — nothing of the browser's own
    // transfer reaches this page to fill it.
    this._zipItem('done', opt.zipname);
    this._zipSettle({
      state: 'browser',
      title: LOCALE.DOWNLOADING_IN_BROWSER,
    });
  }

  /**
   * The node media.zip is checked against: the nid media.download answered,
   * on the hub THAT NODE lives on.
   *
   * With a `nodes` list the server grants each selected node on its own hub,
   * and download() answers `nid: source_granted().id` — the first of them —
   * next to `hub_id: this.hub` — the hub of the REQUEST. Opened from the
   * desk, that request hub is the user's personal one (Wm.download passes no
   * hub_id, so _api falls back to Visitor.id), while the selection can live
   * in any workspace: media.zip then asked for a workspace folder on the
   * personal hub, which it is not on, and was refused (PERMISSION_DENIED,
   * stage 2026-10-09). The selection knows each node's own hub, so take it
   * from there. In a share the two already agree (every node is on the share
   * hub) and nothing changes.
   * @param {Object} o the media.download answer
   * @returns {{nid: String, hub_id: String}}
   */
  _zipSource(o = {}) {
    const nid = o.nid || this.mget(_a.nid) || Visitor.get(_a.home_id);
    const nodes = (this._api && this._api.nodes) || [];
    const own = nodes.find((n) => n && n.nid != null && `${n.nid}` === `${nid}`);
    const hub_id =
      (own && own.hub_id) || o.hub_id || this.mget(_a.hub_id) || Visitor.get(_a.id);
    return { nid, hub_id };
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
    let { nid, hub_id } = this._zipSource(o);
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
        } else {
          // Its end may have been pushed before this window held the zipid.
          const missed = require("libs/zip-pushes").take(opt.zipid);
          if (missed) this.handleDownload(missed);
        }
      }).catch(this.warn.bind(this));
    }).catch(this.warn.bind(this));
  }

  /**
   * The archive's name, without .zip: the server's, once media.download has
   * answered, else the one asked for (prepareZip).
   */
  _zipLabel() {
    return this.mget('zipname') || (this._api && this._api.filename) ||
      Dayjs().format("[drumee]-YYYY-MM-DD");
  }

  /**
   * The .zip step's bar, as the multiple-files step's (skeleton/rows.js): its
   * fill, the percentage on the right — only ever going up — and, while the
   * archive is fetched, the bytes on the left; the row's own count too.
   * @param {Number|Object} v a percentage (the server building the archive),
   * or { loaded, total } (fetchFile's bytes)
   * @param {Boolean} reset a new transfer: start again from 0
   */
  _zipPaint(v, reset) {
    if (!this.el || this.isDestroyed()) return;
    const q = (k) => this.el.querySelector(`.${this.fig.family}__${k}`);
    let pct = 0;
    let bytes = '';
    if (v && typeof v === "object") {
      const total = Number(v.total) || this._zipsize || 0;
      pct = total ? (100 * v.loaded) / total : 0;
      if (total) bytes = `${filesize(Math.min(v.loaded, total))} / ${filesize(total)}`;
    } else {
      pct = Number(v) || 0;
    }
    pct = Math.max(0, Math.min(100, Math.floor(pct)));
    if (reset) this._pctShown = 0;
    this._pctShown = Math.max(this._pctShown || 0, pct);
    const fill = q('bar-fill');
    if (fill) fill.style.width = `${this._pctShown}%`;
    const percent = q('meta-percent');
    if (percent) percent.textContent = `${this._pctShown}%`;
    const meta = q('meta-bytes');
    if (meta && (bytes || reset)) meta.textContent = bytes;
    const count = q('item-meta');
    if (count) count.textContent = `${this._pctShown}%`;
  }

  /**
   * The archive's row: waiting (the server builds it: a spinner), downloading
   * (its percentage), done (a check) or error (a warning) — the skin keys off
   * data-status — and its name once the server has given it.
   */
  _zipItem(status, zipname) {
    if (!this.el || this.isDestroyed()) return;
    const fam = this.fig.family;
    const row = this.el.querySelector(`.${fam}__item`);
    if (!row) return;
    row.dataset.status = status;
    const name = row.querySelector(`.${fam}__item-name`);
    if (name && zipname) name.textContent = `${zipname}.zip`;
  }

  /**
   * Fetch the prepared archive and report it in the card.
   *
   * Two things kept the .zip step on "Loading" forever, whatever happened:
   *
   *  - Its result was read off an `eod` that never fires. ui-core fetchFile
   *    triggers eod only when it is NOT saving (no `download` option); with
   *    one it hands the blob to getBlob and returns. So the archive was saved
   *    and the card never knew. The outcome is now download_zip()'s own.
   *  - Its progress bar, a ui-core widget, was only resolved in
   *    handleDownload — the server's progress pushes, which only come for an
   *    archive over 5 MB. The bar is now the card's own (skeleton/rows.js),
   *    painted in place by _zipPaint, in both paths.
   */
  async downloadZip(data) {
    if (this._isDownloading) return;
    if (this._zipsize > MAX_BLOB_SIZE) {
      this.getFromUrl(data);
      return;
    }
    this._isDownloading = 1;
    if (this.isDestroyed()) return;
    this._setZipTitle(LOCALE.DOWNLOADING);
    this._zipItem('downloading', data.zipname);
    this._zipPaint({ loaded: 0, total: this._zipsize }, true);
    let res;
    try {
      res = await this.download_zip({
        ...data,
        // fetchFile's byte updates: progress.update({ loaded, total }).
        progress: { update: (o) => this._zipPaint(o) },
      });
    } catch (e) {
      this.warn("GOT ERRO WHILE DOWNLOADING", e);
      res = { error: e };
    }
    if (this.isDestroyed()) return;
    this._zipDone(data, res);
  }

  /**
   * The .zip step's result: saved — the bar full, Close in place of Cancel
   * (the frame swaps them off data-state), the server's copy released — or
   * failed, with the card kept up to say so. fetchFile answers { error: code }
   * when the archive cannot be served (404 when it was never built).
   * @param {Object} data the media.download answer (zipid, zipname)
   * @param {*} res download_zip()'s result
   */
  _zipDone(data, res) {
    const ok = !(res && res.error);
    const aborted = /aborted/.test(String(res && res.error));
    if (ok) {
      this._zipPaint({ loaded: this._zipsize || 1, total: this._zipsize || 1 });
      this._zipPaint(100);
    }
    this._zipItem(ok ? 'done' : 'error', data.zipname);
    this._zipSettle({
      state: ok ? 'done' : 'failed',
      title: ok ? LOCALE.DOWNLOAD_COMPLETE : aborted ? LOCALE.CANCELED : LOCALE.DOWNLOAD_FAILED,
    });
    if (ok) {
      this.postService({ service: SERVICE.media.zip_release, id: data.zipid, token: this._token });
    }
  }

  /**
   * End the .zip step in place: the title, Close instead of Cancel (the frame
   * swaps them off data-state), and the card no longer "running" so its ×
   * just closes. Shared by the in-page fetch (_zipDone) and the hand-off to
   * the browser's own download (getFromUrl).
   * @param {{state: String, title: String}} o state: done | failed | browser
   */
  _zipSettle(o) {
    if (this.__btnCancel && !this.__btnCancel.isDestroyed()) this.__btnCancel.suppress();
    this._setZipTitle(o.title);
    if (this.__btnAction && !this.__btnAction.isDestroyed()) {
      this.__btnAction.mset({ service: _e.close });
    }
    const main = this.el && this.el.querySelector(`.${this.fig.family}__zip`);
    if (main) main.dataset.state = o.state;
    this._running = 0;
    this.raise();
  }

  _setZipTitle(text) {
    if (!text || this._prevText === text) return;
    this._prevText = text;
    if (this.__btnStatus && !this.__btnStatus.isDestroyed()) {
      this.__btnStatus.set({ content: text });
    }
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
  /**
   * The worker's archive phase on ONE 0-100 scale. offline/media/download.js
   * reports two runs, each 0→100: IN_PREPARATION, one message per file as it
   * links them into place (fast), then BEING_CREATED, 7z's own percentage
   * while it compresses (the long part). Fed straight to the bar, the first
   * run filled it at once and the second dragged it back to a few percent —
   * and the label, which only goes up, sat on 100% for the whole compression.
   * Preparation fills the first ARCHIVE_PREP_SHARE percent, compression the rest.
   * @param {Number} progress the worker's 0-100 for its current run
   * @param {String} message IN_PREPARATION | BEING_CREATED
   * @returns {Number}
   */
  _archivePercent(progress, message) {
    const p = Math.max(0, Math.min(100, Number(progress) || 0));
    if (message === "BEING_CREATED") {
      return ARCHIVE_PREP_SHARE + ((100 - ARCHIVE_PREP_SHARE) * p) / 100;
    }
    return (ARCHIVE_PREP_SHARE * p) / 100;
  }

  async handleDownload(data) {
    const t = this._treeZip;
    if (t && data && data.zipid === t.zipid) {
      // A folder of the "Multiple files" queue being zipped (_awaitTreeZip).
      if (data.phase === 'exit') {
        this._settleTreeZip(data.exit ? { error: data.message || "zip failed" } : {});
      } else if (data.phase === 'error') {
        this._settleTreeZip({ error: data.message || "zip failed" });
      }
      return;
    }
    const { phase, progress, message } = data;
    let text;
    if (message && LOCALE[message]) {
      text = LOCALE[message];
    } else {
      text = message || "...";
    }
    this._setZipTitle(text);
    switch (phase) {
      case 'archive':
        this._zipItem('waiting', data.zipname);
        this._zipPaint(this._archivePercent(progress, message));
        break;
      case 'exit':
        this.downloadZip(data);
        break;
    }
  }

}


module.exports = __window_downloader;
