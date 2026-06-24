
const { filesize, fitBoxes } = require("@drumee/ui-essentials")
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");
const PlayerInteract = require('player/interact');
const { loadPdfDocument, getCurrentPdfiumDocumentBlob } = require('./pdfium-wrapper')
const WS_EVENT = "ws:event";
const EDITOR_READY_FALLBACK_MS = 2500;
const EDITOR_READY_EVENTS = new Set(['onDocumentReady', 'onAppReady', 'docEditorReady']);

let editorPrewarmed = false;
function prewarmEditor() {
  if (editorPrewarmed) return;
  editorPrewarmed = true;
  const schedule = (typeof requestIdleCallback === 'function')
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 0);
  schedule(() => {
    // 1) Preconnect to the OnlyOffice host so the TLS handshake happens
    //    before the user opens a document.
    try {
      if (Platform.get('doc_editor')) {
        const { user_domain } = bootstrap();
        const host = user_domain || location.host;
        if (!document.head.querySelector(`link[rel="preconnect"][href="https://${host}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = `https://${host}`;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
      }
    } catch (e) { /* non-fatal */ }
    // 2) Warm the iframe Kind so the first document open doesn't pay
    //    the dynamic-import cost.
    try { Kind.waitFor('iframe'); } catch (e) { /* non-fatal */ }
  });
}

class __player_document extends PlayerInteract {

  /**
   * 
   * @param {*} opt    */
  initialize(opt) {
    super.initialize(opt);
    require('../skin');
    require('./skin');
    this.isPlayer = 1;
    this.isDocument = 1;
    this.offsetY = _K.windowTopbar;
    this.info = null;
    this.information = require('../skeleton/file-info');
    this.contextmenuItems = [_a.link];
    //this.bindEvent("live");
    this.scaleFactor = 2;

    this.checkPreview = this.checkPreview.bind(this);
    this.onWsMessage = this.onWsMessage.bind(this);
    // Sync the fullscreen button when the user exits via Esc / browser chrome.
    this._onFullscreenChange = this._onFullscreenChange.bind(this);
    document.addEventListener("fullscreenchange", this._onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this._onFullscreenChange);
    // to set media - do not remove
    if (!this.media) {
      this.media = opt.source || opt.trigger;
    }
    this.pollCount = 0;
  }


  /**
   * 
   */
  onBeforeDestroy() {
    if (this.loader && _.isFunction(this.loader.isDestroyed)) {
      this.loader.destroy();
      this.loader = null;
    }
    Wm.off(WS_EVENT, this.onWsMessage)
    this._cleanupEditorListeners();
    document.removeEventListener("fullscreenchange", this._onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this._onFullscreenChange);
    // Don't leave the browser stuck in fullscreen if closed while fullscreened.
    if (this._fullscreenElement() === this.el) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (e) { /* ignore */ }
      }
    }
    if (this._wsObserver) {
      this._wsObserver.disconnect();
      this._wsObserver = null;
    }
    if (super.onBeforeDestroy) {
      super.onBeforeDestroy()
    }

    if (this.pdfDocument) {
      this.pdfDocument.close()
    }

  }

  /**
   * 
   * @param {*} args 
   */
  onWsMessage(args) {
    let { service, data, options } = args
    switch (options.service) {
      case "media.status":
        this.checkPreview(args)
        break;
    }
  }

  // Load a PDF file
  async getDocument(url) {
    try {
      // Fetch the PDF file
      const response = await this.fetchFile({ url, progress: this.onFetchProgress.bind(this) });
      const arrayBuffer = await response.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);
      // Load the document
      this.message(`${LOCALE.LOADING} ${this.mget(_a.filepath)}`)
      const pdfDocument = await loadPdfDocument(pdfData);
      window.addEventListener('beforeunload', () => {
        pdfDocument.close();
      });
      return pdfDocument;
    } catch (e) {
      this.message('')
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
      this.warn('Error rendering PDF:', e);
    }
  }

  /**
 * 
 */
  onDomRefresh() {
    Wm.on(WS_EVENT, this.onWsMessage)
    const editMode = this.shouldOpenInEditMode();
    // Set edit mode BEFORE initSize so its edit branch sizes the window to the
    // full workspace (instead of the centered windowed default).
    if (editMode) this.mset({ mode: _a.edit });
    this.initSize();
    if (editMode) return this.edit();
    this.reload(300);
  }

  _docExt() {
    return (this.mget(_a.ext) || this.mget(_a.extension) || "")
      .toString()
      .toLowerCase();
  }

  shouldOpenInEditMode() {
    const ext = this._docExt();
    if (Visitor.inDmz) {
      // Secure-share recipient (Phase 1): open office docs in the EurOffice editor
      // instead of the flat PDFium preview, so recipients get full-fidelity
      // rendering. The editor is forced READ-ONLY server-side from the share token
      // (euroffice.html), so this is safe for view-only recipients; edit-grant
      // editing is Phase 2. Non-office files keep their normal players. edit()
      // passes the share token so the service can resolve the mode.
      return require('./editable').includes(ext) && !!Platform.get('doc_editor');
    }
    if (this.mget(_a.mode) === _a.preview) return false;
    if (this.mget(_a.mode) === _a.edit) return true;
    return this.canUpload()
      && require('./editable').includes(ext)
      && !!Platform.get('doc_editor');
  }


  /**
   * 
   */
  start() {
    let w;
    try {
      const a = this.info['page size'].split(/ +/);
      w = parseInt(a[0]);
      const h = parseInt(a[2]);
      // const unit = parseInt(a[3]);
      this.ratio = h / w;
      this.pageWidth = w;
      this.pageHeight = h;
    } catch (e) {
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
    }
    this.initSize(this.size);
    this.display();
  }

  /**
   * 
   * @param {*} pdf 
   */
  async loadPages(pdfDocument) {
    this.pdfDocument = pdfDocument;
    const { pageCount } = pdfDocument;
    this.totalPages = pageCount;
    this.loadedPages = 0;
    this._pages = []
    for (let i = 0; i < pageCount; i++) {
      let p = {
        kind: "document_page",
        pdfDocument,
        // page,
        logicalParent: this,
        ratio: this.ratio,
        pageWidth: this.pageWidth,
        pageHeight: this.pageHeight,
        uiHandler: [this],
        pageIndex: i,
        attribute: {
          id: `page-${i}`
        },
      };
      this._pages.push(p)
    }
    this.nextPages()
  }


  /**
   * 
   */
  initProgess() {
    if (this.loadedPages) return;
    if (!this.__progress) return;
    this.__progress.el.dataset.state = 1;
    this.__progressBar.el.style.width = 0;
  }

  /**
   * 
   */
  confirmReload() {
    if (!this.__overlay.isEmpty()) return;
    this._isBuildingPages = 1;
    this.__overlay.feed(require('./skeleton/content-changed').default(this));
  }

  /**
   * 
   */
  message(content) {
    if (!this.__progressText || !this.__progress) return;
    if (content) {
      this.__progress.setState(1)
    } else {
      this.__progress.setState(0)
    }
    this.__progressText.set({ content });
  }

  /**
   * 
   */
  checkBuildState() {
    if (this.pollCount > 10) {
      this.warn("Giving up loadig new version");
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
      return;
    }
    const { nid, hub_id } = this.actualNode();
    const { keysel } = bootstrap(); let opt = {
      service: SERVICE.media.info,
      nid,
      hub_id,
      keysel
    };
    this.pollCount++;
    this.fetchService(opt).then((data) => {
      if (/^(ok|done)$/.test(data.buildState) || !data.buildState) {
        this.message("");
        this.pollCount = 0;
        if (this.buildTime) {
          clearTimeout(this.buildTime);
          this.buildTime = null;
        }
        if (this.previewTimer) return
        this.confirmReload();
        return;
      }
      this.buildTime = setTimeout(this.checkBuildState.bind(this), 3000);
      this.message(LOCALE.PREVIEW_GENERATION);
    }).catch((e) => {
      console.trace(e);
    })
  }


  /**
   * 
   */
  checkPreview(args) {
    let { data, options } = args;
    let { nid } = data;
    if (this.mget(_a.nid) != nid) return;
    if (options.progress == 0) {
      this.message(LOCALE.PREVIEW_GENERATION);
      if (this.previewTimer) return;
      this.previewTimer = setTimeout(async () => {
        await this.fetchInfo();
        this.previewTimer = null;
      }, 5000);
    } else if (options.progress >= 100) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
      if (options.progress == 100) {
        this.mset(data);
        this.prepare();
        this.__progress.el.hide();
      }
    } else {
      this.__progress.el.style.width = `${options.progress}%`
    }
  }

  /**
   * 
   */
  updateStatus(args) {
  }

  /**
   * 
   * @param {*} data 
   */
  updateContent(data) {
    let { nid } = data;
    if (this.mget(_a.nid) != nid) return;
    let { buildState } = data;
    delete data.buildState;
    this.mset(data);
    if (buildState == 'wait') {
      this.checkBuildState();
    } else {
      this.confirmReload();
    }
  }

  /**
   * 
   */
  async display() {
    const { url } = this.actualNode(_a.pdf);
    let w = this.size.width;
    if (this._isBuildingPages) return;
    this._isBuildingPages = 1;
    try {
      const a = this.info['page size'].split(/ +/);
      w = parseInt(a[0]);
      const h = parseInt(a[2]);
      this.ratio = h / w;
      this.pageWidth = w;
      this.pageHeight = h;
    } catch (e) {
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
      return
    }
    this.message(LOCALE.DOWNLOADING);
    let pdfDocument = await this.getDocument(url)
    await this.loadPages(pdfDocument)
    this._isBuildingPages = 1;
    this.message();
  }


  /**
   * 
   * @param {*} e 
   */
  handleError(e) {
    this.warn("handleError", e);
    let content = LOCALE.ERROR_SERVER;
    switch (e.status) {
      case 403:
        content = LOCALE.WEAK_PRIVILEGE
        break;
    }
    this.__progressText.set({ content: '' });
    this.__content.feed(Skeletons.Note({
      className: `${this.fig.family}__error`,
      content,
    }))
  }
  /**
   * 
   */
  parseInfo(data) {
    let r = super.parseInfo(data);
    if (!this.info || !this.info['page size']) return null;
    for (let attr of ['pages', 'page size']) {
      if (_.isArray(this.info[attr])) {
        this.info[attr] = this.info[attr][0];
      }
    }
    this.info.pages = ~~this.info.pages;
    if (this.info.pages < 1) {
      this.warn(`Got abnormal page numbers (${this.info.pages})`);
      this.info.pages = 1;
    }
    return r;
  }

  /**
   * 
   */
  rebuild() {
    if (this.isRebuilding) return;
    const { nid, hub_id } = this.actualNode();
    const { keysel } = bootstrap();
    let opt = {
      service: SERVICE.media.toPdf,
      nid,
      hub_id,
      keysel
    };
    this.isRebuilding = 1;
    this.fetchService(opt).then((data) => {
      this.isRebuilding = 0;
      this._isBuildingPages = 0;
      if (data.buildState == "wait") {
        if (!this.__progressText || this.__progressText.isDestroyed()) {
          this.feed(require('./skeleton')(this, LOCALE.PREVIEW_GENERATION));
        } else {
          this.message(LOCALE.PREVIEW_GENERATION);
        }
      }
    }).catch((e) => {
      this.isRebuilding = 0;
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
    })

  }

  /**
   * 
   */
  prepare() {
    let m = this.media;
    const { nid, hub_id } = this.actualNode();
    const { keysel } = bootstrap();
    var opt = {
      service: SERVICE.media.info,
      nid,
      hub_id,
      keysel
    };

    this.fetchService(opt).then((data) => {
      if (m) m.wait(0);
      if (_.isEmpty(data)) {
        this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
        return;
      }
      if (['working', 'rebuild'].includes(data.buildState)) {
        this.rebuild();
        return;
      }
      if (this.parseInfo(data)) {
        this.display();
        return;
      }
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW);
    }).catch((e) => {
      if (m && m.wait) m.wait(0);
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
    })

  }

  /**
   * 
   */
  updateMenu() {
    this.ensurePart('doc-actions').then((p) => {
      p.feed(require('./skeleton/menu')(this).kids)
    })
  }

  /**
   * The desk workspace rectangle in VIEWPORT coords — the area below the top
   * header and right of the left sidebar. Mirrors the window-tab zoom so a
   * maximized document fills exactly the workspace, never the header/sidebar.
   */
  _workspaceRect() {
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  /**
   * Current window bounds relative to the player's offset parent, used as the
   * restore target when un-zooming.
   */
  _snapshotBounds() {
    const pos = this.$el.position() || { left: 0, top: 0 };
    return {
      left: Math.round(pos.left),
      top: Math.round(pos.top),
      width: Math.round(this.$el.outerWidth()),
      height: Math.round(this.$el.outerHeight()),
    };
  }

  /**
   * The workspace-filling bounds expressed in the player's offset-parent
   * coordinates: the workspace viewport rect minus the offset parent's viewport
   * origin (read directly, so it's correct wherever the parent sits).
   */
  _workspaceTarget() {
    const ws = this._workspaceRect();
    const parent = this.el.offsetParent || this.el.parentElement || document.body;
    const pr = parent.getBoundingClientRect();
    return {
      left: Math.round(ws.left - pr.left),
      top: Math.round(ws.top - pr.top),
      width: ws.width,
      height: ws.height,
    };
  }

  /**
   * Apply the full-workspace bounds to the window. `animate` tweens (button
   * toggle) vs. snaps (initial open / live resize tracking). Does NOT touch
   * _preZoomBounds (the un-zoom restore target). Re-applying also resizes the
   * editor iframe, so OnlyOffice (which only re-fits on a container resize)
   * re-measures to the new size automatically.
   */
  _applyWorkspaceBounds(animate) {
    const target = this._workspaceTarget();
    this.size = { width: target.width, height: target.height - this.topbarHeight };
    this.$el.stop(true, false);
    if (animate) {
      this.$el.animate(target, {
        duration: 200,
        queue: false,
        complete: () => {
          this.$el.css(target);
          this.style.set(target);
        },
      });
    } else {
      this.style.set(target);
      this.$el.css(target);
    }
  }

  /**
   * Keep a maximized document filling the workspace when the workspace itself
   * resizes (browser resize, sidebar collapse, DevTools dock/undock). The
   * folder window gets this from the WM's responsive handler; the player tracks
   * the workspace element directly.
   */
  _observeWorkspace() {
    if (this._wsObserver || typeof ResizeObserver === 'undefined') return;
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) return;
    this._wsObserver = new ResizeObserver(() => {
      if (this._zoomed) this._applyWorkspaceBounds(false);
    });
    this._wsObserver.observe(el);
  }

  /**
   * Toggle maximize-to-workspace, like the window-tab zoom: maximize fills the
   * workspace (and keeps tracking it on resize); the next call restores the
   * prior bounds.
   */
  toggleZoom() {
    if (this._zoomed && this._preZoomBounds) {
      const target = this._preZoomBounds;
      this._zoomed = false;
      this._preZoomBounds = null;
      this.size = { width: target.width, height: target.height - this.topbarHeight };
      this.$el.stop(true, false).animate(target, {
        duration: 200,
        queue: false,
        complete: () => {
          this.$el.css(target);
          this.style.set(target);
        },
      });
    } else {
      this._preZoomBounds = this._snapshotBounds();
      this._zoomed = true;
      this._applyWorkspaceBounds(true);
      this._observeWorkspace();
    }
  }

  /** Current browser-fullscreen element (webkit fallback), or null. */
  _fullscreenElement() {
    return (
      document.fullscreenElement || document.webkitFullscreenElement || null
    );
  }

  /**
   * Toggle true browser fullscreen on the whole viewer — fills the monitor,
   * distinct from doc-zoom's maximize-to-workspace. Runs from the click
   * handler so requestFullscreen()'s user-gesture requirement is met.
   */
  toggleFullscreen() {
    if (this._fullscreenElement() === this.el) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (e) { /* ignore */ }
      }
    } else {
      const req = this.el.requestFullscreen || this.el.webkitRequestFullscreen;
      if (req) {
        try { req.call(this.el); } catch (e) { this.warn("fullscreen request failed", e); }
      }
    }
  }

  /** Sync the toolbar button glyph/state with the real fullscreen state. */
  _onFullscreenChange() {
    const isFs = this._fullscreenElement() === this.el;
    this._fullscreen = isFs;
    if (!this.el) return;
    const btn = this.el.querySelector('[data-partname="doc-fullscreen-btn"]');
    if (!btn) return;
    btn.dataset.state = isFs ? 1 : 0;
    const useEl = btn.querySelector("svg use");
    if (useEl) {
      const ico = isFs ? "desktop_reduce" : "player-fullscreen";
      useEl.setAttribute("xlink:href", `#--icon-${ico}`);
    }
  }

  /**
   * 
   */
  async edit() {
    // Window geometry is owned by initSize (maximize-to-workspace on open) and
    // the zoom button (toggleZoom) — this no longer enters native fullscreen.
    this.el.dataset.mode = _a.edit;
    this.mset({ mode: _a.edit })
    this.feed(require('./skeleton').edit(this, LOCALE.DOWNLOADING));
    const { nid, hub_id } = this.actualNode()
    let { user_domain, svc } = bootstrap()
    let host = user_domain || location.host
    // Forward the app theme so the editor matches it instead of defaulting to dark.
    const theme = (Visitor.wallpaper() || {}).theme || document.documentElement.dataset.theme || 'light'
    let url = `https://${host}${svc}${Platform.get('doc_editor')}.html?hub_id=${hub_id}&nid=${nid}&theme=${theme}`
    // Secure-share recipient: pass the share token so the editor service forces
    // read-only mode from the share's caps (Phase 1). DMZ-only; a normal desk
    // editor request carries no token, so its URL is byte-identical.
    if (Visitor.inDmz) {
      const _tok = this.mget(_a.token);
      if (_tok) url += `&token=${encodeURIComponent(_tok)}`;
      // The creator's signed owner-edit token (present ONLY for the genuine owner
      // previewing their own link) lets the editor service grant edit per the link's
      // caps; absent for recipients/anonymous, so their URL is byte-identical.
      const _ot = this.mget('owner_edit_token');
      if (_ot) url += `&otoken=${encodeURIComponent(_ot)}`;
    }

    this._editorOrigin = new URL(url).origin;
    this._editorReady = false;
    this._onEditorMessage = (e) => {
      if (this._editorReady) return;
      if (this._editorOrigin && e.origin !== this._editorOrigin) return;
      const data = e.data;
      const ev = (data && (data.event || data.type)) || data;
      if (EDITOR_READY_EVENTS.has(ev)) {
        this._hideEditorProgress();
      }
    };
    window.addEventListener('message', this._onEditorMessage);

    // ensurePart and Kind.waitFor are independent — run in parallel
    const [p] = await Promise.all([
      this.ensurePart(_a.content),
      Kind.waitFor('iframe'),
    ]);
    p.feed({
      kind: 'iframe',
      url,
      onLoad: () => {
        this.updateMenu();
        // OnlyOffice JS keeps bootstrapping after the HTML onLoad fires;
        // keep the spinner up briefly as a fallback in case the editor
        // never posts a ready event.
        clearTimeout(this._editorReadyFallback);
        this._editorReadyFallback = setTimeout(
          () => this._hideEditorProgress(),
          EDITOR_READY_FALLBACK_MS,
        );
      }
    });
  }

  _cleanupEditorListeners() {
    if (this._onEditorMessage) {
      window.removeEventListener('message', this._onEditorMessage);
      this._onEditorMessage = null;
    }
    if (this._editorReadyFallback) {
      clearTimeout(this._editorReadyFallback);
      this._editorReadyFallback = null;
    }
  }

  _hideEditorProgress() {
    if (this._editorReady) return;
    this._editorReady = true;
    this._cleanupEditorListeners();
    this.ensurePart('progress')
      .then((p) => {
        if (p && !p.isDestroyed()) p.setState(0);
      })
      .catch(() => { });
  }

  /**
   * 
   */
  preview() {
    this._cleanupEditorListeners();
    this._editorReady = false;
    this.reloadTimer = 0;
    this.reload(0);
    this.el.dataset.mode = _a.preview;
    this.mset({ mode: _a.preview })
    this.updateMenu();
  }

  /**
   * 
   */
  reload(wait = 0) {
    this.el.dataset.state = 1;
    this.el.style.opacity = 1;
    if (this.reloadTimer) return;
    /** Prevent mulpiple reload */
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
    }, 2000);
    Kind.waitFor('document_page').then(() => {
      this._isBuildingPages = 0;
      this.feed(require('./skeleton')(this, LOCALE.PREVIEW_GENERATION));
      if (wait) {
        setTimeout(this.prepare.bind(this), wait);
      } else {
        this.prepare();
      }
      //
    });
  }


  /**
   * 
   * @param {*} v 
   */
  onFetchProgress(p) {
    let v = p.loaded / p.total;
    v = v * 100;
    if (v >= 100) {
      this.__progressBar.el.style.width = 0;
      this._downloadCompleted = 1;
      this.__progress.el.dataset.state = 0;
      this.message();
      return;
    }

    if (this.__progress) {
      this.message(LOCALE.DOWNLOADING + ` - ${filesize(p.loaded)}/${filesize(p.total)}`);
      if (!this.__progressBar || this.__progressBar.isDestroyed()) return;
      this.__progressBar.el.style.width = `${v}%`;
    }
    return true;
  }

  /**
   * 
   * @param {*} v 
   */
  nextPages() {
    let p = this._pages.shift()
    if (!p) return
    this.pagesList.append(p);
    this.loadedPages++;
    this.__progress.el.dataset.state = 0;
    if (this._pages.length >= 1 && this.loadedPages <= 2) {
      setTimeout(() => {
        this.nextPages()
      }, 1000)
    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.list:
        this.pagesList = child;
        this.timer = null;
        child.on(_e.scroll, ((list) => {
          if (this.timer || list.scrollDir != _a.down) return;
          this.nextPages()
        }))
        break;
      case "navbar":
        return this.navbar = child;
      default:
        super.onPartReady(child, pn);
    }
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  resizeStart(e, ui) {
    this.size = {
      width: ui.size.width,
      height: ui.size.height - this.offsetY
    };
    const p = this.pagesList.children.first();
    return this.innserSize = {
      width: p.size.width,
      height: p.size.height
    };
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  resizeStop(e, ui) {
    const s = ui.size.width / this.size.width;
    this.size = {
      width: ui.size.width,
      height: ui.size.height - this.offsetY
    };
    this.pagesList.setSize(this.size.width, this.size.height, 1);

  }


  /**
   * 
   * @param {*} w 
   */
  resizeX(w) {
    const s = w / this.size.width;
    this.size.width = w;
    this.size.height = this.scaleFactor * s * this.size.height;
    this.pagesList.setSize(w, this.size.height, 1);
  }

  /**
   * 
   * @param {*} size 
   * @param {*} cb 
   */
  initSize(size, cb) {
    this.raise();
    let o = require("window/configs/default")();
    this.el.dataset.ready = 1;
    let maxWidth = 10240;
    let maxHeight = 900;
    const max_height = window.innerHeight - o.offsetY - 2 * o.marginY;
    const max_width = window.innerWidth - 2 * o.marginX;
    if (this.mget(_a.mode) == _a.edit) {
      // Open the editor maximized to the workspace (header and sidebar stay
      // visible) — same bounds the zoom button uses.
      const ws = this._workspaceRect();
      const base = this._workspaceTarget();
      // Centered windowed size to restore to when the user un-zooms.
      const rw = Math.min(1100, Math.round(ws.width * 0.85));
      const rh = Math.round(ws.height * 0.92);
      this._preZoomBounds = {
        left: base.left + Math.round((ws.width - rw) / 2),
        top: base.top + Math.round((ws.height - rh) / 2),
        width: rw,
        height: rh,
      };
      this._zoomed = true;
      // Size instantly (no width/height tween) so the editor iframe initializes
      // at the correct size, then keep it fitted as the workspace resizes.
      this._applyWorkspaceBounds(false);
      this._observeWorkspace();
      TweenMax.fromTo(this.$el, 0.35, { opacity: 0 }, { opacity: 1, ease: Expo.easeOut });
      return
    }
    this.size = this.max_size();
    // In a DMZ/secure-share recipient session the window-manager element is the
    // constrained share card, so max_size() is far too small — a wide document
    // (e.g. a spreadsheet PDF) overflows and its rows/cells overlap (only fixed by
    // going fullscreen). Size from the viewport instead (~2/3 width) so the doc
    // opens with room to render, matching the desk experience. Gated on
    // uiRouter.isDmz() (boot area dmz|share) → the desk path is byte-identical.
    if (window.uiRouter && typeof window.uiRouter.isDmz === 'function' && window.uiRouter.isDmz()) {
      this.size.width  = Math.round(window.innerWidth * 0.66);
      this.size.height = Math.round(window.innerHeight * 0.9);
      // v3.3.28 set this.size.width but the desktop branch below only ever
      // applies height to the element (line ~911) — the page raster reads the
      // element's REAL width (page/index.js: scale = canvasWrapper.width()/pageWidth),
      // so a wide spreadsheet stayed cramped/distorted until fullscreen. Write the
      // chosen width to the element so the viewport sizing actually takes effect.
      // DMZ-only: the desk path keeps its existing width untouched.
      this.$el.width(this.size.width);
    } else {
      this.size.width = this.size.width * .9;
      this.size.height = this.size.height * .9;
    }


    if (this.size.width > maxWidth) {
      this.size.width = maxWidth;
    }
    this.$el.height(this.size.height);

    let s = fitBoxes(this.size, { width: window.innerWidth, height: window.innerHeight });
    let height = s.height + o.topbarHeight;
    let dy = o.marginY;
    let shiftY = this.mget('shiftY') || 0;
    let shiftX = this.mget('shiftX') || 0;
    if (height > max_height) {
      s.width = s.width * max_height / height;
      height = max_height;
      dy = 0;
    } else if (s.width > max_width) {
      height = height * max_width / s.width;
      s.width = max_width;
    }
    let x = (((max_width - s.width) / 2) - Wm.$el.offset().left) + this._lastX;
    let pos;
    if (Visitor.isMobile()) {
      pos = { left: 0, top: -o.offsetY };
      s.width = window.innerWidth;
      height = window.innerHeight;
      pos.width = s.width;
      pos.height = height;
      pos.top = 0;
      pos.left = 0;
      x = 0;
    } else {
      pos = {
        top: (dy - this.offset.top) + shiftY,
        left: x + shiftX,
      }
      this.anti_overlap(pos);
      if (pos.top < 10) pos.top = 10;
    }
    if (pos.left < 0) pos.left = 50
    if (pos.top < 0) pos.top = 50
    TweenMax.fromTo(this.$el, 1.5,
      { scale: 0.15, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        ease: Expo.easeInOut,
        ...pos,
      }
    );
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.model.get(_a.service);
    let { url, filename, nid, hub_id } = this.actualNode()
    switch (service) {
      case _e.close:
        this.goodbye();
        break;

      case _a.link:
        break;

      case _a.edit:
        this.edit()
        break;

      case _a.preview:
        this.preview()
        break;

      case "read-new-version":
        this.reload(200);
        break;

      case "skip-new-version":
        this.__overlay.clear();
        break;

      case "doc-zoom":
        this.toggleZoom();
        break;

      case "doc-fullscreen":
        this.toggleFullscreen();
        break;

      case 'download-pdf':
        if (this._dmzGateDownload()) return;
        url = `${bootstrap().serviceUrl}${SERVICE.media.pdf}?nid=${nid}&hub_id=${hub_id}`;
        let f = filename.split('.')
        f.pop()
        filename = f.join() + '.pdf'
        this.fetchFile({ url, download: filename })
        break;

      case "print":
        if (this._dmzGateDownload()) return;
        this.loadedPages = 0;
        this.initProgess()
        this.once(_e.eod, async (blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const { default: printJS } = await import(/* webpackChunkName: "print-js" */ 'print-js');
          printJS({
            printable: blobUrl,
            type: 'pdf',
            onError: (error) => {
              console.error('Print failed:', error);
              URL.revokeObjectURL(blobUrl);
            },
            onPrintDialogClose: () => {
              this.__progress.setState(0)
              URL.revokeObjectURL(blobUrl); // Clean up
            }
          });
        })
        url = `${bootstrap().serviceUrl}${SERVICE.media.pdf}?nid=${nid}&hub_id=${hub_id}`
        this.fetchFile({ url })
        break;

      case _e.download:
        if (this._dmzGateDownload()) return;
        this.fetchFile({ url, download: filename })
        break;

      case 'dmz-request-edit':
        // Share recipient without an edit grant asked to edit → open the share's
        // request-access flow. Reuse the wired dmz-request-download gate (player →
        // wm → sharebox → Request Access for signed-in non-members / sign-up for
        // anonymous); the popup is multi-select so they pick "edit".
        return this.triggerHandlers({ service: 'dmz-request-download' });

      default:
        return super.onUiEvent(cmd);
    }
  }

}

module.exports = __player_document;
