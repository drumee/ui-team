
const EOD = "end:of:data";
const OPEN_NODE = "open-node";
const WS_EVENT = "ws:event";

const Rectangle = require('rectangle-node');
const { TimelineMax, Expo } = require("@drumee/ui-core/vendor");

const ViewMode = new Map();
const DEFAULT = 'default';
ViewMode.set(DEFAULT, _a.icon);

/**
 * Sync `md5Hash` into a view's existing `metadata` blob without
 * dropping any other fields it already had (dataType, geometry, etc.).
 * Used after a rotate/replace WS broadcast so cache-bust URLs reflect
 * the new content — see `updateContent` for the full reasoning.
 */
function __mergeMd5IntoMetadata(view, md5Hash) {
  if (!view || !md5Hash || typeof view.mget !== 'function') return;
  let md = view.mget(_a.metadata);
  let wasString = false;
  if (md == null) {
    md = {};
  } else if (typeof md === 'string') {
    wasString = true;
    try { md = JSON.parse(md); } catch (e) { md = {}; }
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
    this.handleWsEvent = this.handleWsEvent.bind(this)
  }

  initialize(opt) {
    this._watchdog(opt);
    super.initialize(opt);
    this.topbarHeight = this.configs().topbarHeight;
    this._synced = {};
    this.mset({ echoId: Visitor.get(_a.socket_id) + this.cid })
    this.setViewMode(ViewMode.get(DEFAULT) || _a.icon);
    this.updateBreadcrumb(opt, this)
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
    if (m.mget(_a.filetype) == _a.hub && m.mget(_a.actual_home_id)) {
      this.mset({ nid: m.mget(_a.actual_home_id) })
    }
    this.parentFolder = m.logicalParent || m.mget('logicalParent');
    if (this._responsive) RADIO_BROADCAST.on(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.on(_e.keyup, this._kbHandler);
    this.onVisibilityChange = this.onVisibilityChange.bind(this)
    this._checkChangelog = this._checkChangelog.bind(this)
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
    if ((now - prev) <= 5000) {
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
    if (this.mget(_a.kind) == 'window_meeting') return;

    let pid = this.getCurrentNid();
    let cur_hub_id = this.mget(_a.hub_id);
    let nid = pid;
    if (this.mget(_a.filepath) == '/') {
      nid = this.mget(_a.home_id)
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
          return
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
          })
          changed = changed + s.length;
        }
        if (_.isArray(dest)) {
          let s = dest.filter((e) => {
            if (e.parent_id != pid) return false;
          })
          changed = changed + s.length;
        }
        if (src.hub_id && src.hub_id != cur_hub_id) return false;
        if (dest.hub_id && dest.hub_id != cur_hub_id) return false;
        if (src.parent_id == pid) return true;
        if (dest.parent_id == pid) return true;
        return false;
      })
      this._changelog_id = data[0].id + 1;
      changed = changed + rows.length;
      if (changed && this.loadContent) {
        this.loadContent()
      }
    })

  }

  /**
   * 
   * @returns 
   */
  onBeforeDestroy(opt) {
    if (this._responsive) RADIO_BROADCAST.off(_e.responsive, this._responsive);
    if (this._kbHandler) RADIO_KBD.off(_e.keyup, this._kbHandler);
    Wm.off(WS_EVENT, this.handleWsEvent)
    if (this._partitionObserver || this._partitionDebounce || this._partitionRetryTimer || this._partitionSettleTimer) {
      this._cleanupPartition();
    }
    if (super.onBeforeDestroy) {
      super.onBeforeDestroy(opt)
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
    })
    this._watchdogTimer = setTimeout(() => {
      this.warn("Got watchdog timeout", this)
      this.suppress();
    }, 10000)
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
            if ((y + this.style.get(_a.height)) > window.innerHeight) {
              y = last_y - this.topbarHeight;
            }
            this.style.set({
              top: y
            });
          }
          if (last_x == this.style.get(_a.left)) {
            let x = last_x + this.topbarHeight;
            if ((x + this.style.get(_a.width)) > window.innerWidth) {
              x = last_x - this.topbarHeight;
            }
            this.style.set({
              left: x
            });
          }
        }
      }
    } else {
      this.style.set({ top: 0, left: 0 });
    }
    Wm.on(WS_EVENT, this.handleWsEvent)
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
    // surfaces (share, search, meeting) keep flat list. Folder window
    // bypasses buildIconsList entirely via buildContent override.
    const usesPartition = this.isWm === 1;
    if (usesPartition) {
      child.el.style.visibility = 'hidden';
      const scrollEl = child.el.querySelector('.smart-container');
      if (scrollEl) scrollEl.style.visibility = 'hidden';
      this._partitionListPart = child;
      this._setupPartitionObserver(child);
    }

    child.once(EOD, () => {
      if (timer) clearTimeout(timer);
      child.el.dataset.wait = 0;
      child.$el.removeClass('drumee-sprinner');
      if (usesPartition) {
        this._partitionFoldersAndFiles(child);
        this._applyFolderScrollMode(child);
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
      this._partitionListPart.el.style.visibility = 'visible';
      const sc = this._partitionListPart.el.querySelector('.smart-container');
      if (sc) {
        sc.style.visibility = 'visible';
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
        listPart.el.style.visibility = 'visible';
        const sc = listPart.el.querySelector('.smart-container');
        if (sc) {
          sc.style.visibility = 'visible';
          sc.dataset.partitioning = 0;
        }
      }
    }, 500);
  }

  _applyFolderScrollMode(listPart) {
    const scrollEl = listPart?.el?.querySelector('.smart-container');
    const folderWrap = scrollEl?.querySelector('.folder-section');
    if (!folderWrap || !folderWrap.children.length) return;
    folderWrap.style.gridTemplateColumns = '';
    folderWrap.style.gridTemplateRows = '';
    const count = folderWrap.children.length;
    const fs = getComputedStyle(folderWrap);
    const gap = parseInt(fs.gap) || 24;
    const padLR = parseInt(fs.paddingLeft || 0) + parseInt(fs.paddingRight || 0);
    const cellW = parseInt(fs.gridTemplateColumns?.split(' ')[0]) || 120;
    const rowH = fs.gridAutoRows || '140px';
    const availW = scrollEl.clientWidth - padLR;
    const maxCols = Math.max(1, Math.floor((availW + gap) / (cellW + gap)));
    if (count > maxCols * 2) {
      const cols = Math.ceil(count / 2);
      folderWrap.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
      folderWrap.style.gridTemplateRows = `repeat(2, ${rowH})`;
    }
  }

  _prepareListPartition(listPart) {
    this._partitionListPart = null;
    this._cleanupPartition();
    this._partitionListPart = listPart;
    listPart.el.style.visibility = 'hidden';
    const scrollEl = listPart.el.querySelector('.smart-container');
    if (scrollEl) {
      scrollEl.dataset.partitioning = 1;
      scrollEl.style.visibility = 'hidden';
    }
    if (scrollEl) {
      // 3-tier partition: workspace (hubs) → folder → file
      const ww = scrollEl.querySelector('.workspace-section');
      const fw = scrollEl.querySelector('.folder-section');
      const flw = scrollEl.querySelector('.file-section');
      if (ww) ww.remove();
      if (fw) fw.remove();
      if (flw) flw.remove();
    }
    this._setupPartitionObserver(listPart);
    this._partitionFoldersAndFiles(listPart);
    listPart.once(EOD, () => {
      listPart.el.dataset.wait = 0;
      listPart.$el.removeClass('drumee-sprinner');
      this._partitionFoldersAndFiles(listPart);
      this._applyFolderScrollMode(listPart);
      this.syncContent(EOD);
      this._dataReady = true;
      this.trigger(EOD);
    });
  }

  _setupPartitionObserver(listPart) {
    if (this._partitionObserver) {
      this._partitionObserver.disconnect();
    }
    if (this._partitionDebounce) {
      cancelAnimationFrame(this._partitionDebounce);
    }
    this._partitionObserver = new MutationObserver(() => {
      const scrollEl = listPart.el.querySelector('.smart-container');
      if (scrollEl?.querySelector(':scope > .media-grid__ui')) {
        scrollEl.dataset.partitioning = 1;
      }
      // requestAnimationFrame instead of setTimeout(100): rAF fires BEFORE
      // the next paint, so the new direct-child item is partitioned into
      // its section in the same frame the mutation landed. The user never
      // sees the brief "hidden direct child" intermediate state — no flash
      // when uploading or pasting files.
      if (this._partitionDebounce) cancelAnimationFrame(this._partitionDebounce);
      this._partitionDebounce = requestAnimationFrame(() => {
        this._partitionDebounce = null;
        if (this._partitionObserver) {
          this._partitionObserver.disconnect();
        }
        const done = this._doPartition(listPart);
        if (this._partitionObserver) {
          this._partitionObserver.observe(listPart.el, { attributes: true, attributeFilter: ["data-filetype"], childList: true, subtree: true });
        }
        if (done) {
          if (this._partitionRetryTimer) {
            clearTimeout(this._partitionRetryTimer);
            this._partitionRetryTimer = null;
          }
          this._schedulePartitionCleanup(listPart);
        } else if (this._partitionObserver) {
          this._partitionObserver.observe(listPart.el, { childList: true, subtree: true });
        }
      });
    });
    this._partitionObserver.observe(listPart.el, { attributes: true, attributeFilter: ["data-filetype"], childList: true, subtree: true });
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
    listPart.el.style.visibility = 'visible';
    const scrollEl = listPart.el.querySelector('.smart-container');
    if (scrollEl) {
      scrollEl.style.visibility = 'visible';
      scrollEl.dataset.partitioning = 0;
    }
  }

  _doPartition(listPart) {
    const scrollEl = listPart.el.querySelector('.smart-container');
    if (!scrollEl) return false;

    // 3-tier order top → bottom: workspaces (hubs) → folders → files
    let workspaceWrap = scrollEl.querySelector('.workspace-section');
    let folderWrap = scrollEl.querySelector('.folder-section');
    let fileWrap = scrollEl.querySelector('.file-section');

    const items = [...scrollEl.children].filter(
      (el) => el !== workspaceWrap && el !== folderWrap && el !== fileWrap && el.dataset?.filetype
    );

    if (!items.length) {
      if (workspaceWrap || folderWrap || fileWrap) {
        scrollEl.style.visibility = 'visible';
        scrollEl.dataset.partitioning = 0;
        listPart.el.style.visibility = 'visible';
        return true;
      }
      return false;
    }

    // Append in stack order so DOM matches visual order (workspace top, file bottom).
    if (!workspaceWrap) {
      workspaceWrap = document.createElement('div');
      workspaceWrap.className = 'workspace-section';
      scrollEl.appendChild(workspaceWrap);
    }
    if (!folderWrap) {
      folderWrap = document.createElement('div');
      folderWrap.className = 'folder-section';
      scrollEl.appendChild(folderWrap);
    }
    if (!fileWrap) {
      fileWrap = document.createElement('div');
      fileWrap.className = 'file-section';
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

    scrollEl.style.display = 'flex';
    scrollEl.style.flexDirection = 'column';
    scrollEl.style.alignItems = 'stretch';
    scrollEl.style.justifyContent = 'flex-start';
    scrollEl.style.visibility = 'visible';
    scrollEl.dataset.partitioning = 0;

    this._applyFolderScrollMode(listPart);
    this._partitionListPart = null;
    listPart.el.style.visibility = 'visible';
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
        height: window.innerHeight
      }
    }
    return {
      top: 20,
      left: 10,
      width: window.innerWidth - 250, // sidebar width
      height: window.innerHeight - 90
    }
  }


  /**
   * 
   */
  acknowledge(msg = LOCALE.ACK_COPY_LINK) {
    var c = require('@drumee/ui-core/letc/preset/ack')(this, msg);
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
    this.updateInnerHubsPreview(data)
    if (echoId == this.mget('echoId')) {
      return;
    }
    if (this.mget(_a.nid) != pid) return;
    let child = this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(data);
      if (c.restart) {
        setTimeout(() => { c.restart() }, 500);
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
        this.removeContent(item)
      }
      return;
    }
    this.updateInnerHubsPreview(args)
    let { nid, hub_id, filepath } = args;
    /** Remove children */
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c || c.mget(_a.pid) != this.getCurrentNid()) return false;
      c.goodbye();
    });

    /** Remove self */
    let re = new RegExp('^' + filepath);
    let path = this.mget(_a.filepath)
    if (this.mget(_a.hub_id) == hub_id && re.test(path) && path != '/') {
      this.goodbye()
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
      this.mset(dest)
      this.update_name(_a.filename, filename)
    }
    this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      if (c.afterRename) c.afterRename(data);
    });
    if (dest.filetype == _a.hub) {
      this.updateSettings({ ...dest, fieldName: _a.filename })
    }
  }

  /**
   *
   */
  updateContent(args) {
    let { nid } = args;
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
        this.__refWindowName.set({ content: args.name })
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
      let src_path = new RegExp(`^${c.mget(_a.filepath)}/`)
      if (src && src_path.test(src.filepath)) {
        if (!this._pendingUpdates[c.cid]) c.updateInnerNodes()
        this._pendingUpdates[c.cid] = 1;
      }
      if (dest && src_path.test(dest.filepath)) {
        if (!this._pendingUpdates[c.cid]) c.updateInnerNodes()
        this._pendingUpdates[c.cid] = 1;
      }
    })
  }

  /**
    *
    */
  moveContent(src, dest) {
    let { nid, echoId } = src;
    this.updateInnerHubsPreview(src, dest)
    if (echoId == this.mget('echoId')) {
      return;
    }
    let pid = this.getCurrentNid();
    if (![src.pid, dest.pid].includes(pid)) return
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
    let { echoId, service } = options
    let { src, dest } = data.args || {};
    this._pendingUpdates = {}
    switch (service) {
      case SERVICE.media.rename:
        this.renameContent(data)
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
        this.downloadContent(data)
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
      this.append(Skeletons.Wrapper.Y({
        className: `${this.fig.group}__dialog-overlay`,
        name: "overlay"
      })
      );
      this.overlayWrapper = this.children.last();
    }
    this.el.dataset.dialog = _a.open;
    this.overlayWrapper.feed(require('./skeleton/tooltips/warning')(this, message, closeService, buttonStyle));
    this.overlayWrapper.once(_e.removeChild, () => {
      this.el.dataset.dialog = _a.closed;
    })
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
    }

    this.mset(_a.minimize, 1);
    TweenMax.fromTo(this.$el, 1.5, {},
      {
        width: 0,
        height: 0,
        top: window.innerHeight - 200,
        left: (window.innerWidth / 2) - 480,
        scale: 0,
        opacity: 0,
        ...minimizeLocation,
        ease: Expo.easeOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.minimize = 1;
          this.el.dataset.state = 0;
        }
      }
    );


    const win = Wm.__windowsLayer.children.toArray()
      .reverse()
      .find(win => (win.mget(_a.minimize) != 1))
    if (!_.isEmpty(win)) {
      _.delay(() => win.raise());
    }


    /**
     * Minimize event.
     * @event Wm#minimize
     * @param {*} object current window instance 
     */
    Wm.$el.trigger(_e.minimize, this)
  }

  /**
   * 
   * @param {*} cmd
   * @param {function} callback
   * @fires Wm#wake
   */
  wake(cmd, callback = null) {
    this.el.dataset.minimize = 0;
    this.mset(_a.minimize, 0)
    this.el.dataset.state = 1;
    this.raise();
    let fromVar = {}
    if (cmd) {
      fromVar = { ...cmd.$el.offset() }
    }

    TweenMax.fromTo(this.$el, 1.5,
      {
        ...fromVar,
        immediateRender: true
      },
      {
        ...this.wakeUpState,
        ease: Expo.easeInOut, //Expo.easeIn,
        onComplete: () => {
          this.el.dataset.state = 1;
          if (callback && _.isFunction(callback)) {
            callback()
          }
        }
      }
    );
    /**
     * Wake event.
     * @event Wm#wake
     * @param {*} object window instance 
     */
    Wm.$el.trigger(_e.wake, this)
  }

  /**
   *
  */
  async openFileLocation(source) {
    let data;
    let media;
    let cid;
    if (source.model) {
      data = source.model.toJSON()
      media = source;
      cid = source.cid;
    } else {
      data = source;
    }
    let { nid, hub_id, role, pid, filetype, area } = data;
    let node;
    if (!filetype) {
      node = await this.fetchService({
        service: SERVICE.media.attributes,
        nid,
        hub_id,
      }, { async: 1 });
      if (!node || !node.nid) {
        return Wm.alert(LOCALE.FILE_NOT_FOUND)
      }
    }
    let opt = require('window/configs/application')(filetype, { ...data, ...node })

    /** Direct open from the Wm if if possible */
    let found = Wm.getItemsByAttr(_a.nid, nid)[0]
    if (found) {
      found.triggerHandlers({ service: "open-node" })
      return
    }

    /** Open the player if applicable */
    if (opt.kind && !node) {
      node = await this.fetchService({
        service: SERVICE.media.attributes,
        nid,
        hub_id,
      }, { async: 1 });
      if (!node || !node.nid) {
        return Wm.alert(LOCALE.FILE_NOT_FOUND)
      }
      return Wm.launch({ ...opt, ...node }, { explicit: 1 });
    }

    /** Open the parent folder if not player found */
    let parent = await this.fetchService({
      service: SERVICE.media.attributes,
      nid: pid,
      hub_id,
    }, { async: 1 });
    if (!parent || !parent.nid) {
      return Wm.alert(LOCALE.FILE_NOT_FOUND)
    }
    return Wm.launch({ ...opt, ...parent, kind: "window_folder" }, { explicit: 1 });

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
      r.$el.height()
    );
  }

  /**
 * 
 */
  setContainment() {
    const w = this.$el.outerWidth();
    const h = this.$el.outerHeight();
    // Clamp to the workspace rect (.window-manager__ui) in page coords so
    // the dragged window can never leave the desk body on any side.
    // jQuery UI's array containment constrains the element's TOP-LEFT
    // corner, so subtract the window's own size from the bottom/right
    // bounds to keep its bottom-right corner inside the workspace.
    const $wm = Wm.$el;
    const offset = $wm.offset();
    const wmW = $wm.outerWidth();
    const wmH = $wm.outerHeight();
    const containment = [
      offset.left,
      offset.top,
      offset.left + wmW - w,
      offset.top + wmH - h,
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
    this.$el.resizable(_a.option, "maxWidth", ui.size.width + window.innerWidth - e.pageX);
    this.$el.resizable(_a.option, "maxHeight", ui.size.height + window.innerHeight - e.pageY);
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
      this.__list.collection.once(_e.add, () => { delete this._synced[data.nid] });
      if (data.position > 0) {
        this.__list.collection.add(data, { at: data.position })
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
      case 'user.poke':
        if (data.kind && data.sender) {
          Visitor.playSound(_K.notifications.drip, 0);
          let launch = () => {
            this.launch(data, { explicit: 1 })
          }
          Wm.confirm({
            title: data.name.printf(LOCALE.VIDEO_CONFERENCE),
            message: data.sender.printf(LOCALE.X_INVITE_YOU_MEETING),
            confirm: LOCALE.JOIN_MEETING,
            confirm_type: 'primary',
            cancel: LOCALE.SKIP,
            cancel_type: 'secondary',
            buttonClass: 'intro-popup',
            cancel_action: _e.close,
            mode: 'hbf'
          }).then(launch).catch(noOperation);
        }
        break;
      default:
        this.warn(`WWW:520 ${service} not found.`, data, options)
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
    ViewMode.set(this.cid, mode)
    ViewMode.set(DEFAULT, mode)
    this.viewMode = mode;
  }



}

module.exports = __window_mfs;
