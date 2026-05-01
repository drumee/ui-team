const mfsInteract = require("../interact");

const { folderFilesView, folderChatView, fileTypeFilterBar, gridFilesBrowser } = require("../skeleton/toolkit");

require("./skin");

class __window_folder extends mfsInteract {

  constructor(...args) {
    super(...args);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onSearchEvent = this.onSearchEvent.bind(this);
  }

  /**
   * @param {*} opt
   */
  initialize(opt) {
    this.isFolder = 1;
    super.initialize(opt);
    this._path = [];

    this._flow = _a.horizontal;
    this.model.atLeast({
      value: _a.normal,
    });

    if (this.model.get(_a.hub_id) !== Visitor.id) {
      this.model.set({
        filetype: _a.hub,
      });
    }
    this.style.set({
      width: this.size.width,
      height: this.size.height,
    });
    this.skeleton = require("./skeleton")(this);
    if (this.mget(_a.trigger) && this.mget(_a.privilege) == null) {
      this.mset({
        privilege: this.mget(_a.trigger).mget(_a.privilege),
      });
    }
  }

  buildContent(child) {
    this.__content = child;
    this.setupInteract();
    if (!this._raised) this.raise();
    if (this.media && this.media.wait) this.media.wait(0);
    // Honor the launch-time `activeTab` option (e.g. opened from the
    // sidebar live-meeting badge with activeTab: "meeting").
    const initialTab = this.mget("activeTab");
    if (initialTab && initialTab !== "files") {
      this.ensurePart("folder-view").then(() => this.showFolderTab(initialTab));
    }
  }

  loadContent() {
    this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      l.restart();
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._prepareListPartition(l);
      }
    });
  }

  /**
   * Folder window renders one smart list, then partitions its DOM into
   * workspace/folder/file sections. Base _insertMedia is kept except it must
   * target this list and re-run partitioning after pseudo/live inserts.
   */
  _insertMedia(m, position) {
    let opt;
    if (position == null || _.isNaN(position)) position = 0;
    if (m.model != null) {
      opt = this.makeOptions(m);
      if (opt == null) return false;
    } else {
      opt = m;
    }
    if (_.isEmpty(opt)) return;
    if (opt.isAttachment) delete opt.isAttachment;
    opt.logicalParent = this;
    if (this.captured && this.captured.over && opt.phase === _a.upload) {
      return;
    }

    if (opt.phase === _a.upload && opt.file && typeof RADIO_MEDIA !== 'undefined') {
      let destination = opt.destination;
      if (!destination && typeof this._getDestination === 'function') {
        destination = this._getDestination();
      }
      RADIO_MEDIA.trigger("upload:start", {
        file: opt.file,
        fileName: opt.file.name || opt.filename,
        fileSize: opt.file.size || opt.size || 0,
        destination,
        position,
        opt,
      });
    }

    this.ensurePart(_a.list).then((list) => {
      if (!list || (list.isDestroyed && list.isDestroyed())) return;
      switch (position) {
        case -1:
          list.prepend(opt);
          break;
        case 0:
          list.append(opt);
          break;
        default:
          if (list.collection) list.collection.add(opt, { at: position });
          else list.append(opt);
      }
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._partitionFoldersAndFiles(list);
      }
    });
  }

  /**
   * Live-append handler. Base `__window_mfs.newContent` writes into
   * `this.iconsList`, which is never set in partition mode. Dispatch by
   * filetype into the matching partition list so peer WS events render.
   */
  newContent(xhr, options = {}) {
    const { data } = xhr || {};
    if (!data) return;
    const { nid, pid } = data;
    const { echoId } = options || {};
    if (this.updateInnerHubsPreview) this.updateInnerHubsPreview(data);
    if (echoId === this.mget('echoId')) return;
    if (this.mget(_a.nid) != pid) return;

    // Dedup: if the item is already rendered, refresh in place.
    const existing = this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(data);
      if (c.restart) setTimeout(() => c.restart(), 500);
      return true;
    });
    if (existing.length) return;

    data.format = this.mget(_a.format) || _a.card;
    data.kind = this._getKind();
    data.service = 'open-node';
    this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      if (data.position >= 0) l.append(data, data.position);
      else l.append(data);
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._partitionFoldersAndFiles(l);
      }
    });
    if (this.syncBounds) this.syncBounds();
  }

  onPartReady(child, pn) {
    if (pn === _a.list) {
      this.iconsList = child;
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._prepareListPartition(child);
      }
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  onChildBubble(c) {
    if (c != null && c.logicalParent === this && c.service === _e.select) {
      return;
    }
    super.onChildBubble(c);
    if (_.isEmpty(Wm.clipboard)) {
      return this.unselect();
    }
  }

  toggleFilesLayout(cmd) {
    const mode = this.getViewMode && this.getViewMode() === _a.row ? _a.icon : _a.row;
    this.setViewMode(mode);
    this.ensurePart(_a.content).then((content) => {
      if (!content || (content.isDestroyed && content.isDestroyed())) return;
      if (mode === _a.row) {
        content.feed(require("../skeleton/content/row")(this));
        cmd?.changeState?.(1);
        return;
      }
      content.feed([fileTypeFilterBar(this), gridFilesBrowser(this)]);
      cmd?.changeState?.(0);
    });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case _a.info:
        return this.showInfo();

      case _e.download:
        return this.mget(_a.trigger).download();

      case _e.settings:
        return this.switchShowFolderSettings(cmd);

      case "add-folder":
        return this.openCreateFolderDialog();

      case "add-note":
        return Wm.windowsLayer.append({ kind: "editor_markdown", uiHandler: [this] });

      case "new-document":
        return this.newDocument(cmd);

      case "create-folder-submit":
        return this.createFolderFromDialog(cmd);

      case "close-folder-dialog":
        this.isShowSettings = false;
        return this.dialogWrapper.clear();

      case "open-advanced-settings":
        return this.openAdvancedSettings(cmd);

      case "folder-rename":
        this.dialogWrapper.clear();
        return this.mget(_a.trigger)?.rename?.();

      case "folder-organize":
        this.dialogWrapper.clear();
        return this.warn(LOCALE.NOT_YET_IMPLEMENTED);

      case "folder-duplicate":
        this.dialogWrapper.clear();
        return this.mget(_a.trigger)?.triggerHandlers?.({ service: _a.duplicate });

      case "folder-delete":
        this.dialogWrapper.clear();
        return this.mget(_a.trigger)?.delete?.();

      case "tab-files":
        return this.showFolderTab("files");

      case "tab-chat":
        return this.showFolderTab(_a.chat);

      case "tab-task":
        return this.showFolderTab(_a.task);

      case "tab-meeting":
        return this.showFolderTab("meeting");

      case "toggle-files-layout":
        return this.toggleFilesLayout(cmd);

      case "leave-meeting":
        return this.showFolderTab("files");

      case "meeting":
      case "webinar":
      case "channel":
        return Wm.launch({
          kind: `window_${service}`,
          hub_id: this.mget(_a.hub_id),
          filename: this.mget(_a.filename),
          nid: this.mget(_a.actual_home_id) || this.mget(_a.nid),
          trigger: this.mget(_a.media) || this,
          media: this.mget(_a.media) || this,
          service,
          wm_unique_id: `window_${service}-${this.mget(_a.hub_id)}`,
        }, { explicit: 1, singleton: 1 });

      case "remove-selection":
        return Wm.removeMediaSelection(cmd);

      default:
        super.onUiEvent(cmd, args);
    }
  }

  openCreateFolderDialog() {
    return this.ensurePart("wrapper-dialog").then((wrapper) => {
      this.dialogWrapper = wrapper;
      wrapper.feed(require("./skeleton/create-folder-dialog")(this));
      return this.ensurePart("create-folder-name").then((entry) => entry.focus && entry.focus());
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
      return Wm.alert(LOCALE.INVALID_FILENAME);
    }

    const { nid, hub_id } = this.actualNode();
    const args = {
      hub_id,
      dirname: filename,
      filename,
      nid,
      notify: 1,
      socket_id: Visitor.get(_a.socket_id),
      seeding: 1,
      area: this.mget(_a.area),
    };

    const service = [_a.public, _a.share, _a.private].includes(this.mget(_a.area))
      ? SERVICE.desk.create_hub
      : SERVICE.media.make_dir;

    if (service === SERVICE.desk.create_hub) {
      args.pid = args.nid;
    }

    return this.postService(service, args)
      .then((data) => {
        if (data && data.error) {
          Wm.alert(LOCALE[data.error] || data.error);
          return;
        }
        this.dialogWrapper.clear();
        if (data) {
          data.kind = this._getKind();
          data.service = "open-node";
          data.uiHandler = [this];
          this.addMedia(data);
        }
      })
      .catch((e) => {
        this.warn("Failed to create folder", e);
        Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._creatingFolder = 0;
      });
  }

  /**
   * Switch the split body between Files / Chat / Task tabs. Re-feeds
   * the `folder-view` part with the appropriate skeleton subtree so the
   * task tab mounts the `tasks_panel` widget (hub-scoped), and the chat
   * tab a full-width chat panel.
   */
  showFolderTab(tab) {
    this.activeTab = tab;
    this.$el.find(".window-folder__tab-bar-item").attr("data-state", 0);
    this.$el.find(`.window-folder__tab-bar-item[data-tab='${tab}']`).attr("data-state", 1);

    return this.ensurePart("folder-view").then((view) => {
      view.el.dataset.view = tab;
      switch (tab) {
        case "files":
          return view.feed(folderFilesView(this));
        case _a.chat:
          return view.feed(folderChatView(this));
        case "meeting":
          return view.feed(require("./skeleton/meeting-panel")(this));
        case _a.task:
          return view.feed({
            kind: "tasks_panel",
            hub_id: this.mget(_a.hub_id),
            nid: this.mget(_a.nid),
            uiHandler: [this],
          });
        default:
          return view.feed(folderFilesView(this));
      }
    });
  }

  openAdvancedSettings(cmd) {
    this.isShowSettings = false;
    this.dialogWrapper.clear();
    this.dialogWrapper.feed({
      kind: "settings_hub",
      label: this.settingsLabel,
      className: "",
      uiHandler: [this],
      media: this.mget(_a.media),
      hub_id: this.mget(_a.hub_id),
      source: this,
      persistence: _a.once,
    });
  }

  /**
   * Toggle folder settings panel.
   */
  switchShowFolderSettings(cmd) {
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.dialogWrapper.clear();
    }
    this.isShowSettings = true;
    this.dialogWrapper.feed(require("./skeleton/settings-action-panel")(this));
    var c = this.dialogWrapper.children.last();
    c.once(_e.destroy, () => {
      this.isShowSettings = false;
      return this.unselect();
    });
    return c.on(_e.show, () => {
      return this.once(_e.unselect, () => {
        return this.dialogWrapper.clear();
      });
    });
  }

  showInfo() {
    const state = this.__wrapperInfo.el.dataset.state;
    if (state === _a.closed) {
      return this.fetchService(SERVICE.media.info, {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
      })
        .then((data) => {
          this.__wrapperInfo.feed(require("./skeleton/info")(this, data));
        })
        .catch((e) => {
          this.warn(e);
          this.__wrapperInfo.feed(require("./skeleton/no-info")(this));
        });
    } else {
      this.__wrapperInfo.clear();
    }
  }

  // Events from search box
  onSearchEvent(service, data) {
    const list = this.getPart(_a.list);
    if (service === "clear") {
      list.collection.set(this._backup);
      return;
    }
    if (!_.isArray(data) || data.length === 0) {
      return;
    }
    if (this._backup == null) {
      this._backup = _.map(list.collection.models, (model) => {
        const r = _.clone(model.toJSON());
        return r;
      });
    }
    const found = _.map(data, (item) => {
      const ext = {
        kind: KIND.media.helper,
        signal: _e.ui.event,
        service: "open-node",
        uiHandler: [this],
      };
      return { ...item, ...ext };
    });
    list.collection.set(found);
  }
}

module.exports = __window_folder;
