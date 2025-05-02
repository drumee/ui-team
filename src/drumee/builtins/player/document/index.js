
const { filesize, fitBoxes } = require("core/utils")
const { TweenMax, Expo } = require("gsap/all");
const __core = require('player/interact');

const { getDocument, GlobalWorkerOptions } = require("pdfjs-dist");
if (typeof (Promise.withResolvers) === 'undefined') {
  window.Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  GlobalWorkerOptions.workerSrc = bootstrap().pdfworkerLegacy;
} else {
  GlobalWorkerOptions.workerSrc = bootstrap().pdfworker;
}

class __player_document extends __core {

  constructor(...args) {
    super(...args);
    this.checkPreview = this.checkPreview.bind(this);
    this.handleWsEvent = this.handleWsEvent.bind(this);
  }

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
      const unit = parseInt(a[3]);
      this.ratio = h / w;
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
  async loadPages(pdf) {
    this.pdf = pdf;
    const { numPages } = pdf;
    this.totalPages = numPages;
    let batchSize = Math.min(numPages, 5);
    this.loadedPages = 0;
    for (let i = 1; i <= batchSize; i++) {
      let page = await pdf.getPage(i);
      let p = {
        kind: "document_page",
        page,
        logicalParent: this,
        ratio: this.ratio,
        uiHandler: [this],
        pageNum: i,
        attribute: {
          id: `page-${i}`
        },
      };
      this.pagesList.append(p);
      this.loadedPages++;
    }
  }

  /**
    * 
    * @param {*} pdf 
    */
  async nextPages() {
    let pdf = this.pdf;
    const { numPages } = pdf;
    this.totalPages = numPages;
    this.loadedPages++;
    let pageNum = this.loadedPages
    if (pageNum >= numPages) {
      return;
    }
    let page = await pdf.getPage(pageNum);
    let p = {
      kind: "document_page",
      page,
      logicalParent: this,
      ratio: this.ratio,
      uiHandler: [this],
      pageNum,
      attribute: {
        id: `page-${pageNum}`
      },
    };
    this.pagesList.append(p);

  }

  /**
   * 
   */
  initProgess() {
    if (this.loadedPages) return;
    if (!this.__progress) return;
    this.__progress.el.dataset.state = 1;
  }

  /**
   * 
   */
  confirmReload() {
    if (!this.__overlay.isEmpty()) return;
    this.__overlay.feed(require('./skeleton/content-changed').default(this));
  }

  /**
   * 
   */
  message(content) {
    if (!this.__progressText) return;
    this.__progressText.set({ content });
  }

  /**
   * 
   */
  checkBuildState() {
    if (this.pollCount > 10) {
      this.warn("Giving up loadig new version");
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
  handleWsEvent(args = {}) {
    let { data, options } = args || {};
    let { echoId, service } = options
    switch (service) {
      case "media.status":
        this.checkPreview(args);
        break;
    }

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
        this.reload(200);
      }
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
    const { url, nid, hub_id } = this.actualNode(_a.pdf);
    let w = this.size.width;
    try {
      const a = this.info['page size'].split(/ +/);
      w = parseInt(a[0]);
      const h = parseInt(a[2]);
      this.ratio = h / w;
    } catch (e) {
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
    }
    let load_doc = (url) => {
      this.debug("210:URL", url)
      let loader = getDocument({
        ...this._headers,
        url,
      });
      _.delay(this.initProgess.bind(this), 1000);
      loader.onProgress = this.onFetchProgress.bind(this);
      loader.promise.then(this.loadPages.bind(this), this.handleError.bind(this));
      this.loader = loader;
    }
    this.message(LOCALE.DOWNLOADING);
    load_doc(url);
  }


  handleError(e) {
    this.warn("AAA:182", e);
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
      if (m) m.wait(0);
      this.crash(LOCALE.UNABLE_TO_GENERATE_PREVIEW, e);
    })

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
   */
  onDomRefresh() {
    this.initSize();
    this.reload();
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

    if (!this.__progressBar || this.__progressBar.isDestroyed()) return;
    this.__progressBar.el.style.width = `${v}%`;
    if (this.__progress) {
      this.__progress.el.dataset.state = 1;
      this.message(LOCALE.DOWNLOADING + ` - ${filesize(p.loaded)}/${filesize(p.total)}`);
    }
    return true;
  }

  /**
   * 
   * @param {*} v 
   */
  onPageRendered(p) {
    this.__progress.el.dataset.state = 0;
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
          let th = list.contentHeight() * this.loadedPages * .8;
          if (this.timer || list.scrollDir != _a.down) return;
          if (list.getOffsetY() < th) return;
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
    let maxWidth = 742;
    this.size = this.max_size();
    this.size.width = this.size.width * .9;
    this.size.height = this.size.height * .9;
    if (this.size.width > maxWidth) {
      this.size.width = maxWidth;
    }
    this.$el.height(this.size.height);

    let s = fitBoxes(this.size, { width: window.innerWidth, height: window.innerHeight });
    let height = s.height + o.topbarHeight;
    let dy = o.marginY;
    let shiftY = this.mget('shiftY') || 0;
    let shiftX = this.mget('shiftX') || 0;
    const max_height = window.innerHeight - o.offsetY - 2 * o.marginY;
    const max_width = window.innerWidth - 2 * o.marginX;
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
    switch (service) {
      case _e.close:
        this.goodbye();
        break;

      case _a.link:
        break;

      case 'page-rendered':
        this.onPageRendered(args.pageNum);
        break;

      case "read-new-version":
        this.reload(200);
        break;

      case "skip-new-version":
        this.__overlay.clear();
        break;

      default:
        return super.onUiEvent(cmd);
    }
  }

}

module.exports = __player_document;
