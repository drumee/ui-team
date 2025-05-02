const CHANGE_RADIO = "change:radio";
const MEDIA_GRID = "media_grid";
const MEDIA_ROW = "media_row";
const EOD = "end:of:data";
const __utils = require("./utils.electron");
const TIMERS = {
  reorder: null
}
const { TweenMax } = require("gsap/all");
const { copyToClipboard, reverseSortBy, modelComparator } = require("core/utils")


class __window_core extends __utils {
  constructor(...args) {
    super(...args);
    this._getKind = this._getKind.bind(this);
    this.removeById = this.removeById.bind(this);
    this.change_size = this.change_size.bind(this);
    this.change_view = this.change_view.bind(this);
    this.reload = this.reload.bind(this);
    this.update_name = this.update_name.bind(this);
    this.fetchContent = this.fetchContent.bind(this);
    this.buildContent = this.buildContent.bind(this);
    this.getFilePath = this.getFilePath.bind(this);
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
    this.__dispatchRest = this.__dispatchRest.bind(this);
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
    this.mset(_a.flow, _a.y);
    this.model.set({
      radio: Env.get("wm-radio"),
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
        localStorage.getItem("debugWindowContextmenu").split(/[ ,;:]+/)
      );
    }

    return items;
  }


  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off(_e.responsive, this._responsive);
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
    if(this.getViewMode() === _a.row){
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
   * 
   */
  fetchContent() {
    this.ensurePart(_a.content).then((p) => {
      if (this.getViewMode() === _a.row) {
        this.__content.el.dataset.scroll = "x";
        p.feed(require("./skeleton/content/row")(this));
      } else {
        this.__content.el.dataset.scroll = "y";
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
    this.raise();
    child.on(_e.show, () => {
      this.fetchContent();
      this._path = this.buildHistory();
      if (this.media) this.media.wait(0);
    });
  }

  /**
   * 
   * @returns 
   */
  getFilePath() {
    let p = "/";
    this.__breadcrumbsContainer.children.each(
      (c) => (p = `${p}/${c.mget(_a.filename)}`)
    );
    return p;
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
        this.raise();
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

      case "breadcrumbs":
        this.breadcrumbs = child;
        break;

      case "breadcrumbs-roll":
        this.breadcrumbsRoll = child;
        child.collection.on(_e.remove, () => {
          if (child.collection.length === 0) {
            this.__breadcrumbsContainer.setState(0);
          }

          if (child.collection.length) {
            return this.__breadcrumbsContainer.setState(1);
          }
        });
        this.trigger("breadcrumbs-roll-ready");
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
   * @param {*} menu 
   * @returns 
   */
  adjustBreadcrumbs(menu) {
    return this.breadcrumbsRoll;
  }

  /**
   * 
   * @param {*} o 
   * @returns 
   */
  onChildBubble(o) {
    if (mouseDragged) {
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

    if (!mouseDragged) {
      this.triggerMethod(CHANGE_RADIO);
    }
  }

  /**
   * 
   * @param {*} list 
   */
  buildBreadcrumbs(data = []) {
    let items = [];
    for (let item of data) {
      items.push(require("./skeleton/topbar/breadcrumbs-item")(this, item));
    }
    this.breadcrumbsRoll.feed(items);
    this.breadcrumbsRoll.el.show();
    this._path = data;
    if (this.breadcrumbsRoll.collection.length < 2) {
      this.__breadcrumbsContainer.el.hide();
      if (this.actionContainer != null) {
        this.actionContainer.el.dataset.state = 0;
      }
    } else {
      this.__breadcrumbsContainer.el.show();
      if (this.actionContainer != null) {
        this.actionContainer.el.dataset.state = 1;
      }
      this.__breadcrumbsPrevious.el.show();
    }
    const last = this.breadcrumbsRoll.children.last();
    if (last && this.name) {
      const fileName = last.mget(_a.filename) || "";
      if (fileName) {
        this.name.set({ content: fileName });
      }
    }
  }

  /**
   * 
   * @param {*} trigger 
   */
  buildHistory(trigger) {
    let t = trigger || this.media || this;
    const {
      ext,
      filename,
      actual_home_id: home_id,
      hub_id,
      nid,
      filetype,
      filepath,
      area,
      pid,
      ownpath,
      md5Hash,
    } = t.model.toJSON();
    if (!filepath) return [];
    let length = filepath.length;
    this._history[filepath] = {
      ext,
      filename,
      home_id,
      hub_id,
      nid,
      filetype,
      filepath,
      area,
      pid,
      length,
      ownpath,
      md5Hash,
    }
    function compare(a, b) {
      if (a.length < b.length) {
        return -1;
      }
      if (a.length > b.length) {
        return 1;
      }
      return 0;
    }
    let values = _.values(this._history).sort(compare);
    return values;
  }


  /**
   *
   * @param {*} m
   */
  updateTopbar(m, previous = 0) {
    let data = [];
    if(this.isTrash) return;
    this.copyPropertiesFrom(m);
    if (m.isMfs || m.isFolder) {
      data = this.buildHistory(m);
    } else {
      if (previous) {
        this._path.pop();
        data = this._path;
      } else {
        data = [];
        let index = 0;
        for (let p of this._path) {
          if (index <= m.getIndex()) {
            data.push(p)
          }
          index++;
        }
      }
    }
    this._history = {}
    for (let row of data) {
      this._history[row.filepath] = row;
    }
    const folderName = this.get(_a.filename) || m.get(_a.filename);
    if (this.__windowHeader) {
      if (data.length > 1) {
        this.__windowHeader.el.dataset.content = _a.folder;
        this.el.dataset.content = _a.folder;
      } else {
        this.__windowHeader.el.dataset.content = _a.root;
        this.el.dataset.content = _a.root;
      }
    }
    if (this.__refWindowName != null) {
      this.__refWindowName.set({ content: folderName });
      /** FIX ME: sometime new value is not updated */
      setTimeout(() => {
        if (this.__refWindowName.mget(_a.content) != folderName) {
          this.__refWindowName.set({ content: folderName });
        }
      }, 1000)
    }
    this.buildBreadcrumbs(data);
  }

  /**
   * 
   * @param {*} media 
   * @returns 
   */
  openContent(media, previous) {
    if(this.isTrash){
      this.mset(_a.cancel, LOCALE.OK);
      media.wait(0);
      this.confirm(LOCALE.RESTORE_BEFORE_OPEN, "bf1");
      return;
    }
    const fType = media.mget(_a.filetype);
    if (this.mget(_a.kind) == "window_search" || fType != _a.folder) {
      Wm.openContent(media);
      return;
    }
    this.updateTopbar(media, previous);
    if (this.getViewMode() === _a.row) {
      this.__content.feed(require("./skeleton/content/row")(this));
    } else {
      this.__content.feed(require("./skeleton/content/grid")(this));
    }
    if (super.openContent) super.openContent(media);
  }

  /**
   * 
   */
  sortContent(cmd) {
    let order, name;
    if(cmd){
      name = cmd.model.get(_a.name);
      order = cmd.model.get(_a.state) ? "asc" : "desc";  
    }else{
      name = _a.filename;
      order = "asc";
    }
    let cmp = modelComparator(name);
    switch (name) {
      case _a.filesize:
      case _a.mtime:
      case _a.filename:
      case _a.ext:
        if (/^desc/.test(order)) {
          this.iconsList.collection.comparator = reverseSortBy(cmp);
        }else{
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
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    if (!args.no_raise) this.raise(cmd);
    switch (service) {
      case _e.close:
        if (this.mget(_a.source)) {
          this.mget(_a.source).el.dataset.isActive = _a.off;
        }
        return this.goodbye();

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

      case "previous":
        let menu = this.breadcrumbsRoll;
        let last = menu.children.last();
        if (!last || menu.collection.length < 2) {
          this.__breadcrumbsContainer.el.hide();
          return;
        }
        let item = menu.children.findByIndex(menu.collection.length - 2);
        return this.openContent(item, 1);

      case "show-navigation":
        return this.showNavigation();

      case "open-creator":
        return this.openCreator(cmd);

      case "open-node":
        return this.openContent(cmd);

      case "change-view":
        return this.change_view(cmd);

      case "new-media":
      case "new-messages":
        var o = _.merge(args, cmd._args);
        return Wm.launch(o);

      case _a.link:
        return this.viewerLink().then((url) => {
          copyToClipboard(url);
          this.acknowledge();
        });

      case "fullscreen":
        if (cmd.get(_a.state)) {
          this._fullscreen = true;
          this.currentSize = {
            width: this.$el.width(),
            height: this.$el.height(),
          };
          this.size = this.currentSize;
          let p = this.$el.position();
          let opt = { ...this.currentSize, ...p };
          this.el.requestFullscreen();
          this.el.onfullscreenchange = () => {
            _.delay(() => {
              this.change_size_to(opt);
            }, 500);
          };
        } else {
          this._fullscreen = false;
          this.el.onfullscreenchange = null;
          document.exitFullscreen();
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

      case "export-to-server":
      case "import-from-server":
        Wm.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this.media,
          },
          { explicit: 1, singleton: 1 }
        );
        return this.debug("import export", cmd, this);

      default:
        if (lastClick.shiftKey || lastClick.altKey || lastClick.ctrlKey) {
          copyToClipboard(this.viewerLink());
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
    const f = type || this._curFilter;
    switch (f) {
      case _a.image:
      case _a.video:
      case _a.audio:
      case _a.document:
        api = {
          service: SERVICE.media.get_all,
          page: 1,
          type: f,
          order: _K.order.descending,
          hub_id,
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
    this.warn("[1020] GOT SERVER COMPLAINS", xhr)
    if (/.+exceeded$/.test(error) || error_code == 402) {
      Butler.upgrade().then(() => {
        this.goodbye();
      })
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
  __dispatchRest(method, data, socket) {
    switch (method) {

      case SERVICE.media.node_info:
        return (location.hash = `#/desk/browser/${data.pid}/${data.hub_id}`);

      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}
module.exports = __window_core;

