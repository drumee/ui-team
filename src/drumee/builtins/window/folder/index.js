const mfsInteract = require("../interact");

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

  onChildBubble(c) {
    if (c != null && c.logicalParent === this && c.service === _e.select) {
      return;
    }
    super.onChildBubble(c);
    if (_.isEmpty(Wm.clipboard)) {
      return this.unselect();
    }
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
    this.dialogWrapper.feed(require("./skeleton/create-folder-dialog")(this));
    this.ensurePart("create-folder-name").then((entry) => entry.focus && entry.focus());
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
   * Switch the split body between Files / Chat / Tasks tabs. CSS rules
   * under [data-active-tab] in window/skin/group/body/main.scss hide
   * the inactive panels.
   *
   * Uses setAttribute (not el.dataset.activeTab) so the runtime attr
   * name matches the kebab-case attr emitted by the skeleton's initial
   * render — the framework writes `data-${k}` literally.
   */
  showFolderTab(tab) {
    this.activeTab = tab;
    const body = this.getPart && this.getPart("split-body");
    if (body && body.el) body.el.setAttribute("data-active-tab", tab);
    const chatPanel = this.getPart && this.getPart("chat-panel");
    if (chatPanel && chatPanel.el) {
      chatPanel.el.dataset.active = tab === _a.chat ? "1" : "0";
    }
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
