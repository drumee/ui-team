const EOD = "end:of:data";
const OPEN_NODE = "open-node";
const WS_EVENT = "ws:event";

const Rectangle = require("rectangle-node");
const { TimelineMax, Expo, TweenMax } = require("@drumee/ui-core/vendor");
const EDITABLES = require('../player/document/editable');

const ViewMode = new Map();
const DEFAULT = "default";
ViewMode.set(DEFAULT, _a.icon);

let editorPrewarmed = false;

/**
 * heavy weight editors get preloaded whenever there is a file that may use them
 */
function prewarmEditors() {
  if (editorPrewarmed) return;
  editorPrewarmed = true;
  const schedule = (typeof requestIdleCallback === 'function')
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 0);
  schedule(() => {
    // NOTE: the office-editor (euroffice) iframe prewarm was removed — its
    // `svc/euroffice.preload` endpoint uses header-token auth, which an <iframe>
    // src cannot carry, so it always returned 401 (onload never fired, nothing
    // was actually preloaded). The browser logged that failed GET as a console
    // error for zero benefit. The real editor open authenticates separately.
    // 1) Warm the iframe Kind so the first document open doesn't pay
    //    the dynamic-import cost.
    try { Kind.waitFor('iframe'); } catch (e) { /* non-fatal */ }
    // Lazy-require: this util is the base window module, loaded very early in
    // bootstrap. A top-level `require` of the ESM pdfium-wrapper can resolve
    // before that module has finished evaluating, capturing `undefined`
    // ("initializePdfium is not a function"). Resolving here — when prewarm
    // actually runs, well after module init — gets the real export. Non-fatal.
    try {
      const { initializePdfium } = require('../player/document/pdfium-wrapper');
      // initializePdfium is async — its returned promise can reject (e.g. a WASM
      // LinkError). Catch BOTH the sync throw and the async rejection so a prewarm
      // failure stays non-fatal instead of surfacing as an Uncaught (in promise).
      if (typeof initializePdfium === 'function') {
        Promise.resolve(initializePdfium()).catch((err) =>
          console.log("prewarm pdfium:", (err && err.message) || err));
      }
    } catch (e) { console.log("prewarm pdfium:", e); /* non-fatal */ }
  });
}

/**
 * Detect if there is a file that may need editors to be preloaded.
 * The fist file found from the list fetching or the one just uploaded.
 */
function preloadEditors(e, collection, handler) {
  if (e.get(_a.filetype) === _a.document) {
    prewarmEditors()
    collection.off(_e.add, handler)
  } else if (e.get(_a.filetype) === _a.pseudo) {
    try {
      let extension = e.get(_a.file).name.split('.').pop()
      if (EDITABLES.includes(extension)) {
        prewarmEditors()
        collection.off(_e.add, handler)
      }
    } catch (e) {
    }
  }
}


/**
 * Sync `md5Hash` into a view's existing `metadata` blob without
 * dropping any other fields it already had (dataType, geometry, etc.).
 * Used after a rotate/replace WS broadcast so cache-bust URLs reflect
 * the new content — see `updateContent` for the full reasoning.
 */
function __mergeMd5IntoMetadata(view, md5Hash) {
  if (!view || !md5Hash || typeof view.mget !== "function") return;
  let md = view.mget(_a.metadata);
  let wasString = false;
  if (md == null) {
    md = {};
  } else if (typeof md === "string") {
    wasString = true;
    try {
      md = JSON.parse(md);
    } catch (e) {
      md = {};
    }
  }
  if (md.md5Hash === md5Hash) return;
  md.md5Hash = md5Hash;
  view.mset({ metadata: wasString ? JSON.stringify(md) : md });
}

class __window_mfs extends DrumeeMFS {
  constructor(...args) {
    super(...args);
    this.buildIconsList = this.buildIconsList.bind(this);
    this.newContent = this.newContent.bind(this);
    this.handleWsEvent = this.handleWsEvent.bind(this);
  }

  initialize(opt) {
    this._watchdog(opt);
    super.initialize(opt);
    this.topbarHeight = this.configs().topbarHeight;
    this._synced = {};
    this.mset({ echoId: Visitor.get(_a.socket_id) + this.cid });
    this.setViewMode(ViewMode.get(DEFAULT) || _a.icon);
    this.updateBreadcrumb(opt, this);
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
    if (m.mget(_a.filetype) == _a.hub && m.mget(_a.actual_home_id)) {
      this.mset({ nid: m.mget(_a.actual_home_id) });
    }
    this.parentFolder = m.logicalParent || m.mget("logicalParent");
    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.on(_e.keyup, this._kbHandler);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this._checkChangelog = this._checkChangelog.bind(this);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this._changelog_id = null;
    this._goneHiddenTime = new Date().getTime();
  }

  /**
   *
   * @param {*} data
   */
  updateBreadcrumb(data, src) {
    RADIO_BROADCAST.trigger("breadcrumb:content", data, src);
  }

  /**
   *
   * @param {*} e
   */
  onVisibilityChange(e) {
    this.visible = !document.hidden;
    let now = new Date().getTime();
    let prev = this._goneHiddenTime;
    this._goneHiddenTime = now;
    if (now - prev <= 5000) {
      return;
    }
    if (document.hidden) {
      return;
    }
    if (wsRouter.timestampAge() < 10000) return;
    this._checkChangelog();
  }

  /**
   * In case of updates through websocket were missing because of DOM gone idle for any reason
   * Try tu refresh by looking into changelog
   */
  _checkChangelog() {
    if (this.mget(_a.kind) == "window_meeting") return;

    let pid = this.getCurrentNid();
    let cur_hub_id = this.mget(_a.hub_id);
    let nid = pid;
    if (this.mget(_a.filepath) == "/") {
      nid = this.mget(_a.home_id);
    }
    let args = { hub_id: cur_hub_id, nid };
    if (this._changelog_id) {
      args.id = this._changelog_id;
    } else {
      args.last = 5;
    }
    let changed = 0;
    if (this.__list && !this.__list.isDestroyed()) {
      for (let m of this.__list.children.toArray()) {
        if (m.isUploading) {
          return;
        }
      }
    }
    this.fetchService(SERVICE.changelog.read, args).then((data = []) => {
      if (!data.length) return;
      let rows = data.filter((e) => {
        const { src, dest, hub_id } = e;
        if (!hub_id || !src) return false;
        if (hub_id != cur_hub_id) return false;
        if (_.isArray(src)) {
          let s = src.filter((e) => {
            if (e.parent_id != pid) return false;
          });
          changed = changed + s.length;
        }
        if (_.isArray(dest)) {
          let s = dest.filter((e) => {
            if (e.parent_id != pid) return false;
          });
          changed = changed + s.length;
        }
        if (src.hub_id && src.hub_id != cur_hub_id) return false;
        if (dest.hub_id && dest.hub_id != cur_hub_id) return false;
        if (src.parent_id == pid) return true;
        if (dest.parent_id == pid) return true;
        return false;
      });
      this._changelog_id = data[0].id + 1;
      changed = changed + rows.length;
      if (changed && this.loadContent) {
        this.loadContent();
      }
    });
  }

  /**
   *
   * @returns
   */
  onBeforeDestroy(opt) {
    if (this._responsive) RADIO_BROADCAST.off(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.off(_e.keyup, this._kbHandler);
    Wm.off(WS_EVENT, this.handleWsEvent);
    if (
      this._partitionObserver ||
      this._partitionDebounce ||
      this._partitionRetryTimer ||
      this._partitionSettleTimer
    ) {
      this._cleanupPartition();
    }
    if (super.onBeforeDestroy) {
      super.onBeforeDestroy(opt);
    }
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  /**
   * Ensure the widget will show.
   * Otherwise remove after timeout
   */
  _watchdog(opt) {
    this.on(_e.show, (e) => {
      if (this._watchdogTimer) {
        clearTimeout(this._watchdogTimer);
      }
    });
    this._watchdogTimer = setTimeout(() => {
      this.warn("Got watchdog timeout", this);
      this.suppress();
    }, 10000);
  }

  /**
   *
   */
  onBeforeRender() {
    super.onBeforeRender();
    let last_y = 0;
    let last_x = 0;
    if (!Visitor.isMobile()) {
      for (var c of this.parent.children.toArray()) {
        last_y = c.style.get(_a.top);
        last_x = c.style.get(_a.left);
        if (c != this) {
          if (last_y == this.style.get(_a.top)) {
            let y = last_y + this.topbarHeight;
            if (y + this.style.get(_a.height) > window.innerHeight) {
              y = last_y - this.topbarHeight;
            }
            this.style.set({
              top: y,
            });
          }
          if (last_x == this.style.get(_a.left)) {
            let x = last_x + this.topbarHeight;
            if (x + this.style.get(_a.width) > window.innerWidth) {
              x = last_x - this.topbarHeight;
            }
            this.style.set({
              left: x,
            });
          }
        }
      }
    } else {
      this.style.set({ top: 0, left: 0 });
    }
    Wm.on(WS_EVENT, this.handleWsEvent);
  }

  /**
   *
   * @param {*} k
   */
  configs(k) {
    return require("window/configs/default")(k);
  }

  /**
   * Wire up the icons list when its part is ready.
   * Folder window bypasses this via its own buildContent override (dual List.Smart).
   * Non-folder surfaces (share, search, meeting, home wm) continue to use this path.
   * @param {*} child
   * @param {*} pn
   */
  buildIconsList(child, pn) {
    this.iconsList = child;
    this.mosaic = [];
    let timer = null;
    if (Visitor.isMobile()) {
      timer = setTimeout(() => {
        timer = null;
        child.el.dataset.wait = 1;
      }, 300);
    }

    // Home wm uses 3-tier partition (workspace → folder → file). Other
    // surfaces (search, meeting) keep flat list. Folder window bypasses
    // buildIconsList entirely via buildContent override. The DMZ share grid
    // also bypasses buildIconsList (its own onPartReady), and wires the same
    // partition setup there — see modules/dmz/wm/index.js.
    const usesPartition = this.isWm === 1;
    if (usesPartition) {
      child.el.style.visibility = "hidden";
      const scrollEl = child.el.querySelector(".smart-container");
      if (scrollEl) scrollEl.style.visibility = "hidden";
      this._partitionListPart = child;
      this._setupPartitionObserver(child);
    }

    const f = (e) => {
      preloadEditors(e, child.collection, f)
    }
    if (!editorPrewarmed) {
      child.collection.on(_e.add, f)
    }

    child.once(EOD, () => {
      if (timer) clearTimeout(timer);
      child.el.dataset.wait = 0;
      child.$el.removeClass("drumee-sprinner");
      if (usesPartition) {
        this._partitionFoldersAndFiles(child);
      }
      this.syncContent(EOD);
      this._dataReady = true;
      this.trigger(EOD);
    });
    this.syncBounds();
    if (this.getViewMode() === _a.row) {
      this.sortContent();
    }
    child.el.dataset.role = _a.container;
  }

  /**
   * Home grid partition (desk wm) — keeps MutationObserver for home workspace.
   * Folder window does NOT call this (bypassed via buildContent override in folder/index.js).
   */
  _cleanupPartition() {
    if (this._partitionObserver) {
      this._partitionObserver.disconnect();
      this._partitionObserver = null;
    }
    if (this._partitionDebounce) {
      cancelAnimationFrame(this._partitionDebounce);
      this._partitionDebounce = null;
    }
    if (this._partitionRetryTimer) {
      clearTimeout(this._partitionRetryTimer);
      this._partitionRetryTimer = null;
    }
    if (this._partitionSettleTimer) {
      clearTimeout(this._partitionSettleTimer);
      this._partitionSettleTimer = null;
    }
    if (this._partitionListPart) {
      this._partitionListPart.el.style.visibility = "visible";
      const sc = this._partitionListPart.el.querySelector(".smart-container");
      if (sc) {
        sc.style.visibility = "visible";
        sc.dataset.partitioning = 0;
      }
      this._partitionListPart = null;
    }
  }

  // Settle after first successful partition: clear pending timers + flip
  // visibility flags. Keep MutationObserver alive so subsequent inserts
  // (uploads, new folders, paste) get re-partitioned. Disconnecting the
  // observer here was the cause of "upload → grid resets to 1 column" —
  // the new item lands directly in .smart-container (no section wrapper)
  // and inherits the flex-column layout.
  _schedulePartitionCleanup(listPart) {
    if (this._partitionSettleTimer) {
      clearTimeout(this._partitionSettleTimer);
    }
    this._partitionSettleTimer = setTimeout(() => {
      this._partitionSettleTimer = null;
      if (this._partitionDebounce) {
        cancelAnimationFrame(this._partitionDebounce);
        this._partitionDebounce = null;
      }
      if (this._partitionRetryTimer) {
        clearTimeout(this._partitionRetryTimer);
        this._partitionRetryTimer = null;
      }
      if (listPart) {
        listPart.el.style.visibility = "visible";
        const sc = listPart.el.querySelector(".smart-container");
        if (sc) {
          sc.style.visibility = "visible";
          sc.dataset.partitioning = 0;
        }
      }
    }, 500);
  }

  /**
   *
   * @param {*} listPart
   */
  _prepareListPartition(listPart) {
    this._partitionListPart = null;
    this._cleanupPartition();
    this._partitionListPart = listPart;
    listPart.el.style.visibility = "hidden";
    const scrollEl = listPart.el.querySelector(".smart-container");
    if (scrollEl) {
      scrollEl.dataset.partitioning = 1;
      scrollEl.style.visibility = "hidden";
    }
    if (scrollEl) {
      // 3-tier partition: workspace (hubs) → folder → file
      const ww = scrollEl.querySelector(".workspace-section");
      const fw = scrollEl.querySelector(".folder-section");
      const flw = scrollEl.querySelector(".file-section");
      if (ww) ww.remove();
      if (fw) fw.remove();
      if (flw) flw.remove();
    }
    this._setupPartitionObserver(listPart);
    this._partitionFoldersAndFiles(listPart);

    const f = (e) => {
      preloadEditors(e, listPart.collection, f)
    }
    if (!editorPrewarmed) {
      listPart.collection.on(_e.add, f)
    }

    listPart.once(EOD, () => {
      listPart.el.dataset.wait = 0;
      listPart.$el.removeClass("drumee-sprinner");
      this._partitionFoldersAndFiles(listPart);
      this.syncContent(EOD);
      this._dataReady = true;
      this.trigger(EOD);
    });
  }

  /**
   * 
   * @param {*} listPart 
   */
  _setupPartitionObserver(listPart) {
    if (this._partitionObserver) {
      this._partitionObserver.disconnect();
    }
    if (this._partitionDebounce) {
      cancelAnimationFrame(this._partitionDebounce);
    }
    this._partitionObserver = new MutationObserver(() => {
      const scrollEl = listPart.el.querySelector(".smart-container");
      if (scrollEl?.querySelector(":scope > .media-grid__ui")) {
        scrollEl.dataset.partitioning = 1;
      }
      // requestAnimationFrame instead of setTimeout(100): rAF fires BEFORE
      // the next paint, so the new direct-child item is partitioned into
      // its section in the same frame the mutation landed. The user never
      // sees the brief "hidden direct child" intermediate state — no flash
      // when uploading or pasting files.
      if (this._partitionDebounce)
        cancelAnimationFrame(this._partitionDebounce);
      this._partitionDebounce = requestAnimationFrame(() => {
        this._partitionDebounce = null;
        if (this._partitionObserver) {
          this._partitionObserver.disconnect();
        }
        const done = this._doPartition(listPart);
        if (this._partitionObserver) {
          this._partitionObserver.observe(listPart.el, {
            attributes: true,
            attributeFilter: ["data-filetype"],
            childList: true,
            subtree: true,
          });
        }
        if (done) {
          if (this._partitionRetryTimer) {
            clearTimeout(this._partitionRetryTimer);
            this._partitionRetryTimer = null;
          }
          this._schedulePartitionCleanup(listPart);
        } else if (this._partitionObserver) {
          this._partitionObserver.observe(listPart.el, {
            childList: true,
            subtree: true,
          });
        }
      });
    });
    this._partitionObserver.observe(listPart.el, {
      attributes: true,
      attributeFilter: ["data-filetype"],
      childList: true,
      subtree: true,
    });
  }

  _partitionFoldersAndFiles(listPart, attempt = 0) {
    if (this._partitionDebounce) {
      cancelAnimationFrame(this._partitionDebounce);
      this._partitionDebounce = null;
    }
    if (this._partitionRetryTimer) {
      clearTimeout(this._partitionRetryTimer);
      this._partitionRetryTimer = null;
    }
    const done = this._doPartition(listPart);
    if (done) {
      this._schedulePartitionCleanup(listPart);
      return;
    }
    this._setupPartitionObserver(listPart);
    const maxAttempts = listPart.collection?.length ? 50 : 30;
    if (attempt < maxAttempts) {
      this._partitionRetryTimer = setTimeout(() => {
        this._partitionRetryTimer = null;
        this._partitionFoldersAndFiles(listPart, attempt + 1);
      }, 100);
      return;
    }
    this._cleanupPartition();
    listPart.el.style.visibility = "visible";
    const scrollEl = listPart.el.querySelector(".smart-container");
    if (scrollEl) {
      scrollEl.style.visibility = "visible";
      scrollEl.dataset.partitioning = 0;
    }
  }

  _doPartition(listPart) {
    const scrollEl = listPart.el.querySelector(".smart-container");
    if (!scrollEl) return false;

    // 3-tier order top → bottom: workspaces (hubs) → folders → files
    let workspaceWrap = scrollEl.querySelector(".workspace-section");
    let folderWrap = scrollEl.querySelector(".folder-section");
    let fileWrap = scrollEl.querySelector(".file-section");

    const items = [...scrollEl.children].filter(
      (el) =>
        el !== workspaceWrap &&
        el !== folderWrap &&
        el !== fileWrap &&
        el.dataset?.filetype,
    );

    if (!items.length) {
      if (workspaceWrap || folderWrap || fileWrap) {
        scrollEl.style.visibility = "visible";
        scrollEl.dataset.partitioning = 0;
        listPart.el.style.visibility = "visible";
        return true;
      }
      return false;
    }

    // Append in stack order so DOM matches visual order (workspace top, file bottom).
    if (!workspaceWrap) {
      workspaceWrap = document.createElement("div");
      workspaceWrap.className = "workspace-section";
      scrollEl.appendChild(workspaceWrap);
    }
    if (!folderWrap) {
      folderWrap = document.createElement("div");
      folderWrap.className = "folder-section";
      scrollEl.appendChild(folderWrap);
    }
    if (!fileWrap) {
      fileWrap = document.createElement("div");
      fileWrap.className = "file-section";
      scrollEl.appendChild(fileWrap);
    }

    items.forEach((item) => {
      const ft = item.dataset?.filetype;
      if (ft === _a.hub) {
        workspaceWrap.appendChild(item);
      } else if (ft === _a.folder) {
        folderWrap.appendChild(item);
      } else {
        fileWrap.appendChild(item);
      }
    });

    scrollEl.style.display = "flex";
    scrollEl.style.flexDirection = "column";
    scrollEl.style.alignItems = "stretch";
    scrollEl.style.justifyContent = "flex-start";
    scrollEl.style.visibility = "visible";
    scrollEl.dataset.partitioning = 0;

    this._partitionListPart = null;
    listPart.el.style.visibility = "visible";
    return true;
  }

  /**
   *
   * @param {*} cmd
   */
  max_size() {
    if (Visitor.isMobile()) {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return {
      top: 20,
      left: 10,
      width: window.innerWidth - 250, // sidebar width
      height: window.innerHeight - 90,
    };
  }

  /**
   *
   */
  acknowledge(msg = LOCALE.ACK_COPY_LINK) {
    var c = require("@drumee/ui-core/letc/preset/ack")(this, msg);
    c.className = `${c.className} ${this.fig.group}-topbar__copy-link-ack`;
    this.append(c);
    const l = this.children.last();
    var f = () => {
      return l.suppress();
    };
    return setTimeout(f, Visitor.timeout());
  }

  /**
   *
   * @param {*} xhr
   * @param {*} options
   */
  purgeContent(data) {
    /** DO NOT DELETE */
  }

  /**
   * Abstract
   */
  updateStatus(args) {
    /** DO NOT DELETE */
  }

  /**
   *
   * @param {*} xhr
   * @param {*} oldData
   */
  newContent(xhr, options = {}) {
    const { data } = xhr;
    const { nid, pid } = data;
    let { echoId } = options;
    this.updateInnerHubsPreview(data);
    if (echoId == this.mget("echoId")) {
      return;
    }
    if (this.mget(_a.nid) != pid) return;
    let child = this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(data);
      if (c.restart) {
        setTimeout(() => {
          c.restart();
        }, 500);
      }
      return true;
    });
    if (child.length) return;
    data.format = this.mget(_a.format) || _a.card;
    data.kind = this._getKind();
    data.service = OPEN_NODE;
    if (this.iconsList) {
      if (data.position >= 0) {
        this.iconsList.append(data, data.position);
      } else {
        this.iconsList.append(data);
      }
    }
    this.syncBounds();
  }

  /**
   *
   */
  removeContent(args) {
    if (_.isArray(args)) {
      for (let item of args) {
        this.removeContent(item);
      }
      return;
    }
    this.updateInnerHubsPreview(args);
    let { nid, hub_id, filepath } = args;
    /** Remove children */
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c || c.mget(_a.pid) != this.getCurrentNid()) return false;
      c.goodbye();
    });

    /** Remove self */
    let re = new RegExp("^" + filepath);
    let path = this.mget(_a.filepath);
    if (this.mget(_a.hub_id) == hub_id && re.test(path) && path != "/") {
      this.goodbye();
      return;
    }
  }

  /**
   *
   */
  renameContent(data) {
    let { args } = data;
    let { dest } = args;
    let { nid, filename } = dest;
    if (this.mget(_a.nid) == nid) {
      this.mset(dest);
      this.update_name(_a.filename, filename);
    }
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      if (c.afterRename) c.afterRename(data);
    });
    if (dest.filetype == _a.hub) {
      this.updateSettings({ ...dest, fieldName: _a.filename });
    }
  }

  /**
   *
   */
  updateContent(args) {
    let { nid } = args;
    // A payload with no nid matches every widget that also has none — and
    // hub.set_privilege is exactly that shape ({ privilege, hub_id, area }),
    // so this used to sweep in windows that have nothing to do with a node.
    // The upload-progress floater was one of them: window/core's restart() is
    // `return this.iconsList.restart()`, and a floater has no iconsList, so it
    // threw. That exception escaped Wm.handleWsEvent, and because Backbone's
    // trigger runs listeners in sequence, every WS_EVENT subscriber registered
    // after Wm silently stopped receiving the event.
    //
    // "Update the node with id X" is meaningless without an X, so bail.
    if (nid == null) return;
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(args);
      // Cache-bust fix: actualNode()'s `?v=` prefers md5Hash > (mtime - ctime).
      // After a media.rotate/replace the server sends a new top-level
      // `md5Hash` but doesn't update the `metadata` blob; restart() then
      // calls metadata() which re-reads md5Hash from that stale blob and
      // clobbers the new top-level value. Merge the new md5Hash into the
      // child's existing metadata so both code paths agree.
      __mergeMd5IntoMetadata(c, args && args.md5Hash);
      if (c.restart) {
        c.restart();
      }
    });
    if (this.mget(_a.nid) == nid) {
      __mergeMd5IntoMetadata(this, args && args.md5Hash);
      if (this.restart) {
        this.restart();
      }
    }
  }

  /**
   *
   */
  updateSettings(args) {
    let { id, fieldName } = args;
    args.name = args[fieldName];
    this.getItemsByAttr("settingsId", `${id}.${fieldName}`).filter((c) => {
      if (fieldName && args[fieldName]) args.name = args[fieldName];
      c.mset(args);
      c.reload();
    });
    if (fieldName == _a.filename) {
      if (this.__refWindowName) {
        this.__refWindowName.set({ content: args.name });
      }
    }
  }

  /**
   *
   */
  downloadContent(args) {
    let { zipid } = args;
    this.getItemsByAttr("zipid", zipid).filter((c) => {
      if (!c) return false;
      c.handleDownload(args);
    });
  }

  /**
   * Folders can contain hubs. This funtion show hubs symboles whenever there are some hubs
   * down the tree
   * @param {*} src
   * @param {*} dest
   */
  updateInnerHubsPreview(src, dest) {
    this.__list?.children.forEach((c) => {
      let src_path = new RegExp(`^${c.mget(_a.filepath)}/`);
      if (src && src_path.test(src.filepath)) {
        if (!this._pendingUpdates[c.cid]) c.updateInnerNodes();
        this._pendingUpdates[c.cid] = 1;
      }
      if (dest && src_path.test(dest.filepath)) {
        if (!this._pendingUpdates[c.cid]) c.updateInnerNodes();
        this._pendingUpdates[c.cid] = 1;
      }
    });
  }

  /**
   *
   */
  moveContent(src, dest) {
    let { nid, echoId } = src;
    this.updateInnerHubsPreview(src, dest);
    if (echoId == this.mget("echoId")) {
      return;
    }
    let pid = this.getCurrentNid();
    if (![src.pid, dest.pid].includes(pid)) return;
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      if (c.logicalParent.cid !== this.cid) return;
      if (pid != src.pid) return;
      c.goodbye();
      return true;
    });
    this.newContent({ data: dest });
  }

  /**
   * Abstract to handle ws event
   */
  handleWsEvent(args = {}) {
    let { data, options } = args || {};
    let { echoId, service } = options;
    let { src, dest } = data.args || {};
    this._pendingUpdates = {};
    switch (service) {
      case SERVICE.media.rename:
        this.renameContent(data);
        break;

      case SERVICE.hub.delete_contributor:
      case SERVICE.hub.delete_hub:
      case SERVICE.desk.leave_hub:
      case "media.remove":
      case SERVICE.media.trash:
        this.removeContent(data);
        break;

      case "media.new":
      case SERVICE.desk.create_hub:
      case SERVICE.hub.add_contributors:
      case SERVICE.media.make_dir:
      case SERVICE.media.restore:
      case SERVICE.media.restore_into:
      case SERVICE.media.upload:
      case SERVICE.hub.invite:
        this.newContent({ data }, options);
        break;

      case SERVICE.media.copy:
        this.newContent({ data: dest }, options);
        break;

      case SERVICE.hub.update_name:
        this.updateSettings(data);
        break;

      case "media.status":
        this.updateStatus(args);
        break;

      case "media.purge":
        this.purgeContent(data);
        break;

      case "media.update":
      case SERVICE.hub.set_privilege:
      case SERVICE.media.replace:
      case SERVICE.media.rotate:
        this.updateContent(data);
        break;

      case SERVICE.media.save:
        if (data.replace) {
          delete data.replace;
          this.updateContent(data);
        } else {
          this.newContent({ data }, options);
        }
        break;

      case SERVICE.media.relocate:
      case SERVICE.media.move:
        if (echoId) {
          src.echoId = echoId;
          dest.echoId = echoId;
        }
        this.moveContent(src, dest);
        break;

      case "media.download":
        this.downloadContent(data);
        break;

      // SEO index worker finished — poster (thumb.png) may now exist for
      // doc/xls/xlsx office files; refresh node attrs so imgCapable() picks up
      // metadata.poster and the grid swaps icon → content thumbnail.
      case "seo.indexed":
        const { nid, hub_id } = data || {};
        if (!nid || !hub_id) break;
        this.fetchService(SERVICE.media.get_node_attr, { nid, hub_id })
          .then((attr) => {
            if (attr && attr.nid) this.updateContent(attr);
          })
          .catch(() => { });
        break;
    }
  }

  /**
   *
   * @param {*} message
   * @param {*} _ui_
   */
  warning(message, closeService = "close-dialog", buttonStyle = "") {
    if (!this.overlayWrapper || this.overlayWrapper.isDestroyed()) {
      this.append(
        Skeletons.Wrapper.Y({
          className: `${this.fig.group}__dialog-overlay`,
          name: "overlay",
        }),
      );
      this.overlayWrapper = this.children.last();
    }
    this.el.dataset.dialog = _a.open;
    this.overlayWrapper.feed(
      require("./skeleton/tooltips/warning")(
        this,
        message,
        closeService,
        buttonStyle,
      ),
    );
    this.overlayWrapper.once(_e.removeChild, () => {
      this.el.dataset.dialog = _a.closed;
    });
    return this.overlayWrapper.children.last();
  }

  /**
   * @param {*} cmd
   * @fires Wm#minimize
   */
  minimize(cmd) {
    const offset = this.$el.offset();
    let minimizeLocation = this.minimizeLocation || {};
    this.wakeUpState = {
      top: offset.top,
      left: offset.left,
      height: this.$el.height(),
      width: this.$el.width(),
      scale: 1,
      opacity: 1,
    };

    this.mset(_a.minimize, 1);
    TweenMax.fromTo(
      this.$el,
      1.5,
      {},
      {
        width: 0,
        height: 0,
        top: window.innerHeight - 200,
        left: window.innerWidth / 2 - 480,
        scale: 0,
        opacity: 0,
        ...minimizeLocation,
        ease: Expo.easeOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.minimize = 1;
          this.el.dataset.state = 0;
        },
      },
    );

    const win = Wm.__windowsLayer.children
      .toArray()
      .reverse()
      .find((win) => win.mget(_a.minimize) != 1);
    if (!_.isEmpty(win)) {
      _.delay(() => win.raise());
    }

    /**
     * Minimize event.
     * @event Wm#minimize
     * @param {*} object current window instance
     */
    Wm.$el.trigger(_e.minimize, this);
  }

  /**
   *
   * @param {*} cmd
   * @param {function} callback
   * @fires Wm#wake
   */
  wake(cmd, callback = null) {
    this.el.dataset.minimize = 0;
    this.mset(_a.minimize, 0);
    this.el.dataset.state = 1;
    this.raise();
    let fromVar = {};
    if (cmd) {
      fromVar = { ...cmd.$el.offset() };
    }

    TweenMax.fromTo(
      this.$el,
      1.5,
      {
        ...fromVar,
        immediateRender: true,
      },
      {
        ...this.wakeUpState,
        ease: Expo.easeInOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.state = 1;
          if (callback && _.isFunction(callback)) {
            callback();
          }
        },
      },
    );
    /**
     * Wake event.
     * @event Wm#wake
     * @param {*} object window instance
     */
    Wm.$el.trigger(_e.wake, this);
  }

  /**
   *
   */
  async openFileLocation(source) {
    let data;
    let media;
    let cid;
    if (source.model) {
      data = source.model.toJSON();
      media = source;
      cid = source.cid;
    } else {
      data = source;
    }
    let { nid = 0, hub_id, role, pid = 0, filetype, area } = data;
    // Notification "reveal": open the parent folder and highlight the file in
    // context (scroll + select + flash) rather than opening it in a player.
    const highlight = !!(data.highlight && `${data.highlight}` !== "0");
    let node;
    if (!filetype) {
      node = await this.fetchService(
        {
          service: SERVICE.media.attributes,
          nid,
          hub_id,
        },
        { async: 1 },
      );
      if (!node || !node.nid) {
        return Wm.alert(LOCALE.FILE_NOT_FOUND);
      }
    }
    let opt = require("window/configs/application")(filetype, {
      ...data,
      ...node,
    });

    // Deep link from a notification that targets a specific TAB of the folder
    // (task mention/assignment → Task, team chat → Chat). The generic
    // "already rendered → open-node" shortcut below cannot carry a tab: it only
    // re-focuses the node — or, when the match is the folder's CELL in an open
    // parent window, opens a second window on Files — silently dropping
    // activeTab/open_task_id. That is why these notifications only landed
    // correctly while the folder was closed. So when a tab was asked for, reuse
    // the folder's own window and switch it there; if no such window is open,
    // fall through to the normal launch path, which already carries activeTab
    // and open_task_id through `opt`.
    const wantTab = data.activeTab;

    /** Direct open from the Wm if if possible */
    let found = this._findMediaByNid(nid);
    if (wantTab && !highlight) {
      // The folder's own window — matched on hub+nid, or the already-rendered
      // node itself when that node IS a tab-capable window (a grid cell is not).
      // The second form guarantees we can never open a duplicate window for a
      // folder that is demonstrably already on screen.
      const win =
        this._findFolderWindow(hub_id, nid) ||
        (found && _.isFunction(found.showFolderTab) ? found : null);
      if (win) {
        if (win.raise) win.raise();
        // A task deep link carries the task to open; openTaskDeepLink switches
        // to the Task tab itself. Anything else just switches tab.
        if (data.open_task_id && _.isFunction(win.openTaskDeepLink)) {
          win.openTaskDeepLink(data.open_task_id);
        } else if (_.isFunction(win.showFolderTab)) {
          win.showFolderTab(wantTab);
        }
        return win;
      }
    } else if (found) {
      // Already rendered in an open window: a reveal just scrolls/flashes/
      // highlights in place; a normal open triggers the node's open action.
      if (highlight) {
        this._revealFromNotification(nid, filetype, pid);
        return;
      }
      found.triggerHandlers({ service: "open-node" });
      return;
    }

    /** Open the player if applicable. A reveal (highlight) skips the player and
     *  falls through to open the parent folder, where the file is highlighted. */
    if (opt.kind && !node && !highlight) {
      node = await this.fetchService(
        {
          service: SERVICE.media.attributes,
          nid,
          hub_id,
        },
        { async: 1 },
      );
      if (!node || !node.nid) {
        return Wm.alert(LOCALE.FILE_NOT_FOUND);
      }
      return Wm.launch({ ...opt, ...node }, { explicit: 1 });
    }

    /** Open the parent folder if not player found */
    let parent = await this.fetchService(
      {
        service: SERVICE.media.attributes,
        nid: pid,
        hub_id,
      },
      { async: 1 },
    );
    if (!parent || !parent.nid) {
      return Wm.alert(LOCALE.FILE_NOT_FOUND);
    }
    const opened = Wm.launch(
      { ...opt, ...parent, kind: "window_folder" },
      { explicit: 1 },
    );
    if (highlight) this._revealFromNotification(nid, filetype, pid);
    return opened;
  }

  /**
   * Reveal from a notification, dispatching on what the notification points at:
   *  - a file  → scroll to + flash + soft-highlight that one cell.
   *  - a folder/hub → scroll to + flash + soft-highlight the NEW files it
   *    contains (the files the notification is about). The opened window's nid
   *    matches the container itself, so there is no single file cell to reveal.
   */
  _revealFromNotification(nid, filetype, pid) {
    // The reveal always opens the PARENT folder (pid). When the notification
    // target is a distinct child of that parent (nid !== pid) — a created file
    // OR a created sub-folder — it is a single grid cell inside the opened
    // parent, so highlight that one cell (works for files and folder cells
    // alike; both extend media_core and expose _setNotifyHighlight). Only when
    // the opened window IS the target container itself (nid === pid, e.g.
    // "uploaded N files in <folder>") do we highlight the NEW files it contains.
    // Previously a folder target always took the _highlightFolderNewFiles branch,
    // so a created sub-folder (nid !== pid) matched no open window and nothing
    // was highlighted.
    const isContainer = filetype === _a.folder || filetype === _a.hub;
    const targetIsChildCell = nid && pid
      && `${nid}` !== '0' && `${pid}` !== '0' && `${nid}` !== `${pid}`;
    if (isContainer && !targetIsChildCell) {
      this._highlightFolderNewFiles(nid);
    } else {
      this._highlightNode(nid);
    }
  }

  /**
   * Soft-highlight (and scroll the eye to) a single file cell once it renders.
   * The grid renders asynchronously after Wm.launch, so poll briefly by nid.
   */
  _highlightNode(nid, tries = 24) {
    if (!nid || `${nid}` === "0") return;
    const seek = (n) => {
      const item = this._findMediaByNid(nid);
      // Only a real grid cell can be revealed — never the container window
      // (which shares the folder's nid). Cells expose _setNotifyHighlight.
      if (item && item._setNotifyHighlight) return this._applyReveal([item], true);
      if (n <= 0) return;
      setTimeout(() => seek(n - 1), 150);
    };
    seek(tries);
  }

  /**
   * Highlight every NEW (unseen-badge) file inside an opened folder/hub window,
   * and scroll the first into view. Polls until the grid cells render.
   */
  _highlightFolderNewFiles(nid, tries = 24) {
    if (!nid || `${nid}` === "0") return;
    const isFile = (c) => {
      const ft = c.mget(_a.filetype);
      return ft !== _a.folder && ft !== _a.hub;
    };
    const seek = (n) => {
      const win = this._findMediaByNid(nid);
      const cells = win && win.getItemsByKind ? win.getItemsByKind(_a.media) : [];
      // Only NEW files (not sub-folders) — the files the notification is about.
      const fresh = cells.filter(
        (c) =>
          c._setNotifyHighlight &&
          isFile(c) &&
          (parseInt(c.mget("new_file")) || 0) > 0,
      );
      if (fresh.length) return this._applyReveal(fresh, true);
      if (n <= 0) return;
      setTimeout(() => seek(n - 1), 150);
    };
    seek(tries);
  }

  /**
   * Apply the persistent soft highlight to each cell, and (for the first) scroll
   * it into view with a one-off flash. The highlight is cleared when the file is
   * opened or its window closes (media/core.js).
   */
  _applyReveal(cells, scrollFirst) {
    cells.forEach((item, i) => {
      if (!item || !item.el) return;
      try {
        if (i === 0 && scrollFirst) {
          if (item.el.scrollIntoView) {
            item.el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          item.el.classList.add("media-highlight");
          setTimeout(() => {
            if (item.el) item.el.classList.remove("media-highlight");
          }, 2400);
        }
        if (item._setNotifyHighlight) item._setNotifyHighlight(true);
      } catch (e) {
        if (this.warn) this.warn("[openFileLocation] highlight failed", e);
      }
    });
  }

  /**
   * Find an open media cell by nid, robust to string/number typing. URL/hash
   * args arrive as strings (Visitor.parseModuleArgs) while a grid cell's nid is
   * often a number from the JSON listing — getItemsByAttr uses strict ===, so a
   * single-type lookup silently misses the cell. Try both forms.
   */
  _findMediaByNid(nid) {
    const key = `${nid}`;
    const num = Number(key);
    return (
      Wm.getItemsByAttr(_a.nid, nid)[0] ||
      Wm.getItemsByAttr(_a.nid, key)[0] ||
      (key !== "" && !isNaN(num) ? Wm.getItemsByAttr(_a.nid, num)[0] : undefined)
    );
  }

  /**
   * The open `window_folder` showing exactly this folder (same hub, same nid),
   * or null. Lets a notification deep link reuse the window the user already
   * has open — raising it and switching its tab — instead of stacking a second
   * window on the same folder. Shared by the tab deep link in openFileLocation
   * and the activity panel's meeting-row handler.
   */
  _findFolderWindow(hub_id, nid) {
    if (typeof Wm === "undefined" || !_.isFunction(Wm.getItemsByKind)) return null;
    try {
      const open = Wm.getItemsByKind("window_folder") || [];
      return (
        open.find(
          (w) =>
            w &&
            !(w.isDestroyed && w.isDestroyed()) &&
            w.mget(_a.hub_id) == hub_id &&
            `${w.mget(_a.nid)}` === `${nid}`,
        ) || null
      );
    } catch (e) {
      if (this.warn) this.warn("[_findFolderWindow] lookup failed", e);
      return null;
    }
  }

  /**
   *
   * @param {*} d
   */
  scrollToBottom(d) {
    this.__list && this.__list.scrollToBottom(d);
  }

  /**
   *
   * @param {*} x
   * @param {*} y
   */
  scrollTo(x, y) {
    this.__list && this.__list.scrollTo(x, y);
  }

  /**
   *
   */
  scrollHeight() {
    if (this.__list) return this.__list.scrollHeight();
  }

  /**
   *
   */
  scrollTop() {
    if (this.__list) return this.__list.scrollTop();
  }

  /**
   *
   */
  contentRectangle() {
    let r = this.__list || this;
    return new Rectangle(
      r.$el.offset().left,
      r.$el.offset().top,
      r.$el.width(),
      r.$el.height(),
    );
  }

  /**
   *
   */
  setContainment() {
    const w = this.$el.outerWidth();
    const h = this.$el.outerHeight();
    // Keep the draggable handle visible inside the workspace. Requiring the
    // full window to stay inside leaves tall editors with almost no Y range.
    // In a DMZ/secure-share session window.Wm is the constrained share panel
    // (.dmz-wm), so containing a file viewer to it pins it — recipients couldn't
    // move it freely (j12). Contain to the viewport instead. uiRouter.isDmz() is
    // the boot-area check (dmz|share) → false on the desk, so the non-DMZ branch
    // is byte-identical to before.
    const _dmz =
      window.uiRouter &&
      typeof window.uiRouter.isDmz === "function" &&
      window.uiRouter.isDmz();
    const $wm = _dmz ? null : Wm.$el;
    const offset = _dmz ? { left: 0, top: 0 } : $wm.offset();
    const wmW = _dmz ? window.innerWidth : $wm.outerWidth();
    const wmH = _dmz ? window.innerHeight : $wm.outerHeight();
    const minVisibleWidth = Math.min(w, Math.max(150, this.topbarHeight));
    const minVisibleHeight = Math.min(h, this.topbarHeight);
    const left = offset.left;
    const top = offset.top;
    const right = offset.left + wmW - minVisibleWidth;
    const bottom = offset.top + wmH - minVisibleHeight;
    const containment = [
      Math.min(left, right),
      Math.min(top, bottom),
      Math.max(left, right),
      Math.max(top, bottom),
    ];
    this.$el.draggable("option", { containment });
  }

  /**
   *
   * @param {*} pos
   */
  anti_overlap(pos) {
    let last_y = 0;
    let last_x = 0;
    let changed = false;
    for (var c of this.parent.children.toArray()) {
      last_y = c.$el.position().top;
      last_x = c.$el.position().left;
      if (c != this) {
        if (last_y == pos.top) {
          pos.top = last_y + 20;
          changed = true;
        }
        if (last_x == pos.left) {
          pos.left = last_x + 20;
          changed = true;
        }
      }
    }
    return changed;
  }

  /**
   *
   * @param {*} ui
   */
  constrainResize(e, ui) {
    if (!e) return false;

    if (e.pageX < 0) {
      ui.size.width = this._lastWidth;
      ui.position.left = 0;
      return true;
    }
    if (e.pageY < 0) {
      ui.size.height = this._lastHeight;
      ui.position.top = 0;
      return true;
    }
    this._lastHeight = ui.size.height;
    this._lastWidth = ui.size.width;
  }

  // ===========================================================
  //
  // ===========================================================
  _resizeStart(e, ui) {
    this.$el.resizable(
      _a.option,
      "maxWidth",
      ui.size.width + window.innerWidth - e.pageX,
    );
    this.$el.resizable(
      _a.option,
      "maxHeight",
      ui.size.height + window.innerHeight - e.pageY,
    );
    this._lastHeight = ui.size.height;
    this._lastWidth = ui.size.width;
    //this._minY = -Wm.$el.offset().top;
  }

  /**
   *
   * @param {*} data
   */
  addSyncedMadia(data) {
    if (!this.__list) return;
    for (var c of this.getItemsByAttr(_a.nid, data.nid)) {
      if (!c.isDestroyed()) return;
    }
    if (this._synced[data.nid]) return;
    if (data.parent_id === this.mget(_a.nid)) {
      data.kind = this._getKind();
      data.phase = _a.local;
      this._synced[data.nid] = 1;
      this.__list.collection.once(_e.add, () => {
        delete this._synced[data.nid];
      });
      if (data.position > 0) {
        this.__list.collection.add(data, { at: data.position });
      } else if (data.position == -1) {
        this.__list.prepend(data);
      } else {
        this.__list.append(data);
      }
    }
  }

  /**
   * @param {String} service
   * @param {Object} data
   * @param {Object}
   */
  __onLiveUpdate(service, data, options = {}) {
    switch (options.service) {
      case "user.poke":
        if (data.kind && data.sender) {
          Visitor.playSound(_K.notifications.drip, 0);
          let launch = () => {
            this.launch(data, { explicit: 1 });
          };
          Wm.confirm({
            title: data.name.printf(LOCALE.VIDEO_CONFERENCE),
            message: data.sender.printf(LOCALE.X_INVITE_YOU_MEETING),
            confirm: LOCALE.JOIN_MEETING,
            confirm_type: "primary",
            cancel: LOCALE.SKIP,
            cancel_type: "secondary",
            buttonClass: "intro-popup",
            cancel_action: _e.close,
            mode: "hbf",
          })
            .then(launch)
            .catch(noOperation);
        }
        break;
      default:
        this.warn(`WWW:520 ${service} not found.`, data, options);
    }
  }

  /**
   *
   */
  getViewMode() {
    this.viewMode = ViewMode.get(this.cid) || ViewMode.get(DEFAULT);
    return this.viewMode;
  }

  /**
   *
   */
  setViewMode(mode = _a.icon) {
    ViewMode.set(this.cid, mode);
    ViewMode.set(DEFAULT, mode);
    this.viewMode = mode;
  }
}

module.exports = __window_mfs;
