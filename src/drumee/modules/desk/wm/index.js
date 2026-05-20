
require("./skin");
const { copyToClipboard } = require("@drumee/ui-essentials")
const { TweenLite, TimelineMax } = require("@drumee/ui-core/vendor");
let lastClickTime = new Date().getTime();
const push = require("./push");

class __window_manager extends push {
  constructor(...args) {
    super(...args);
    this.load = this.load.bind(this);
    this.clearShift = this.clearShift.bind(this);
    this.xorSelect = this.xorSelect.bind(this);
    this.resetSearch = this.resetSearch.bind(this);
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    this.isWm = 1;
    super.initialize(opt);
    this.__skel = require("./skeleton");
    _K.docViewer.width = Math.min(_K.docViewer.width, window.innerWidth - 5);
    _K.docViewer.height = Math.min(_K.docViewer.height, window.innerHeight);
    let exportMenu = [];
    if (Visitor.canServerImpExp()) {
      exportMenu = [_a.separator, _a.import];
    }
    this.contextmenuItems = [
      _a.newFolder,
      _a.paste,
      _a.upload,
      _a.separator,
      _a.preferences,
    ];
    this._handelKbdEvents = this._handelKbdEvents.bind(this);
    RADIO_KBD.on(_e.keyup, this._handelKbdEvents)
  }

  /**
   *
   */
  // updateContextMenuItems() {
  //   if (document.fullscreenElement != null) {
  //     this.contextmenuItems.splice(3, 1, _a.fullscreen);
  //   } else {
  //     this.contextmenuItems.splice(3, 1, _a.exitFullScreen);
  //   }
  //   return;
  // }

  /**
   *
   */
  openSharedLink(opt) {
    const fileTypes = [_a.audio, _a.video, _a.image, _a.video, _a.document];
    // setTimeout(() => {
    //   Backbone.history.navigate(_K.module.desk);
    // }, 1000);
    if (opt.kind == _a.media || fileTypes.includes(opt.filetype)) {
      return this.fetchMediaAttributes(opt);
    }
    if (opt.filetype == _a.hub || opt.filetype == _a.folder) {
      return this.checkPrivilegeForHub(opt);
    }
    if (opt.kind) {
      this.launch(opt, { explicit: 1 });
    }
  }

  /**
   * 
   */
  changeModalState(s) {
    this.ensurePart('wrapper-modal').then((p) => {
      p.el.dataset.state = s
    })
  }

  /**
   *
   * @param {*} l
   * @returns
   */
  route(l) {
    let args = Visitor.parseModuleArgs() || {};
    this.debug("AAA:89", args)
    if (args.hasOwnProperty('meeting') && args.nid) {
      let media = this.getItemsByAttr(_a.nid, args.nid)[0]
      this.debug("AAA:89", media)
      if (media && media.triggerHandlers) {
        media.triggerHandlers({ service: "open-node", start_meeting: 1 })
        return
      }
    }
    const loc = JSON.parse(localStorage.getItem("locationOnStart")); //"locationOnStart";
    this.debug("locationOnStart", loc)
    if (loc) {
      let { hash } = loc;
      if (hash) {
        const savedPath = Visitor.parseModule(hash);
        const savedArgs = Visitor.parseModuleArgs(hash);
        this.openSharedLink(savedArgs);
      }
    }
    // Direct folder URL deep link: #@desk/folder?hub_id=HUB_ID[&nid=NID]
    const pathArgs = Visitor.parseModule();
    if (pathArgs[1] === 'folder') {
      const params = Visitor.parseModuleArgs();
      if (params.hub_id) {
        Kind.waitFor('window_folder').then(() => {
          this.launch({ kind: 'window_folder', hub_id: params.hub_id, nid: params.nid }, { explicit: 1 });
        });
      }
    }
  }

  /**
   * 
   */
  openAccountSettings() {
    this.ensurePart("wrapper-modal").then((p) => {
      p.feed({ kind: "settings_account" })
    })
  }

  openCreateFolderDialog() {
    this.ensurePart("wrapper-modal").then((p) => {
      p.feed(require("builtins/window/folder/skeleton/create-folder-dialog")(this));
      p.el.dataset.mode = "create-folder";
    });
    this.ensurePart("create-folder-name").then((entry) => entry.focus && entry.focus());
  }

  closeCreateFolderDialog() {
    this._pendingFolderArea = null;
    return this.ensurePart("wrapper-modal").then((p) => {
      p.el.dataset.mode = "";
      p.clear();
    });
  }

  createFolderFromDialog(cmd) {
    if (this._creatingFolder) return;
    this._creatingFolder = 1;
    const entry = this.getPart("create-folder-name");
    const value = (cmd.getValue && cmd.getValue()) || (entry && entry.getValue && entry.getValue()) || LOCALE.NEW_FOLDER;
    const filename = String(value).trim() || LOCALE.NEW_FOLDER;
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) {
      this._creatingFolder = 0;
      return this.alert(LOCALE.INVALID_FILENAME);
    }

    // "Private folder" (Add-new menu) → create a private hub via
    // desk.create_hub. media.make_dir cannot create a top-level private
    // directory; _pendingFolderArea is set by the add-private-folder handler.
    if (this._pendingFolderArea === _a.private) {
      this._pendingFolderArea = null;
      return this.postService(SERVICE.desk.create_hub, {
        area: _a.private,
        filename,
        hub_id: Visitor.id,
        pid: Visitor.id,
      }).then((res) => {
        const hub = Array.isArray(res) ? res[0] : res;
        if (hub && (hub.error || hub.error_code)) {
          return this.alert(LOCALE[hub.error] || hub.reason || hub.error);
        }
        this.closeCreateFolderDialog();
        RADIO_BROADCAST.trigger("workspace:refresh");
      }).catch((e) => {
        this.warn("Failed to create private folder", e);
        this.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
      }).finally(() => {
        this._creatingFolder = 0;
      });
    }

    const onHome = !this._curWorkspace;
    const hub_id = onHome ? Visitor.id : this._curWorkspace.hub_id;
    const nid = onHome ? Visitor.get(_a.home_id) : this._curWorkspace.nid;
    const area = onHome ? _a.personal : this._curWorkspace.area;
    if (!nid) {
      this._creatingFolder = 0;
      return this.alert(LOCALE.TRY_AGAIN);
    }
    return this.postService(SERVICE.media.make_dir, {
      hub_id,
      dirname: filename,
      filename,
      nid,
      notify: 1,
      socket_id: Visitor.get(_a.socket_id),
      seeding: 1,
      echoId: this.mget('echoId'),
      area,
    }).then((data) => {
      if (data && data.error) {
        return this.alert(LOCALE[data.error] || data.error);
      }
      this.closeCreateFolderDialog();
      this.ensurePart(_a.list).then((list) => {
        if (!list || (list.isDestroyed && list.isDestroyed()) || !data) return;
        const curHubId = this._curWorkspace ? this._curWorkspace.hub_id : Visitor.id;
        const curNid = this._curWorkspace ? this._curWorkspace.nid : Visitor.get(_a.home_id);
        if (curHubId != hub_id || curNid != nid) return;
        if (data.pid && data.pid != nid) return;
        data.kind = this._getKind();
        data.service = "open-node";
        data.uiHandler = [this];
        if (data.position >= 0) list.append(data, data.position);
        else list.append(data);
        if (this.getViewMode && this.getViewMode() !== _a.row) {
          this._partitionFoldersAndFiles(list);
        }
      });
    }).catch((e) => {
      this.warn("Failed to create folder", e);
      this.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
    }).finally(() => {
      this._creatingFolder = 0;
    });
  }

  /**
   * Switch the main grid to show the contents of `workspace` (a hub).
   * Accepts any of actual_home_id / home_id / nid / id as the root
   * directory id; falls back to hub.get_attributes when none is set.
   */
  loadWorkspace(workspace) {
    const data = workspace.model ? workspace.model.toJSON() : (workspace || {});
    const hub_id = data.hub_id || data.id;
    let nid = data.actual_home_id || data.home_id || data.nid;

    if (!hub_id) {
      this.warn("loadWorkspace: missing hub_id", data);
      return;
    }

    if (this._curWorkspace
      && this._curWorkspace.hub_id == hub_id
      && this._curWorkspace.nid == nid) {
      return;
    }

    // Close any settings/admin/apps panel that would occlude the workspace
    // grid. Sidebar workspace items dispatch directly to Wm.loadWorkspace
    // (not through desk.onUiEvent), so cleanup must live here too.
    if (window.Desk && _.isFunction(window.Desk._closeMainPanels)) {
      window.Desk._closeMainPanels();
    }

    // Set the context synchronously with whatever we have. The sidebar's
    // desk.home payload only carries hub_id (no actual_home_id), so the
    // nid often arrives later via the get_attributes fetch below.
    this._wsGeneration = (this._wsGeneration || 0) + 1;
    const gen = this._wsGeneration;

    const apply = (resolvedNid) => {
      if (gen !== this._wsGeneration) return;
      this._curWorkspace = { hub_id, nid: resolvedNid, area: data.area };
      // ownpath '/' for a workspace root — needed so drag-drop uploads here
      // resolve to the workspace top, not a stale subfolder path inherited
      // from a previous navigation. _getDestination reads ownpath from the
      // logical parent (this) when building the upload destpath.
      // home_id mirrors the workspace root nid so cross-window drops from a
      // folder window into Wm classify as MOVE (not COPY) in makeOptions —
      // see window/interact/index.js:808 (item.actual_home_id === home_id).
      this.mset({ hub_id, nid: resolvedNid, nodeId: resolvedNid, area: data.area, ownpath: '/', home_id: resolvedNid });
      this.ensurePart(_a.list).then((l) => {
        l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid: resolvedNid });
        if (l.collection) l.collection.reset();
        // Hide the list while partitioning, then restart and let the
        // partition prep logic (added in v2) drive the visibility flip
        // on EOD.
        l.el.style.visibility = 'hidden';
        const scrollEl = l.el.querySelector('.smart-container');
        if (scrollEl) {
          scrollEl.dataset.partitioning = 1;
          scrollEl.style.visibility = 'hidden';
        }
        l.restart();
        this._prepareListPartition(l);
      });
      this.ensurePart("wrapper-modal").then((p) => p.clear());
      // Sidebar nav reloads the desk container in-place; preserve any
      // already-open folder windows per breadcrumb spec.
      this.updateBreadcrumb({ ...data, hub_id, nid: resolvedNid, service: "change-workspace" }, this);
    };

    // nid often arrives later via the get_attributes fetch below. The
    // topbar's "+ Add new" check only needs hub_id to flip to folder
    // creation mode — nid can fill in asynchronously.
    this._curWorkspace = { hub_id, nid, area: data.area };
    this.mset({ hub_id, nid, nodeId: nid, area: data.area, ownpath: '/', home_id: nid });

    if (nid) {
      apply(nid);
      return;
    }

    // Fall back to fetching the hub's attributes to get its root nid.
    this.fetchService(SERVICE.hub.get_attributes, { hub_id }).then((attrs) => {
      const resolved = attrs && (attrs.actual_home_id || attrs.home_id || attrs.nid);
      if (!resolved) {
        this.warn("loadWorkspace: cannot resolve workspace root", { hub_id, attrs });
        return;
      }
      try { workspace.model && workspace.model.set(attrs); } catch (e) { }
      apply(resolved);
    }).catch((e) => this.warn("loadWorkspace: get_attributes failed", e));
  }

  /**
   * Navigate into a child node (folder/file) within a workspace.
   * Used by `load-folder` UI events from the sidebar subtree.
   */
  loadWorkspaceNode(node) {
    const data = node.model ? node.model.toJSON() : (node || {});
    const hub_id = data.hub_id || data.id;
    const isWorkspace = data.nodeRole === "workspace";
    const nid = isWorkspace
      ? data.actual_home_id || data.home_id || data.nid
      : data.nid || data.actual_home_id || data.home_id;
    // Workspace root → '/'; folder → its own ownpath/filepath as reported by
    // show_node_by. Without this, uploads dropped here inherit a stale path
    // and the server stores them at the previous parent.
    const ownpath = isWorkspace ? '/' : (data.ownpath || data.filepath || '/');
    // home_id stays at the workspace root nid even when navigating into a
    // subfolder, so cross-window drops keep classifying as MOVE.
    const home_id = isWorkspace
      ? nid
      : (data.actual_home_id || data.home_id || data.workspace_nid || this.mget(_a.home_id) || nid);
    this._curWorkspace = { hub_id, nid, area: data.area };
    this.mset({ hub_id, nid, nodeId: nid, area: data.area, ownpath, home_id });
    this.ensurePart(_a.list).then((l) => {
      l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
      if (l.collection) l.collection.reset();
      l.el.style.visibility = 'hidden';
      const scrollEl = l.el.querySelector('.smart-container');
      if (scrollEl) {
        scrollEl.dataset.partitioning = 1;
        scrollEl.style.visibility = 'hidden';
      }
      l.restart();
      this._prepareListPartition(l);
    });
    this.ensurePart("wrapper-modal").then((p) => p.clear());
    // Sidebar nav reloads the desk container in-place; preserve open windows.
    this.updateBreadcrumb({ ...data, service: "change-workspace" }, this);
  }

  /**
   * Sidebar sub-folder click: load the folder's contents into the desk
   * container's grid in-place. Does NOT launch a folder window and does
   * NOT touch already-open folder windows. Breadcrumb resolves the full
   * Home › Workspace › Folder path via the change-workspace broadcast.
   */
  openWorkspaceFolder(node) {
    const data = node.model ? node.model.toJSON() : (node || {});
    const hub_id = data.hub_id || data.workspace_hub_id || data.id;
    // Use the sub-folder's own nid; fall back to workspace root only when
    // the node carries no nid (e.g. the row clicked is the workspace root).
    const nid = data.nid || data.actual_home_id || data.home_id || data.workspace_nid;

    if (!hub_id || !nid) return this.loadWorkspaceNode(node);

    if (window.Desk && _.isFunction(window.Desk._closeMainPanels)) {
      window.Desk._closeMainPanels();
    }

    const area = data.area || data.workspace_area;
    // Subfolder ownpath comes from show_node_by (sidebar feeds workspace_item
    // with the server item; ownpath/filepath is the per-hub path). Required
    // so drag-drop uploads target THIS subfolder — without it, the destpath
    // resolved by _getDestination stays at the previous workspace root.
    const ownpath = data.ownpath || data.filepath || '/';
    // home_id = workspace root nid (preserved across subfolder navigation) so
    // makeOptions classifies cross-window drops as MOVE not COPY.
    const home_id = data.actual_home_id || data.workspace_nid || data.home_id || this.mget(_a.home_id) || nid;
    this._curWorkspace = { hub_id, nid, area };
    this.mset({ hub_id, nid, nodeId: nid, area, ownpath, home_id });
    this.ensurePart(_a.list).then((l) => {
      l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
      if (l.collection) l.collection.reset();
      l.el.style.visibility = 'hidden';
      const scrollEl = l.el.querySelector('.smart-container');
      if (scrollEl) {
        scrollEl.dataset.partitioning = 1;
        scrollEl.style.visibility = 'hidden';
      }
      l.restart();
      this._prepareListPartition(l);
    });
    this.ensurePart("wrapper-modal").then((p) => p.clear());
    this.updateBreadcrumb({
      ...data,
      hub_id,
      nid,
      area,
      service: "change-workspace",
    }, this);
  }

  openContent(media, args) {
    if (media && media.mget
      && media.mget(_a.filetype) === _a.hub
      && media.mget(_a.status) !== _a.deleted) {
      const item = this.getWindowPreset(media);
      item.kind = "window_folder";
      item.wm_unique_id = `window_folder-${item.hub_id}`;
      return this.launch(item, { explicit: 1, singleton: 1 });
    }
    return super.openContent(media, args);
  }

  getCurrentNid() {
    if (this._curWorkspace?.nid != null) return this._curWorkspace.nid;
    return super.getCurrentNid();
  }

  actualNode() {
    if (this._curWorkspace?.hub_id && this._curWorkspace?.nid != null) {
      return {
        ...super.actualNode(),
        hub_id: this._curWorkspace.hub_id,
        nid: this._curWorkspace.nid,
      };
    }
    return super.actualNode();
  }

  /**
   *
   */
  upgradePlage() {
    this.ensurePart("wrapper-modal").then((p) => {
      p.feed({ kind: "settings_pricing" })
    })
  }

  /**
   *
   */
  fetchMediaAttributes(opt) {
    return this.fetchService(
      {
        service: SERVICE.media.node_info,
        nid: opt.nid,
        hub_id: opt.hub_id,
      },
      { async: 1 }
    )
      .then((r) => {
        let m = new Backbone.Model(r);
        opt = _.merge(opt, r);
        Kind.waitFor(_a.media).then((k) => {
          opt.media = new k({ model: m });
          this.launch(opt, { explicit: 1 });
        });
      })
      .catch((e) => {
        //this.warn("EEE:108", e);
        this.alert(LOCALE.ERROR_SERVER);
      });
  }

  /**
   * Open chat-p2p panel and start chat with the given user.
   * Used by user-mention click handler.
   */
  _openChatWithUser(drumate_id) {
    if (!drumate_id) return;

    Desk.ensurePart('chat-panel').then(panel => {
      if (panel.isEmpty()) {
        Desk.togglePanel('chat_p2p', 'chat-panel');
      }

      const tryOpen = (retries = 20) => {
        const widget = panel.children && panel.children.last && panel.children.last();
        if (widget && _.isFunction(widget.openChatByPeerId)) {
          try {
            widget.openChatByPeerId(drumate_id);
          } catch (e) {
            this.warn("Failed to open chat with user", e);
          }
          return;
        }
        if (retries > 0) {
          setTimeout(() => tryOpen(retries - 1), 200);
        }
      };

      setTimeout(tryOpen, 300);
    });
  }

  /**
   *
   */
  checkUserInteraction() {
    if (localStorage.skipUiCheck || localStorage.developerMode == _a.enable) {
      return;
    }

    setTimeout(() => {
      if (this._userHasInteracted) return;
      this._userHasInteracted = 1;
      Visitor.playSound(_K.notifications.std, 0);
    }, Visitor.timeout(10000));

    RADIO_POINTER.once(_e.mousedown, () => {
      this._userHasInteracted = 1;
      this.alert();
    });
  }

  /**
   *
   */
  loadReminders() {
    this.postService(
      {
        hub_id: Visitor.id,
        nid: Visitor.get(_a.home_id),
        service: SERVICE.reminder.list,
      },
      { async: 1 }
    ).then((data) => {
      if (!data || !data.length) return;
      for (let c of data) {
        if (_.isString(c.task)) c.task = JSON.parse(c.task);
        if (c.task && c.task.kind) {
          c.kind = c.task.kind;
          delete c.task.kind;
          if (c.task.style) c.pin = c.task.style;
          c.task.filename = c.filename || LOCALE.NOTE;
          if (c.task.repeat == "onload") {
            this.windowsLayer.append(c);
          } else if (c.task.stime && c.task.stime > Dayjs().valueOf()) {
            setTimeout(() => {
              this.windowsLayer.append(c);
            }, c.task.stime - Dayjs().valueOf());
          }
        }
      }
    });
  }

  /**
   * @param {Object} opt
   */
  checkPrivilegeForHub(opt) {
    return this.fetchService(
      {
        service: SERVICE.media.node_info,
        nid: opt.nid,
        hub_id: opt.hub_id,
      },
      { async: 1 }
    )
      .then((data) => {
        if (data.status == 403) {
          return this.alert(LOCALE.WEAK_PRIVILEGE);
        }
        Kind.waitFor(_a.media).then((k) => {
          data.role = _a.url;
          let m = new Backbone.Model(data);
          opt.media = new k({ model: m });
          return this.openFileLocation(opt.media);
        });
      })
      .catch(() => {
        this.alert(LOCALE.WEAK_PRIVILEGE);
      });
  }

  /**
   * 
   */
  bindWsEvents() {
    let expected = [SERVICE.signaling.dial, SERVICE.signaling.notify, "live", "adminpanel"];
    uiRouter.ensureWebsocket().then(() => {
      let timer = setInterval(() => {
        let activeEvents = wsRouter.hasListener(this);
        if (activeEvents && _.isArray(activeEvents)) {
          let missing = activeEvents.filter((p) => {
            if (!expected.includes(p)) {
              return 1
            }
            return 0
          })
          if (!missing.length) {
            clearInterval(timer);
          }
        } else {
          this.bindEvent(
            SERVICE.signaling.dial,
            SERVICE.signaling.notify,
            "live",
            "adminpanel"
          );
          this.updatePeersState();
        }
      }, 2000)
    });
  }

  /**
   * To do : allow copy/paste/supp through keyboard short cut
   */
  _handelKbdEvents(e) {
  }


  /**
   * Home-grid filter — drop hub-symlinks for non-collaborative areas
   * (personal, dmz/wicket, public, …). Folders/files at home root must
   * pass through unchanged: mfs_show_node_by's IFNULL(area, _hub_area)
   * stamps them with the home hub's area='personal', so a flat area
   * filter would erase them. Hence the filetype guard.
   * Collaborative set is {share, private, restricted, public} — `private` here
   * is the UX "restricted" workspace, not the personal hub.
   * No-op once the user has navigated into a sub-workspace.
   */
  onPartReady(child, pn) {
    if (pn === _a.list && child && !child._homeGridFilterInstalled) {
      child._homeGridFilterInstalled = 1;
      const original = child.prepareData.bind(child);
      const wm = this;
      child.prepareData = function (data) {
        const prepared = original(data) || [];
        const atHome = !wm._curWorkspace
          || wm._curWorkspace.hub_id === Visitor.id;
        if (!atHome) return prepared;
        return prepared.filter((it) => {
          if (!it || it.filetype !== _a.hub) return true;
          return /^(share|private|restricted|public)$/.test(it.area);
        });
      };
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  onDomRefresh() {
    this.debug("AAA:7650", this)
    this.feed(require("./skeleton")(this));
    this.fetchService(SERVICE.desk.get_env,
      { hub_id: Visitor.id },
      { async: 1 }
    ).then((data) => {
      if (_.isEmpty(data)) return;
      if (data.home_id) this.mset(data);
      if (data.wicket_id) {
        Visitor.set({ wicket_id: data.wicket_id });
      }
      this.trigger(_e.ready);
      // this.route();
      Visitor.set({ disk: data.disk });
      this.bindWsEvents()
    });
    this.visible = !document.hidden;
    document.onvisibilitychange = async (e) => {
      if (!this.visible) {
        ActivityHandler && ActivityHandler.resync();
        await uiRouter.ensureWebsocket();
        this.updatePeersState();
      }
      this.visible = !document.hidden;
    };
    // this.loadReminders();

    window.addEventListener("online", () => {
      ActivityHandler && ActivityHandler.resync();
    });
  }

  /**
   *
   */
  showDiskUsage() {
    this.alert(require("./skeleton/disk-usage")(this));
  }

  /**
   *
   */
  async playTutorial(name) {
    let data = await this.fetchService(
      SERVICE.yp.tutorial,
      { name },
      { async: 1 }
    );
    if (!data || !data.src) return null;
    const { protocol } = bootstrap();
    if (!/^(http|file)/.test(data.src)) data.src = `${protocol}://${data.src}`;
    await Kind.waitFor("video_viewer");

    let items = this.getItemsByKind("video_viewer");
    if (items && items.length) {
      for (var item of items) {
        if (item.mget(_a.type) == "tutorial") {
          item.mould(data);
          return item;
        }
      }
    }
    let c = this.windowsLayer.append({
      kind: "video_viewer",
      type: "tutorial",
      src: data.src,
    });
    return c;
  }


  /**
   * 
   */
  _openDefault() { }

  /**
   * 
   */
  make_default_dirs() {
    this.postService({
      service: SERVICE.media.make_root_dirs,
      folders: [LOCALE.DOCUMENTS, LOCALE.PHOTOS, LOCALE.VIDEOS, LOCALE.MUSICS],
    });
  }

  /**
   * Capture the moving media
   * When several browsers are open and overlapping, the most highest z-index is the target
   * Selecting insertion point is locked then on children of that target
   * @param {*} moving 
   * @returns 
   */
  capture(moving) {
    if (!moving) return;
    this._target = null;
    const t = this.selectWindow(moving);

    if (!t) {
      return;
    }
    if (t.isWallpaperSettings) {
      t.seek_insertion(moving);
      return t;
    }
    this._target = t.seek_insertion(moving);
    if (!this._target) {
      if (this._prevOver) {
        this._prevOver.overed(_a.off, moving);
      }
      return;
    }
    if (this._lastTaget && this._lastTaget != this._target) {
      if (_.isFunction(this._lastTaget)) this._lastTaget.clearShift();
    }
    this._lastTaget = this._target;
    this.moveAllowed(moving);

    const targetPOS =
      (this._target.bbox.y || 0) + (this._target.bbox.h || 0) - 10;
    const movingPOS = (moving.bbox.y || 0) + (moving.bbox.h || 0);
    if (targetPOS < movingPOS) {
      this._target.scrollToBottom();
    }
  }

  /**
   * 
   * @param {*} moving 
   * @returns 
   */
  insert(moving) {
    const selected = this.getGlobalSelection();
    let files = [moving];

    if (selected.length > 0) {
      files = selected;
    }

    _.delay(this.clearShift.bind(this), 1000);

    if (this._target == null) {
      const t = this.selectWindow(moving);
      moving.mset({ logicalParent: t });
      return false;
    }

    const dest = this._target;
    const c = this._target.captured;
    let position = 0;
    this._target.el.dataset.over = _a.off; //to show the fileDragDrop is over
    if (c.over) {
      for (let file of Array.from(files)) {
        c.over.moveIn(file);
      }
      return true;
    }

    if (c.left) {
      this.verbose("insert:after", c.left);
      if (this._target.mget(_a.privilege) & _K.permission.modify) {
        if (moving.index() < c.left.index()) {
          position = c.left.index();
        } else {
          position = c.left.index() + 1;
        }
      } else {
        this._target.warning(LOCALE.WEAK_PRIVILEGE);
        return false;
      }
    } else if (c.right) {
      this.verbose("insert:before", c.right, c.right.index());
      position = c.right.index();
      if (position === 0) {
        position = -1;
      }
    } else if (c.self && c.self.intersect(this._target)) {
      if (this._target.cid !== this.cid) {
        this.verbose("insert:another window", c, this._target, this);
        if (
          this._target.mget(_a.privilege) & _K.permission.modify ||
          (this._target.mget(_a.actual_home_id) !=
            moving.mget(_a.actual_home_id) &&
            this._target.mget(_a.privilege) & _K.permission.write)
        ) {
          this._target.insertMedia(files, 0);
        } else {
          this._target.warning(LOCALE.WEAK_PRIVILEGE);
          return false;
        }
        return true;
      }

      if (moving.bbox.x < 50 && moving.bbox.y < 110) {
        if (moving.cid === this.iconsList.children.first().cid) {
          this.verbose("insert:self[NOP]");
          return false;
        }
        this.verbose("insert:start[445]");
        this._target.insertMedia(files, -1);
      } else if (
        moving.bbox.y > this.iconsList.children.last().$el.offset().top
      ) {
        if (moving.cid === this.iconsList.children.last().cid) {
          this.verbose("insert:self[NOP]");
          return false;
        }
        this.verbose("insert:end[454]");
        this._target.insertMedia(files, 0);
      } else {
        if (c.self && c.self.pos === _e.end) {
          this.verbose("insert:end[458]");
          this._target.insertMedia(files, 0);
        }
      }
      return true;
    } else {
      this.verbose("insert:start[465]");
      if (this._target.insertMedia(files, 0)) {
        this._target.scrollToBottom();
      }
      return true;
    }
    this.verbose(`insert:at[p=${position}]`, moving, this._target);
    dest.insertMedia(files, position);
    return true;
  }

  /**
   * 
   * @returns 
   */
  load() {
    return this.searchBar != null ? this.searchBar.setValue("") : undefined;
  }


  /**
   * 
   */
  clearShift() {
    this.resetShift();
    this.windowsLayer.children.each(function (c) {
      if (c.acceptMedia) {
        return c.resetShift();
      }
    });
  }

  /**
   * 
   * @param {*} view 
   */
  reloadAll(view) {
    this.windowsLayer.children.each(function (c) {
      try {
        return c.reload();
      } catch (error) { }
    });
  }

  /**
   *
   * @param {*} view
   */
  reload() {
    this._cleanupPartition();
    // Clear the per-workspace context so the topbar's + Add new button
    // reverts to the workspace creation flow on the home view.
    this._curWorkspace = null;
    this.mset({ hub_id: Visitor.id, nid: Visitor.get(_a.home_id), nodeId: Visitor.get(_a.home_id), area: _a.personal });
    this.feed(require("./skeleton")(this));
  }

  /**
   *
   * @returns
   */
  lock() {
    const selectionList = this.getGlobalSelection();
    let lockList = selectionList;
    const activeList = selectionList.filter((row) => {
      return (
        row.mget(_a.status) === _a.active && row.mget(_a.filetype) !== _a.hub
      );
    });
    if (activeList.length) {
      lockList = activeList;
    }

    return Array.from(lockList).map((i) => i.lock());
  }


  /**
   *
   * @param {*} cmd
   */
  onConfirmRemove(cmd) {
    if (this._popups.length) {
      const p = this._popups.shift();
      uiRouter.getPart(_a.context).feed(p);
    }
  }

  /**
 * 
 * @param {*} list  -- List of nodes 
 */
  putIntoTrash(list) {
    let nodes = [];
    if (list.length == 1) {
      list[0].delete(1, this.__trashBin.$el);
      return
    }
    for (var n of list) {
      if (n.mget(_a.filetype) == _a.hub) {
        n.unselect();
        n.moveForbiden(LOCALE.ACTION_NOT_PERMITTED);
        continue;
      }
      nodes.push({
        nid: n.mget(_a.nodeId),
        hub_id: n.mget(_a.hub_id),
        parent_id: n.mget(_a.parent_id),
      })
    }
    if (_.isEmpty(nodes)) return;
    this.postService({
      service: SERVICE.media.trash,
      nodes,
      hub_id: nodes[0].hub_id
    }).then((data) => {
    }).catch(e => {
      this.warn("Failed to delete nodes", nodes, e)
    })
  }

  /**
   *
   * @param {*} cmd
   */
  confirmRemoveHub(media) {
    media.select()
    return new Promise((resolve, reject) => {
      this.ensurePart('wrapper-modal').then(async (p) => {
        await Kind.waitFor('window_confirm')
        p.feed({
          kind: 'window_confirm',
          maxsize: 2,
          title: LOCALE.DELETE,
          message: LOCALE.MSG_DELETE_HUB.format(media.mget(_a.filename)),
          confirm: LOCALE.DELETE,
        }).ask().then(() => {
          const deleteHub = () => this.postService({
            service: SERVICE.hub.delete_hub,
            hub_id: media.mget(_a.hub_id)
          }).then((data) => {
            media.suppress();
            resolve(data)
          });
          this.animateMediaToTrash(media).then(deleteHub).catch(deleteHub);
          p.clear()
        }).catch((e) => {
          resolve({})
        });
      })
    })
  }


  /**
   *
   * @param {*} cmd
   */
  confirmLeaveHub(media) {
    this.ensurePart('wrapper-modal').then(async (p) => {
      await Kind.waitFor('window_confirm')
      p.feed({
        kind: 'window_confirm',
        maxsize: 2,
        title: LOCALE.LEAVE,
        message: LOCALE.MSG_LEAVE_HUB.format(media.mget(_a.filename)),
        confirm: LOCALE.LEAVE
      }).ask().then(() => {
        this.animateMediaToTrash(media).then(() => {
          this.postService({
            service: SERVICE.desk.leave_hub,
            nid: media.mget(_a.hub_id),
            hub_id: Visitor.id
          });
        })
        p.clear()
      }).catch(() => { });
    })
  }

  /**
   *
   * @param {*} cmd
   */
  confirmRemoveHubsInside(media) {
    this.ensurePart('wrapper-modal').then(async (p) => {
      await Kind.waitFor('window_confirm')
      let msg = `The directory {0} contains one or more shares folders. Deleting it shall remove all the content within them`;
      p.feed({
        kind: 'window_confirm',
        maxsize: 2,
        title: "Caution! Shared folders inside.",
        message: msg.format(media.mget(_a.filename)),
        confirm: LOCALE.REMOVE
      }).ask().then(async () => {
        let ids = media.mget(_a.hubs).split(/,/g)
        for (let hub_id of ids) {
          /** Get attr from desk */
          let data = await this.fetchService(SERVICE.media.get_node_attr, {
            nid: hub_id,
            hub_id: Visitor.id
          })
          if (!_.isArray(data)) data = [data]
          for (let item of data) {
            if (item.privilege & _K.permission.owner) {
              await this.postService({
                service: SERVICE.hub.delete_hub,
                hub_id: item.actual_hub_id,
                nid: item.actual_home_id
              })
            } else if (item.privilege & _K.permission.read) {
              await this.postService({
                service: SERVICE.desk.leave_hub,
                nid: item.actual_hub_id,
                hub_id: Visitor.id
              })
            }
          }
          this.animateMediaToTrash(media).then(() => {
            media.logicalParent.syncGeometry()
            media.putIntoTrash(1);
          }).catch(() => {
            media.putIntoTrash(1);
          })
        }
        p.clear()
      }).catch(() => { });
    })
  }

  /**
   * 
   * @param {*} media 
   */
  getMediaSelection(media) {
    let selection = Wm.getGlobalSelection();
    if (media && media.isMfs && media.mget(_a.nid)) {
      let duplicated = 0;
      for (let m of selection) {
        if (m.mget(_a.nid) == media.mget(_a.nid)) {
          duplicated = 1;
          break;
        }
      }
      if (!duplicated) {
        selection.push(media)
      }
    }
    let own_hubs = []
    let other_hubs = []
    let hubs_inside = []
    let allowed = [];
    let rejected = [];
    let locked = [];
    for (let m of selection) {
      if (m.mget(_a.status) === _a.locked) {
        locked.push(m)
        continue;
      }
      if (m.isHub) {
        if (m.isGranted(_K.permission.owner)) {
          own_hubs.push(m)
        } else {
          other_hubs.push(m)
        }
      } else if (m.isFolder) {
        if (m.containsHub) {
          hubs_inside.push(m)
        } else if (m.canRemove()) {
          allowed.push(m)
        } else {
          rejected.push(m)
        }
      } else if (m.canRemove()) {
        allowed.push(m)
      } else {
        rejected.push(m)
      }
    }
    return {
      own_hubs, other_hubs, hubs_inside, allowed, rejected, locked
    }
  }

  /**
   * 
   */
  async removeMediaSelection(media) {
    let {
      own_hubs, other_hubs, hubs_inside, allowed, rejected, locked
    } = this.getMediaSelection(media)

    for (let r of rejected) {
      r.actionDenied()
    }

    for (let r of allowed) {
      this.animateMediaToTrash(r).then(() => {
        r.logicalParent.syncGeometry()
        if (r.mget(_a.status) === "seeding") {
          r.suppress();
          return;
        }
        r.putIntoTrash(1);
      }).catch(() => {
        r.putIntoTrash(1);
      })
    }

    for (let r of own_hubs) {
      await this.confirmRemoveHub(r);
    }

    for (let r of other_hubs) {
      await this.confirmLeaveHub(r);
    }

    for (let r of hubs_inside) {
      await this.confirmRemoveHubsInside(r);
    }

    for (let r of locked) {
      r.actionDenied(LOCALE.FILE_NOT_DISPOSABLE);
    }

  }

  /**
   * 
   */
  animateMediaToTrash(media) {
    return new Promise((resolve, reject) => {
      const helper = media.$el.clone();
      helper.removeAttr("class");
      helper.addClass(`deleting ${media.fig.family}__helper-wrapper`);
      const pos = media.$el.offset();
      helper.css({
        position: _a.absolute,
        left: pos.left,
        top: pos.top - media.$el.height(),
        zIndex: 200002, // Must be hight than modal popup
      });
      let trash = this.getTrashBin()
      if (!trash) {
        return reject()
      }
      let trashbin = trash.$el;
      this.$el.append(helper);
      const f = () => {
        const tl = new TimelineMax();
        tl.to(trashbin, 0.3, { scale: 1.2 }).to(trashbin, 0.3, { scale: 1 });
        trashbin.parent().children(".temp-anim").remove();
        helper.remove();
        resolve()
      };

      const dest_x = trashbin.offset().left;
      const dest_y = trashbin.offset().top;
      TweenLite.to(helper, 1.4, {
        left: dest_x,
        top: dest_y,
        scale: 0,
        alpha: 0,
        onComplete: f,
      });
    })
  }

  /**
   * 
   */
  getTrashBin() {
    let dock = Wm.getPart('dock');
    if (dock) {
      return dock.getPart('trash-bin')
    }
    return null;
  }



  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.status || cmd.mget(_a.service);
    switch (service) {
      case "open-manager":
        return this.openManager(cmd, args);

      case "manage-access":
        return this.openAccessManager(cmd, args);

      case "confirm-removal":
        if (cmd.isGranted(_K.permission.owner)) {
          this.confirmRemoveHub(cmd, args);
        } else {
          this.confirmLeaveHub(cmd, args);
        }
        return;

      case "remove-selection":
        return this.removeMediaSelection(args.media)

      case "confirm-remove-selection":
        for (let hub of args.selection) {
          if (!hub.isHub) continue;
          if (hub.isGranted(_K.permission.owner)) {
            await this.confirmRemoveHub(hub, args);
          } else {
            await this.confirmLeaveHub(hub, args);
          }
        }
        return;

      case "open-node":
        let now = new Date().getTime()
        if ((now - lastClickTime) < 1000) return /** Prevent too fast click */

        lastClickTime = now
        this.openContent(cmd, args);
        return this.unselect();

      case "upgrade-plan":
        return this.upgradePlage(cmd);

      case _e.launch:
        return this.launch(args, { explicit: 1, singleton: 1 });

      case "new-workspace":
        return this.ensurePart('wrapper-modal').then((p) => {
          p.clear();
          p.el.dataset.state = "open";
          p.el.dataset.overlay = "none";
          const skel = (this._curWorkspace && this._curWorkspace.hub_id)
            ? { kind: 'folder_form', hub_id: this._curWorkspace.hub_id, nid: this._curWorkspace.nid }
            : { kind: 'media_form' };
          p.feed(skel);
          // Reset the wrapper only when the whole dialog chain is gone.
          // media_form chains to permission_* via parent.feed(); collection
          // "update" fires once after the swap so length reflects the final
          // state — using per-child destroy would close the wrapper mid-swap.
          if (!p._closeWhenEmpty) {
            p._closeWhenEmpty = () => {
              if (p.collection && p.collection.length === 0) {
                p.el.dataset.state = "closed";
                delete p.el.dataset.overlay;
              }
            };
            p.collection.on("update reset", p._closeWhenEmpty);
          }
        });

      case "new-sub-folder":
        return this.addFolder({ position: 0, area: _a.personal, filename: LOCALE.NEW_FOLDER })

      case _a.helpdesk:
        return this.launch(
          { kind: "window_helpdesk" },
          { explicit: 1, singleton: 1 }
        );

      case _a.account:
        return this.launch(
          { kind: "window_account", start: _a.profile },
          { explicit: 1, singleton: 1 }
        );

      case "pricing":
        return this.__wrapperModal.feed({ kind: "organization_form" });
      case _a.preferences:
        return this.__wrapperModal.feed({ kind: "settings_account" });

      case "open-player":
        return this.openPlayer(cmd);

      case "open-kind":
        return this.openKind(cmd);

      case _e.open:
        return this.open(cmd, cmd._args);

      case _e.upload:
        return this.handleUpload();

      case "export-to-server":
      case "import-from-server":
        this.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this,
          },
          { explicit: 1, singleton: 1 }
        );
        return this.verbose("import export", cmd, this);

      case _e.rename:
      case _a.idle:
        return noOperation();

      // case "launch-support-ticket":
      //   Kind.waitFor("support_ticket_item").then(() => {
      //     this.launchSupportTicket(cmd);
      //   });
      //   return;

      case SERVICE.desk.create_hub:
        args.data.kind = this._getKind();
        args.data.isalink = 1;
        this.windowsLayer.append(args.data);
        this.syncOrder();
        return;

      case "new-media":
      case "new-messages":
      case "channel":
        var o = _.merge(cmd._args, args);
        return this.launch(o);

      case "no-trash-hubs":
        return this.alert(LOCALE.CONTAINS_NON_DELETABLE);

      case _a.bubble:
        if (cmd.acceptMedia && !cmd.getState()) {
          return cmd.raise();
        }
        break;

      case "hub-settings":
        this.openSettings(cmd);
        break;

      case "copy-media":
        this.storeClipboard(_e.copy, cmd);
        break;

      case _a.paste:
        this.paste(this);
        break;

      case _a.properties:
        this._launchApp(cmd);
        break;

      case "close-alert":
        this.__wrapperModal.clear();
        break;

      case "close-dialog":
        return this.closeDialog();

      case "add-folder":
        this._pendingFolderArea = null;
        return this.openCreateFolderDialog();

      case "add-private-folder":
        return this.openCreateFolderDialog();

      case "create-folder-submit":
        this._pendingFolderArea = _a.personal;
        return this.createFolderFromDialog(cmd);

      case "close-folder-dialog":
        return this.closeCreateFolderDialog();

      default:
        // Internal search/contact events that bubble from invitation_searchbox – do not warn
        const ignoredServices = [
          _a.interactive,
          _a.results,
          _e.found,
          "items-found",
          "search",
          "Backspace",
          _e.update,
        ];
        if (ignoredServices.includes(service)) {
          return;
        }
        this.unselect(1);
        if (this.el.contains(lastClick.target)) {
          Desk.closeMainPanels()
          Desk.closeOtherSidebarPanels()
        }
        return this.warn("AAA:471", WARNING.method.unprocessed.format(service));
    }
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  paste(cmd) {
    let target = this.getActiveWindow();
    if (cmd && cmd.append) {
      target = cmd;
    }
    if (target != null && _.isFunction(target.append)) {
      target.pasteMedia();
      target.scrollToBottom();
    } else {
      this.pasteMedia();
      this.scrollToBottom();
    }
  }

  /**
   *
   */
  launchSupportTicket(cmd) {
    const type = cmd.mget(_a.type);
    const source = this.__dock.__bigchatLauncher;
    const route = { page: type };
    const w = Wm.getItemsByKind("window_supportticket")[0];

    if (w && !w.isDestroyed()) {
      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          w.wake(source);
        }
        w.raise();
        w.reload(route);
      };

      _.delay(f, 100);
      return false;
    }

    route.initialLoad = true;

    Wm.launch(
      { kind: "window_supportticket", args: route },
      { explicit: 1, singleton: 1 }
    );
    return;
  }

  /**
   *
   */
  // async toggleFullscreen() {
  //   if (document.fullscreenElement != null) {
  //     if (document.fullscreen) document.exitFullscreen();
  //   } else {
  //     await document.body.requestFullscreen();
  //   }
  //   this.updateContextMenuItems();
  // }

  /**
   *
   */
  closeDialog() {
    if (this.overlayWrapper) {
      this.overlayWrapper.softClear();
    }
    if (this.dialogWrapper) {
      return this.dialogWrapper.softClear();
    }
  }

  /**
   *
   * @param {*} t
   * @returns
   */
  xorSelect(t) {
    if (this._isMoving || pointerDragged) {
      return;
    }
    if (t !== this) {
      this.iconsList.children.each((c) => {
        try {
          return c.unselect();
        } catch (error) { }
      });
    }

    this.windowsLayer.children.each((c) => {
      if (t !== c) {
        try {
          return c.unselect();
        } catch (error) { }
      }
    });
  }

  /**
   * storeClipboard
   * @param { copy | string } name
   * @param { __media_grid } item
   * @returns
   */
  storeClipboard(name, item) {
    if (name == null) {
      this.clipboard = {};
      return;
    }
    let files = this.getGlobalSelection() || [];

    // removed the hub while copy
    if (name == _e.copy) {
      files = files.filter((file) => file.mget(_a.type) != _a.hub);
    }

    for (let f of Array.from(files)) {
      f.el.dataset.phase = name;
    }

    if (item && item.el && (item.mget(_a.type) != _a.hub || name == _e.copy)) {
      item.el.dataset.phase = name;
      files = [item];
    }
    this.clipboard = {
      command: name,
      files,
    };
  }

  /**
   *
   */
  clearClipboard() {
    this.clipboard = {};
  }

  /**
   *
   * @returns
   */
  copyLink() {
    let cur = null;
    for (let c of Array.from(this.__windowsLayer.children.toArray())) {
      if (c.mget(_a.state)) {
        cur = c;
        break;
      }
    }
    const s = this.getGlobalSelection()[0] || cur;
    if (!s) {
      return;
    }
    s.viewerLink(_a.orig).then((url) => {
      setTimeout(async () => {
        await copyToClipboard(url);
        Wm.acknowledge();
      }, 0);
    });
  }

  /**
   *
   * @param {*} e
   */
  onAnchorClick(e) {
    // Find the <a> tag — could be e.target or a parent of e.target
    let anchor = e.target;
    if (anchor.tagName !== "A") {
      anchor = anchor.closest('a');
    }
    if (anchor && anchor.tagName == "A") {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();

      // Handle user-mention clicks → open bigchat with that user
      if (anchor.classList.contains('user-mention')) {
        const drumate_id = anchor.dataset.drumate_id;
        if (drumate_id) {
          this._openChatWithUser(drumate_id);
          return;
        }
      }

      // Handle file-mention clicks
      if (anchor.classList.contains('file-mention')) {
        const nid = anchor.dataset.nid;
        const hub_id = anchor.dataset.hub_id;
        if (nid && hub_id) {
          // Fetch file info then launch via same path as folder thumbnail click
          this.fetchService(
            {
              service: SERVICE.media.node_info,
              nid,
              hub_id,
            },
            { async: 1 }
          ).then((r) => {
            if (!r || !r.filetype) return;
            const m = new Backbone.Model(r);
            const fType = r.filetype;
            const application = require("builtins/window/configs/application");

            Kind.waitFor(_a.media).then((k) => {
              const media = new k({ model: m });
              const preset = {
                nid: r.nid || nid,
                hub_id: r.hub_id || hub_id,
                filename: r.filename,
                filetype: fType,
                vhost: r.vhost,
                home_id: r.home_id,
                holder_id: r.holder_id,
                area: r.area,
                privilege: r.privilege,
                useKeyEvent: 1,
                service: "open-node",
                state: _a.on,
                uiHandler: [this],
                media,
                trigger: media,
                radio: _a.on,
              };

              let app = application(fType, preset);
              if (_.isEmpty(app) || !app.kind) {
                app = { ...app, kind: "props_viewer", media };
              }
              app.style = this.getWindowPosition(media);

              const launchTag = _.uniqueId();
              Kind.waitFor(app.kind).then(() => {
                try {
                  app.launchTag = launchTag;
                  this.windowsLayer.append(app);
                } catch (err) {
                  this.warn("Failed to open mentioned file", err);
                }
              });
            });
          }).catch((err) => {
            this.warn("Failed to fetch mentioned file info", err);
          });
          return;
        }
      }

      let re = new RegExp(_K.module.desk + "/wm/");
      let text = anchor.innerText;
      let href;
      if (/^http/.test(text)) {
        href = text;
      } else {
        const { protocol } = bootstrap();
        href = `${protocol}://${text}`;
      }
      let opt = Visitor.parseModuleArgs(text);
      const url = new URL(href);
      if (url.host != bootstrap().main_domain) {
        //window.open(href, "_blank", "noopener;");
        window.open(href, "_blank");
        return;
      }
      if (opt.kind) {
        this.openSharedLink(opt);
        return true;
      }
    }
  }

  /**
   *
   * @param {*} media
   * @param {*} start
   */
  openHubManager(media, start) {
    let item = this.getWindowPreset(media);
    if (start) item.start = start;
    switch (media.mget(_a.area)) {
      case _a.public:
        item.kind = "window_website";
        break;
      case _a.private:
        item.kind = "window_team";
        break;
      case _a.share:
      case "dmz":
        item.kind = "window_sharebox";
        break;
      case "electron":
        item.kind = "electron_update";
        break;
      default:
        this.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED);
      // this._openShareBox(item, c, moving);
    }
    item.trigger = media;
    item.media = media;
    this.windowsLayer.append(item);
  }

  /**
 * 
 */
  openAccessManager(cmd) {
    const invitation = {
      kind: 'invitation',
      topLabel: LOCALE.DOCUMENTS_ACCESS,
      media: cmd,
      uiHandler: [this]
    };
    this.__wrapperModal.feed(invitation)
  }

  /**
 *
 * @param {*} media
 * @param {*} start
 */
  openSettings(media) {
    let item = media.model.toJSON();
    // Toggle settings popup (same behavior as sharebox switchShowShareboxSettings)
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.__wrapperModal.clear();
    }
    this.isShowSettings = true;

    switch (media.mget(_a.area)) {
      case _a.personal:
      case _a.public:
      case _a.private:
      case _a.share:
      case "dmz":
        item.kind = "settings_hub";
        break;
      case "electron":
        item.kind = "electron_update";
        break;
      default:
        this.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED);
      // this._openShareBox(item, c, moving);
    }
    item.uiHandler = [media];
    item.source = media;
    item.media = media;
    item.hub_id = media.mget(_a.hub_id);
    item.persistence = _a.once;
    this.__wrapperModal.feed(item);

    const c = this.__wrapperModal.children && this.__wrapperModal.children.last
      ? this.__wrapperModal.children.last()
      : null;
    if (!c) return;

    c.once(_e.destroy, () => {
      this.isShowSettings = false;
      if (media && typeof media.unselect === "function") {
        return media.unselect();
      }
    });
    return c.on(_e.show, () => {
      if (media && typeof media.on === "function") {
        return media.on(_e.unselect, () => {
          this.isShowSettings = false;
          return this.__wrapperModal.clear();
        });
      }
    });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  async search(cmd, args) {
    this.searchBar = cmd;
    const str = cmd.getValue(1);
    let kind = "window_search";
    await Kind.waitFor(kind);

    const w = this.getItemByKind(kind);
    if (!str.length) {
      if (args.type === _e.click) {
        return;
      }
      if (w != null && !w.isDestroyed()) {
        w.suppress();
      }
      return;
    }
    if (w != null && !w.isDestroyed()) {
      w.mset(_a.string, str);
      w.loadContent();
    } else {
      const item = {
        kind,
        string: str,
        trigger: cmd,
        uiHandler: [this],
      };
      this.windowsLayer.append(item);
      //cmd.setValue(str);
    }
  }

  // /**
  //  *
  //  * @param {*} cmd
  //  * @param {*} args
  //  */
  // showProperties(cmd, args) {
  //   let content = "<br>";
  //   let widget = cmd;
  //   if (args?.trigger) {
  //     widget = args.trigger;
  //   }
  //   let data = widget.actualNode();
  //   for (var k in data) {
  //     if (data[k] != null && _.isString(data[k])) {
  //       content = content + `${k}:<b>${data[k]}</b><br>`;
  //     }
  //   }
  //   this.alert(require("./skeleton/properties")(this, data));
  // }

  /**
   *
   * @param {*} opt
   * @param {*} cb
   * @returns
   */
  openFilter(opt, cb) {
    const w = this.getItemByKind("window_filter");
    if (w != null && !w.isDestroyed()) {
      return;
    }
    const item = {
      kind: "window_filter",
      styleOpt: {
        left: window.innerWidth / 2 - _K.docViewer.width / 2,
      },
    };
    if (opt != null) {
      _.merge(item, opt);
    }
    const f = () => {
      this.windowsLayer.append(item);
      if (_.isFunction(cb)) {
        const last = this.windowsLayer.children.last();
        cb(last);
      }
    };
    this.waitElement(this.windowsLayer.el, f);
  }

  /**
   *
   * @returns
   */
  resetSearch() {
    this.searchBar && this.searchBar.setValue("");
  }

  /**
   *
   * @param {*} method
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.media.reorder:
        return this.syncAll();

      case SERVICE.media.make_root_dirs:
        return this.iconsList.restart();

      // default:
      //   return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}

module.exports = __window_manager;
