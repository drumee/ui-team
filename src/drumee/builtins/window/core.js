const CHANGE_RADIO = "change:radio";
const MEDIA_GRID = "media_grid";
const MEDIA_ROW = "media_row";
const EOD = "end:of:data";
const __utils = require("./utils");
const TIMERS = {
  reorder: null,
};

const { TweenLite, TimelineMax, TweenMax } = require("@drumee/ui-core/vendor");

const {
  copyToClipboard,
  reverseSortBy,
  modelComparator,
} = require("@drumee/ui-essentials");

class __window_core extends __utils {
  constructor(...args) {
    super(...args);
    this._getKind = this._getKind.bind(this);
    this.removeById = this.removeById.bind(this);
    this.change_size = this.change_size.bind(this);
    this.change_view = this.change_view.bind(this);
    this.reload = this.reload.bind(this);
    this.update_name = this.update_name.bind(this);
    this.loadContent = this.loadContent.bind(this);
    this.buildContent = this.buildContent.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.openContent = this.openContent.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getContentStyle = this.getContentStyle.bind(this);
    this.getCurrentNid = this.getCurrentNid.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.setCurrentApi = this.setCurrentApi.bind(this);
    this.respawn = this.respawn.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this);
    this.syncOrder = this.syncOrder.bind(this);
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    super.initialize(opt);
    this._uid = Visitor.id;
    this._currentApi = {
      name: _a.rank,
      order: _K.order.ascending,
    };
    this.model.set({
      flow: _a.y,
      radio: Env.get("wm-radio"),
    });
    this.model.atLeast({
      service: _e.raise,
    });
    this.acceptMedia = 1;
    const t = this.mget(_a.trigger);
    if (t) {
      if (_.isFunction(t.addPlayer)) {
        t.addPlayer(this);
      }
    }

    if (t != null) {
      if (t.fifo) {
        t.fifo.on("upload:end", this.newContent);
      }
      t.once(_e.trash, () => {
        this.goodbye();
      });
    }
    this.declareHandlers();
    window.addEventListener("beforeunload", (e) => {
      try {
        this.onBeforeDestroy();
      } catch (error) { }
    });
    this.contextmenuSkeleton = require("builtins/contextmenu/skeleton");
    this._raised = 0;
    this._history = {};
  }

  /**
   *
   * @param {*} ui
   * @param {*} event
   */
  contextmenuItems() {
    let items = [];

    if (this.canUpload()) {
      if (Visitor.inDmz) {
        items = [_a.upload];
      } else {
        items = [_a.paste, _a.upload];
        if (Visitor.canServerImpExp()) {
          items = [
            _a.paste,
            _a.upload,
            _a.separator,
            _a.export,
            _a.import,
            _a.separator,
          ];
        }
      }
    } else {
      if (Visitor.canServerImpExp()) {
        items = [_a.exportHidden, _a.importHidden, _a.separator];
      }
    }

    if (this.mget(_a.area) != _a.personal && !Visitor.inDmz) {
      items.push(_a.link);
    }

    if (localStorage.getItem("debugWindowContextmenu")) {
      items = items.concat(
        localStorage.getItem("debugWindowContextmenu").split(/[ ,;:]+/),
      );
    }
    items = items.concat("showHidden");
    return items;
  }

  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off(_e.responsive, this._responsive);
    this.updateBreadcrumb({ event: _e.closed }, this);
  }

  /**
   *
   * @returns
   */
  _getKind() {
    if (this.getViewMode() === _a.row) {
      return MEDIA_ROW;
    }
    return MEDIA_GRID;
  }

  /**
   *
   * Abstrct -- dont remove
   */
  notify() { }

  /**
   *
   * @param {*} cb
   */
  _syncOrder(cb) {
    if (this.iconsList == null || this.iconsList.isDestroyed()) {
      this.iconsList = this.findPart(_a.list);
    }
    if (!this.iconsList || this.iconsList.isDestroyed() || !this.iconsList.collection) {
      return;
    }
    if (this.getViewMode() === _a.row) {
      return;
    }
    if (!(_K.permission.modify & this.mget(_a.privilege))) {
      return;
    }
    const list = [];
    let i = 0;
    for (let m of Array.from(this.iconsList.collection.models)) {
      const nid = m.get(_a.nodeId);
      if (nid == null) {
        continue;
      }
      list.push(nid);
      m.set({
        rank: i,
      });
      i++;
    }
    this.postService(SERVICE.media.reorder, {
      content: list,
      hub_id: this.model.get(_a.hub_id),
    }).then((data) => {
      this.syncAll();
      if (_.isFunction(cb)) {
        cb(data, this);
      }
    });
  }

  /**
   *
   * @param {*} cb
   * @returns
   */
  syncOrder(cb) {
    if (!Visitor.isOnline()) {
      return;
    }
    let timeout = 1500;
    if (TIMERS.reorder) {
      clearTimeout(TIMERS.reorder);
      TIMERS.reorder = setTimeout(() => {
        TIMERS.reorder = null;
        this._syncOrder(cb);
      }, timeout);
      return;
    }
    TIMERS.reorder = setTimeout(() => {
      this._syncOrder(cb);
    }, timeout);
  }

  /**
   *
   * @param {*} w
   * @param {*} type
   * @returns
   */
  restart(w, type) {
    return this.iconsList.restart();
  }

  /**
   *
   * @param {*} id
   * @returns
   */
  removeById(id) {
    if (this.iconsList.isDestroyed()) {
      this.iconsList = this.findPart(_a.list);
    }
    let result = [];
    for (let c of this.iconsList.children.toArray()) {
      if (id === c.model.get(_a.nodeId) || id === c.model.get(_a.id)) {
        result.push(this.iconsList.collection.remove(c.model));
      }
    }
    return result;
  }

  /**
   * Abstrcat method
   */
  setContentSize() { }

  /**
   *
   */
  max_size() {
    const ww = Wm.$el.width();
    const width = ww - (ww % 125) / 2;
    return {
      width: width,
      height: window.innerHeight,
      left: ww / 2 - width / 2,
      top: 20,
    };
  }

  /**
   *
   * @param {*} to
   * @param {*} f
   */
  change_size_to(to, f) {
    if (to.top < 0) to.top = 0;
    if (to.left < 0) to.left = 0;
    if (to.height > window.innerWidth) to.height = window.innerWidth;
    if (to.height > window.innerHeight) to.height = window.innerHeight;
    TweenMax.to(this.$el, 0.5, {
      width: to.width,
      height: to.height,
      left: to.left,
      top: to.top,
      onComplete: f,
    });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} mode
   */
  change_size(cmd, mode) {
    let size;
    this.model.set(_a.value, cmd.get(_a.value));
    const state = cmd.get(_a.state) || mode;
    const anim = {};
    const style = this.style.toJSON();

    if (state === 1) {
      // bigger
      size = this.max_size();

      anim.from = {
        top: style.top,
        left: style.left,
        width: _K.docViewer.width,
        height: _K.docViewer.height,
      };

      anim.to = size;
      this._resize(null, size, anim);
    } else {
      const pos = {
        top: 0,
        left: 0,
      };

      size = {
        width: style.width,
        height: style.height,
      };

      const actualSize = {
        width: this.$el.width() - 32,
        height: this.$el.height() - 32,
      };

      anim.from = {
        top: 0,
        left: 16, //25,
        width: actualSize.width,
        height: actualSize.height,
      };

      anim.to = {
        top: style.top,
        left: style.left,
        width: style.width || this.style.get("minWidth") || _K.docViewer.width,
        height:
          style.height || this.style.get("minHeight") || _K.docViewer.height,
      };
      this._resize(null, _.merge(size, pos), anim);
    }
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  change_view(cmd) {
    if (this.__content == null) {
      return;
    }
    let mode = this.getViewMode();
    if (mode === _a.row) {
      this.setViewMode(_a.icon);
      this.__content.el.dataset.scroll = "y";
      this.__content.feed(require("./skeleton/content/grid")(this));
      this.getPart("view-ctrl").changeState(0);
    } else {
      this.setViewMode(_a.row);
      this.__content.el.dataset.scroll = "x";
      this.__content.feed(require("./skeleton/content/row")(this));
      this.getPart("view-ctrl").changeState(1);
    }
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  reload(cmd) {
    return this.triggerMethod(_e.show);
  }

  /**
   *
   * @param {*} attr
   * @param {*} name
   */
  update_name(attr, name) {
    if (this.name && attr == _a.filename) {
      this.name.mset(_a.content, name);
      this.name.render();
    }
  }

  /**
   *
   * @param {*} target
   * @returns
   */
  toggleState(target) {
    if (target.getAttribute(_a.data.state) === "0") {
      return target.setAttribute(_a.data.state, "1");
    } else {
      return target.setAttribute(_a.data.state, "0");
    }
  }

  /**
   * Load inplace
   * @param {*} media
   * @returns
   */
  openContent(media, args) {
    if (this.isTrash) {
      this.mset(_a.cancel, LOCALE.OK);
      media.wait(0);
      this.confirm(LOCALE.RESTORE_BEFORE_OPEN, "bf1");
      return;
    }
    const fType = media.mget(_a.filetype);
    if (this.mget(_a.kind) == "window_search" || fType != _a.folder) {
      Wm.openContent(media, args);
      return;
    }
    this.updateTopbar(media, args);
    this.loadContent();
    if (super.openContent) super.openContent(media, args);
  }

  /**
   * Load inplace from new internal attributes
   * @returns
   */
  refreshContent(attrs) {
    this.mset(attrs)
    this.loadContent();
    this.updateTopbar(this);
  }

  /**
   * Initial load
   */
  loadContent() {
    this.ensurePart(_a.content).then((p) => {
      if (this.getViewMode() === _a.row) {
        p.el.dataset.scroll = "x";
        p.feed(require("./skeleton/content/row")(this));
      } else {
        p.el.dataset.scroll = "y";
        p.feed(require("./skeleton/content/grid")(this));
      }
    });
  }

  /**
   *
   * @param {*} child
   * @param {*} svc
   */
  buildContent(child, svc) {
    this.__content = child;
    this.setupInteract();
    if (!this._raised) this.raise();

    child.on(_e.show, () => {
      this.loadContent();
      if (this.media && this.media.wait) this.media.wait(0);
    });
  }

  /**
   *
   */
  updateSummary(box) {
    if (Visitor.parseModule().includes(_a.dmz)) {
      // this.getPart("last-update").set({ content: "Metadata not available" })
      return;
    }
    // Skip updateSummary for search window - it doesn't have a valid nid
    // Search window handles count update in its own onPartReady
    if (this.isSearch) {
      return;
    }
    this.fetchService(SERVICE.media.summary, {
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
    })
      .then((response) => {
        // Response structure: { data: { file_count, mtime, ... } }
        const data = response && response.data ? response.data : response;

        // Update items count
        if (data && typeof data.file_count !== "undefined") {
          this.getPart("items-count").set({
            content: LOCALE.X_FILES.format(data.file_count),
          });
        }

        // Update last-update with proper error handling
        if (data && data.mtime) {
          try {
            const timeformat = Visitor.timeformat() || "DD/MM/YYYY HH:mm:ss";
            const mtime = Dayjs.unix(data.mtime);
            if (mtime.isValid()) {
              const formattedTime = mtime.format(timeformat);
              // LOCALE.LAST_CHANGE is "Last change at", so we concatenate it with the time
              this.getPart("last-update").set({
                content: `${LOCALE.LAST_CHANGE} ${formattedTime}`,
              });
            } else {
              this.getPart("last-update").set({ content: "" });
            }
          } catch (e) {
            this.warn("Error formatting last-update:", e);
            this.getPart("last-update").set({ content: "" });
          }
        } else {
          this.getPart("last-update").set({ content: "" });
        }
      })
      .catch((err) => {
        this.warn("Error fetching summary:", err);
        this.getPart("last-update").set({ content: "" });
      });
  }

  /**
   *
   * @param {*} child
   * @param {*} pn
   * @param {*} section
   * @returns
   */
  onPartReady(child, pn, section) {
    const hub_id = this.model.get(_a.hub_id) || this.model.get(_a.holder_id);
    switch (pn) {
      case _a.content:
        this.buildContent(child);
        if (this.model.get("usePid")) {
          this.fetchService({
            service: SERVICE.media.node_info,
            nid: this.getCurrentNid(),
            hub_id,
          });
        }
        break;

      case _a.list:
      case "navigation":
        this.buildIconsList(child, pn);
        break;

      case "nav-wrapper":
        this._navWrapper = child;
        break;

      case "wrapper-dialog":
        this.dialogWrapper = child;
        break;

      case "topbar-name":
        this.title = child;
        break;

      case "ref-window-name":
        this.name = child;
        child.cleanText();
        break;

      case "list-wrapper":
        this._listWrapper = child;
        break;

      case "preview-wrapper":
        this._previewWrapper = child;
        break;

      case "viewport":
        this.viewport = child;
        break;

      case "container-action":
        this.actionContainer = child;
        break;

      case "folder-summary":
        this.updateSummary(child);
        break;
      case "info-wrapper":
        this._infoWrapper = child;
        break;

      case "wrapper-tooltips":
        this.tooltipsWrapper = child;
        break;
    }

    return (child.onChildBubble = this.onChildBubble);
  }

  /**
   *
   * @param {*} o
   * @returns
   */
  onChildBubble(o) {
    if (pointerDragged) {
      return;
    }
    if (o != null) {
      switch (o.status) {
        case _e.data:
          return;
        case EOD:
          this.unselect();
          break;
      }
    }
    if (!pointerDragged) {
      this.triggerMethod(CHANGE_RADIO);
      this.updateBreadcrumb({ ...this.model.toJSON(), event: _e.raised }, this);
    }
    this._raised = 1;
  }


  /**
   *
   * @param {*} m
   */
  updateTopbar(m) {
    if (m) {
      this.copyPropertiesFrom(m);
      this.updateBreadcrumb({ ...m.model.toJSON(), event: _a.browse }, this);
    }
    // Empty-filename root nodes take their name from hub_name. Recompute in the
    // recheck below so a late-resolved name isn't reverted by a stale value.
    const nameOf = () =>
      this.get(_a.filename) || (m && m.get(_a.filename)) || this.get("hub_name") || "";
    const folderName = nameOf();
    if (this.__refWindowName != null) {
      this.__refWindowName.set({ content: folderName });
      /** FIX ME: sometime new value is not updated */
      setTimeout(() => {
        const latest = nameOf();
        if (this.__refWindowName.mget(_a.content) != latest) {
          this.__refWindowName.set({ content: latest });
        }
      }, 1000);
    }
  }

  /**
   * Load content of the provided node
   * @param {*} node
   * @param {*} moving
   * @returns
   */
  openNode(node, args) {
    let {
      area,
      ext,
      filename,
      filepath,
      filetype,
      home_id,
      hub_id,
      md5Hash,
      nid,
      ownpath,
      pid,
    } = node.model.toJSON();
    this.mset({
      area,
      ext,
      filename,
      filepath,
      filetype,
      home_id,
      hub_id,
      md5Hash,
      nid,
      ownpath,
      pid,
    });
    this.ensurePart(_a.list).then((l) => {
      l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
      l.restart();
    });
    this.__refWindowName.set({ content: filename });
  }

  /**
   *
   */
  sortContent(cmd) {
    if (!this.iconsList || this.iconsList.isDestroyed() || !this.iconsList.collection) {
      return;
    }
    let order, name;
    if (cmd) {
      name = cmd.model.get(_a.name);
      order = cmd.model.get(_a.state) ? "asc" : "desc";
    } else {
      name = _a.filename;
      order = "asc";
    }
    const baseCmp = modelComparator(name);
    const cmp = (model) => {
      const v = model.get(name);
      if (v == null || v === "") return "";
      return baseCmp(model);
    };
    switch (name) {
      case _a.filesize:
      case _a.mtime:
      case _a.filename:
      case _a.ext:
        if (/^desc/.test(order)) {
          this.iconsList.collection.comparator = reverseSortBy(cmp);
        } else {
          this.iconsList.collection.comparator = cmp;
        }
        this.iconsList.collection.sort();
        break;
      default:
        this.warn("[729] - Unexpected name", name);
        return;
    }
  }

  /**
   *
   */

  newDocument(cmd) {
    // Resolve the editor namespace dynamically from `doc_editor`
    // sysconf (the viewer at player/document/index.js does the same).
    // Hard-coding SERVICE.onlyoffice fails on endpoints where the
    // plugin uses a different name or isn't loaded.
    const editor = Platform && Platform.get && Platform.get("doc_editor");
    const ns = editor && SERVICE && SERVICE[editor];
    const service = ns && (ns.new_doc || ns.create || ns.create_doc);

    if (!service) {
      Wm.alert(
        LOCALE.FEATURE_NOT_AVAILABLE
        || "Document editor is not configured on this endpoint."
      );
      return;
    }

    const aw = Wm.getActiveWindow() || this;
    const { nid, hub_id } = aw.getCurrentApi();
    const name = cmd && cmd.mget && cmd.mget(_a.name);

    // Immediate feedback: the add-menu closes on click and, until the tile
    // used to land via the media.new WS broadcast, nothing at all rendered —
    // on a slow round-trip the flow looked dead for many seconds.
    aw.spinner(1, 20000);
    this.postService(service, { nid, hub_id, name })
      .then((data) => {
        aw.spinner(0);
        if (!data || !data.nid) {
          Wm.alert(LOCALE.ERROR_NETWORK);
          return;
        }
        // Open the editor straight from the response (like the DMZ
        // file-share branch) instead of gating it behind the media.new
        // broadcast + a 500ms poll: a delayed or dropped broadcast used to
        // dead-end the whole flow silently after 30s.
        const openDirect = () =>
          Wm.fetchMediaAttributes({
            nid: data.nid,
            hub_id: data.hub_id || hub_id,
            mode: _a.edit,
          });
        // Prefer the grid tile when the broadcast already delivered it —
        // opening through the tile keeps its state wiring (seen/spinner).
        const opened = { done: 0 };
        const openFromTile = () => {
          for (let media of aw.getItemsByAttr(_a.nid, data.nid)) {
            if (/^media/.test(media.mget(_a.kind))) {
              opened.done = 1;
              media.wait(1);
              this.openContent(media, { service: "open-node", mode: _a.edit });
              return true;
            }
          }
          return false;
        };
        if (openFromTile()) return;
        const timer = setInterval(() => {
          if (openFromTile()) clearInterval(timer);
        }, 500);
        // The tile normally lands within a couple of WS round-trips; if it
        // hasn't after 4s, stop waiting and open from the response directly.
        setTimeout(() => {
          clearInterval(timer);
          if (!opened.done) {
            opened.done = 1;
            openDirect();
          }
        }, 4000);
      })
      .catch((e) => {
        aw.spinner(0);
        this.warn("newDocument: server error", e);
        Wm.alert(LOCALE.ERROR_NETWORK);
        if (this.onServerError) this.onServerError(e);
      });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    // if (!args.no_raise) this.raise(cmd);
    switch (service) {
      case _e.close: {
        const source = this.mget(_a.source);
        if (source && source.el && source.el.dataset) {
          source.el.dataset.isActive = _a.off;
        }
        return this.goodbye();
      }

      case _e.rename:
        return noOperation();

      case _e.download:
        return this.postService({
          service: SERVICE.media.download,
          socket_id: Visitor.get(_a.socket_id),
          list: [
            {
              nid: this.mget(_a.nid),
              hub_id: this.mget(_a.hub_id),
            },
          ],
        });

      case "close-dialog":
        this.closeDialog();
        break;

      case "media-uploaded":
        this.resetShift();
        break;

      case _e.sort:
        return this.sortContent(cmd);

      case "show-navigation":
        return this.showNavigation();

      case "open-creator":
        return this.openCreator(cmd);

      case "open-node":
        return this.openContent(cmd, args);

      case "change-view":
        return this.change_view(cmd);

      case "new-media":
      case "new-messages":
        var o = _.merge(args, cmd._args);
        return Wm.launch(o);

      case _a.link:
        return this.viewerLink().then((url) => {
          setTimeout(async () => {
            await copyToClipboard(url);
            this.acknowledge();
          }, 0);
        });

      case "fullscreen":
        // Scope to THIS window's element. document.fullscreenElement is truthy
        // for ANY element in fullscreen, so the bare check would exit whatever
        // other window/video is fullscreen instead of toggling this one.
        if (document.fullscreenElement === this.el) {
          this._fullscreen = false;
          this.el.onfullscreenchange = null;
          document.exitFullscreen();
        } else {
          this._fullscreen = true;
          // Capture pre-fullscreen geometry and restore it on exit. The WM's
          // resize handler overwrites this.style with viewport-sized values
          // while fullscreen, so without this the window stays maximized after
          // leaving fullscreen (via the button or ESC).
          this.currentSize = {
            width: this.$el.width(),
            height: this.$el.height(),
          };
          this.size = this.currentSize;
          const restore = { ...this.currentSize, ...this.$el.position() };
          this.el.onfullscreenchange = () => {
            if (document.fullscreenElement === this.el) return;
            this.el.onfullscreenchange = null;
            _.delay(() => this.change_size_to(restore), 50);
          };
          this.el.requestFullscreen();
        }
        if (this.__ctrlFullscreen && this.__ctrlFullscreen.setState) {
          this.__ctrlFullscreen.setState(this._fullscreen ? 1 : 0);
        }
        return;

      case _e.minimize:
        this.minimize(cmd);
        return;

      case "change-size":
        if (this._fullscreen) {
          this.el.onfullscreenchange = null;
          this.__ctrlFullscreen.setState(0);
          document.exitFullscreen();
        } else {
          this.change_size(cmd);
        }
        this._fullscreen = false;
        return;

      case _e.select:
        this.service = _e.select;
        this.status = _a.idle;
        return this.triggerHandlers(args, cmd);

      case _a.properties:
        return this.triggerHandlers({ service, trigger: args.trigger });

      case _e.paste:
        return this.pasteMedia();

      case _e.upload:
        return Wm.handleUpload();
      case "show-hidden-files":
        localStorage.setItem("showHidden", "yes");
        this.iconsList.model.unset("skip");
        this.iconsList.restart();
        break;
      case "hide-hidden-files":
        localStorage.removeItem("showHidden");
        this.iconsList.model.set({ skip: { filename: /^\./ } });
        this.iconsList.restart();
        break;
      case "export-to-server":
      case "import-from-server":
        Wm.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this.media,
          },
          { explicit: 1, singleton: 1 },
        );
        return this.debug("import export", cmd, this);
      case "filter-by-type":
        this.ensurePart(_a.list).then((l) => {
          l.setApi(this.getCurrentApi(cmd.options.value));
          l.restart();
        });
        return;

      // "+ Add new" dropdown in window topbars (folder / team / sharebox).
      // Routes via Wm.launch({ explicit: 1 }) so Kind.waitFor resolves
      // the lazy-loaded bundle before mounting.
      case "add-folder":
        Kind.waitFor("folder_form").then(() => {
          if (Wm && Wm.__wrapperModal) {
            Wm.__wrapperModal.feed({
              kind: "folder_form",
              hub_id: this.mget(_a.hub_id),
              nid: this.getCurrentNid(),
            });
          }
        });
        return;

      case "add-note":
        // No opt.media — that branch in editor_markdown.onDomRefresh is
        // for opening an existing file. New-note path uses getCurrentMedia()
        // which reads from `this.target = Wm.getActiveWindow()`.
        return Wm.launch(
          { kind: "editor_markdown", uiHandler: [this] },
          { explicit: 1 }
        );

      case "new-document":
        return this.newDocument(cmd);

      default:
        if (lastClick.shiftKey || lastClick.altKey || lastClick.ctrlKey) {
          this.viewerLink().then((url) => {
            setTimeout(async () => {
              await copyToClipboard(url);
              Wm.acknowledge();
            }, 0);
          });
        }
        break;
    }
  }

  // **********************************************************
  //                   BROWSING SECTION                       #
  // **********************************************************

  /**
   *
   * @param {*} offset
   * @param {*} refresh
   * @returns
   */
  getContentStyle(offset, refresh) {
    if (refresh) {
      this.size.width = this.$el.width();
      this.size.height = this.$el.height();
    }
    offset = offset || 84;
    const r = {
      width: this.size.width,
      height: this.size.height - offset, // 80
    };
    return r;
  }

  /**
   *
   * @returns
   */
  getCurrentNid() {
    const p = this.mget(_a.nodeId);
    if (p == null || p == 0 || p == "*") {
      return this.model.get(_a.actual_home_id) || this.model.get(_a.home_id);
    }
    return p;
  }

  /**
   *
   * @param {*} type
   * @returns
   */
  getCurrentApi(type) {
    let api;
    const { nid, hub_id } = this.actualNode();
    // When called without an explicit type (the list's dynamic api function),
    // honor any active file-type filter so loadContent()/restart keeps the
    // current Docs/PDF/Images view while still reading the live nid. Replacing
    // the list api with a static object instead would freeze navigation.
    const f = type != null ? type : this._filterType;
    switch (f) {
      case "all":
      case "docs":
      case "pdf":
      case "image":
      case "other":
        api = {
          service: SERVICE.media.show_node_by,
          page: 1,
          type: f,
          order: _K.order.descending,
          hub_id,
          nid,
        };
        break;

      case _a.image:
      case _a.video:
      case _a.audio:
      case _a.document:
        api = {
          service: SERVICE.media.show_node_by,
          page: 1,
          type: f,
          order: _K.order.descending,
          hub_id,
          nid,
        };
        break;
      case _a.folder:
        api = {
          service: SERVICE.media.show_folders,
          page: 1,
          hub_id,
        };
        break;
      default:
        api = {
          service: SERVICE.media.show_node_by,
          page: 1,
          nid,
          sort: this._currentApi.name,
          order: this._currentApi.order,
          hub_id,
          usePid: this.model.get("usePid"),
        };
    }
    if (this.mget(_a.token)) {
      api.token = this.mget(_a.token);
    } else if (Wm.mget(_a.token)) {
      api.token = Wm.mget(_a.token);
    }
    return api;
  }

  /**
   *
   * @param {*} opt
   * @returns
   */
  setCurrentApi(opt) {
    if (opt) {
      return (this._currentApi = _.merge(this._currentApi, opt));
    }
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  respawn(args) {
    if (args.nid === args.pid) {
      return;
    }
    args.service = SERVICE.media.get_node_attr;
    this.postService(args, { async: 1 }).then((media) => {
      media.kind = this._getKind();
      media.phase = "notify";
      media.logicalParent = this;
      media.pid = this.getCurrentNid();
      this.insertMedia([media], 0);
      this.syncBounds();
    });
  }

  /**
   *
   * @param {*} xhr
   * @returns
   */
  onServerComplain(xhr) {
    const { error_code, error } = xhr;
    this.warn("[1020] GOT SERVER COMPLAINS", xhr);
    if (/.+exceeded$/.test(error) || error_code == 402) {
      Butler.upgrade().then(() => {
        this.goodbye();
      });
      return;
    }
  }

  /**
   *
   * @param {*} method
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  // __dispatchRest(method, data, socket) {
  //   switch (method) {

  //     case SERVICE.media.node_info:
  //       return (location.hash = `#/desk/browser/${data.pid}/${data.hub_id}`);

  //     default:
  //       return this.warn(WARNING.method.unprocessed.format(method), data);
  //   }
  // }
}
module.exports = __window_core;
