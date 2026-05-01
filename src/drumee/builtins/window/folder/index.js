const mfsInteract = require("../interact");

const { folderFilesView, fileTypeFilterBar, gridFilesBrowser } = require("../skeleton/toolkit");

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
    const { nid, pid, args, src } = data;
    const { echoId } = options || {};
    if (this.updateInnerHubsPreview) this.updateInnerHubsPreview(data);
    if (echoId === this.mget('echoId')) return;
    if (this.mget(_a.nid) != pid) return;

    // Skip WS update if nid matches the source folder (prevents overwriting
    // the original folder when copying/duplicating). Check both data.src.nid
    // and data.args.src.nid formats.
    if (src?.nid && nid === src.nid) return;
    if (args?.src?.nid && nid === args.src.nid) return;

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
    if (pn === "folder-view") {
      this.__folderView = child;
      return;
    }
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
        return this.runFolderMediaAction(_e.download);

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
        return this.openFolderRenameDialog();

      case "folder-organize":
        return this.runFolderMediaAction("organize");

      case "folder-duplicate":
        return this.runFolderMediaAction(_a.duplicate);

      case "folder-delete":
        return this.confirmFolderDelete();

      case "folder-invite-role":
        return this.setFolderInviteRole(cmd);

      case "folder-member-role":
        return this.setFolderMemberRole(cmd);

      case "folder-send-invitation":
        return this.sendFolderInvitation(cmd);

      case "folder-remove-member":
        return this.removeFolderMember(cmd);

      case "folder-rename-change":
        this._renameFolderValue = cmd.getValue ? cmd.getValue() : cmd.mget(_a.value);
        return;

      case "folder-rename-submit":
        return this.renameFolderTarget(this._renameFolderTarget);

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
      case "close-call-panel":
        return this.showFolderTab("files");

      case "start-meeting":
        return this._launchMeetingInPanel();

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

  async _launchMeetingInPanel() {
    if (this._launchingMeeting) return;
    this._launchingMeeting = true;
    try {
      const panel = await this.ensurePart("meeting-panel");
      panel.feed({
        kind: "window_meeting",
        className: `${this.fig.family}__meeting-room-widget`,
        hub_id: this.mget(_a.hub_id),
        filename: this.mget(_a.filename),
        nid: this.mget(_a.actual_home_id) || this.mget(_a.nid),
        trigger: this.mget(_a.media) || this,
        media: this.mget(_a.media) || this,
        service: "meeting",
        uiHandler: [this],
      });
    } finally {
      this._launchingMeeting = false;
    }
  }

  showFolderTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.$el.find(".window-folder__tab-bar-item").attr("data-state", 0);
    this.$el.find(`.window-folder__tab-bar-item[data-tab='${tab}']`).attr("data-state", 1);

    const switchView = (view) => {
      if (this._meetingViewActive && tab !== "meeting") {
        view.feed(folderFilesView(this));
        this._meetingViewActive = 0;
        this._taskPanelMounted = 0;
      }
      view.el.dataset.view = tab;
      switch (tab) {
        case "files":
        case _a.chat:
          return;
        case "meeting":
          this._meetingViewActive = 1;
          this._taskPanelMounted = 0;
          return view.feed(require("./skeleton/meeting-panel")(this));
        case _a.task:
          if (!this._taskPanelMounted) {
            this._taskPanelMounted = 1;
            return view.append({
              kind: "tasks_panel",
              hub_id: this.mget(_a.hub_id),
              nid: this.mget(_a.nid),
              uiHandler: [this],
            });
          }
          return;
        default:
          view.el.dataset.view = "files";
      }
    };

    if (this.__folderView && !(this.__folderView.isDestroyed && this.__folderView.isDestroyed())) {
      return switchView(this.__folderView);
    }
    const switchId = _.uniqueId("folder-tab-");
    this._folderTabSwitchId = switchId;
    return this.ensurePart("folder-view").then((view) => {
      if (this._folderTabSwitchId !== switchId || !view || (view.isDestroyed && view.isDestroyed())) return;
      this.__folderView = view;
      return switchView(view);
    });
  }

  getFolderActionTarget() {
    return this.mget(_a.trigger) || this.mget(_a.media) || this;
  }

  closeFolderSettings() {
    this.isShowSettings = false;
    return this.dialogWrapper.clear();
  }

  openFolderDialog(skeleton) {
    this.isShowSettings = false;
    this.dialogWrapper.clear();
    return _.delay(() => this.dialogWrapper.feed(skeleton));
  }

  runFolderMediaAction(service) {
    const target = this.getFolderActionTarget();
    switch (service) {
      case _e.download:
        this.closeFolderSettings();
        return target.download();
      case "organize":
        return this.prepareFolderMove(target);
      case _a.duplicate:
        return this.duplicateFolderTarget(target);
      default:
        return target?.onUiEvent?.({ service, mget: () => service }, { service });
    }
  }

  prepareFolderMove(target) {
    this.closeFolderSettings();
    if (typeof target.move === "function") return target.move();
    Wm.unselect && Wm.unselect();
    Wm.storeClipboard(_e.cut, target);
    Wm.acknowledge && Wm.acknowledge();
  }

  duplicateFolderTarget(target) {
    this.closeFolderSettings();
    Wm.unselect && Wm.unselect();
    const echoId = Visitor.get(_a.echoId);
    return target.postService(SERVICE.media.copy, {
      service: SERVICE.media.copy,
      nid: target.mget(_a.nodeId),
      pid: target.mget(_a.pid),
      action: _a.copy,
      recipient_id: target.mget(_a.hub_id),
      hub_id: target.mget(_a.hub_id),
      echoId,
    }, { async: 1 }).then(() => {
      // Don't add folder here — WS broadcast (newContent) handles adding
      // the new folder to the grid. Adding from HTTP response causes duplicate.
      Wm.unselect && Wm.unselect();
    }).catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN));
  }

  openFolderRenameDialog() {
    const target = this.getFolderActionTarget();
    const currentName = target?.mget?.(_a.filename) || this.mget(_a.filename) || "";
    this._renameFolderTarget = target;
    this._renameFolderValue = currentName;
    this.openFolderDialog(require("./skeleton/rename-folder-dialog")(this, { value: currentName }));
    return _.delay(() => this.ensurePart("rename-folder-name").then((entry) => entry.focus && entry.focus()));
  }

  renameFolderTarget(target) {
    if (this._renamingFolder) return;
    const entry = this.getPart && this.getPart("rename-folder-name");
    const input = entry?.el?.querySelector?.("input");
    const filename = String(input?.value || entry?.getValue?.() || this._renameFolderValue || "").trim();
    if (!filename || filename === target?.mget?.(_a.filename)) return this.closeFolderSettings();
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) return Wm.alert(LOCALE.INVALID_FILENAME);
    this._renamingFolder = 1;
    const node = target.actualNode ? target.actualNode() : {};
    return target.postService(SERVICE.media.rename, {
      filename,
      nid: target.mget(_a.nodeId) || node.nid || target.mget(_a.nid),
      service: SERVICE.media.rename,
      hub_id: target.isHub ? Visitor.id : (target.mget(_a.hub_id) || node.hub_id),
      echoId: target.mget("echoId"),
    }).then((data) => {
      if (target.afterRename) target.afterRename(data);
      this.closeFolderSettings();
    }).catch((e) => {
      Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
    }).finally(() => {
      this._renamingFolder = 0;
    });
  }

  confirmFolderDelete() {
    const target = this.getFolderActionTarget();
    const filename = target?.mget?.(_a.filename) || this.mget(_a.filename) || "";
    this.dialogWrapper.feed({
      kind: "window_confirm",
      title: LOCALE.DELETE,
      message: `${LOCALE.CONFIRM_DELETE} ${filename}?`,
      confirm: LOCALE.DELETE,
      confirm_type: "danger",
    });
    return this.dialogWrapper.children.last().ask().then(() => {
      this.closeFolderSettings();
      if (target?.trash) return target.trash();
      if (target?.delete) return target.delete();
    }).catch(() => {});
  }

  getFolderSettingPart() {
    return this.dialogWrapper && this.dialogWrapper.children && this.dialogWrapper.children.last();
  }

  getInviteEmail(cmd) {
    const data = (cmd.getData && cmd.getData()) || this.getData?.() || {};
    const entry = this.getPart && this.getPart("invite-email");
    return String(data.email || entry?.getValue?.() || "").trim();
  }

  getFolderRoleOptions() {
    return [
      { label: LOCALE.ROLE_ADMIN, privilege: _K.privilege.admin },
      { label: LOCALE.ROLE_VIEW_EDIT, privilege: _K.privilege.write },
      { label: LOCALE.ROLE_VIEW_CHAT, privilege: _K.privilege.read },
      { label: LOCALE.VIEW, privilege: _K.privilege.guest || _K.privilege.read },
    ];
  }

  getNextFolderRole(role) {
    const options = this.getFolderRoleOptions();
    const index = options.findIndex((item) => item.label === role);
    return options[(index + 1) % options.length];
  }

  updateRoleSelector(cmd, role) {
    if (!cmd.el) return;
    cmd.el.dataset.role = role.label;
    cmd.el.dataset.privilege = role.privilege;
    const label = cmd.el.querySelector(".window-folder__settings-action-role-label .note-content");
    if (label) label.textContent = role.label;
  }

  setFolderInviteRole(cmd) {
    this._folderInviteRole = this.getNextFolderRole(cmd.el?.dataset?.role || LOCALE.ROLE_ADMIN);
    this.updateRoleSelector(cmd, this._folderInviteRole);
  }

  setFolderMemberRole(cmd) {
    this.updateRoleSelector(cmd, this.getNextFolderRole(cmd.el?.dataset?.role || LOCALE.ROLE_ADMIN));
  }

  sendFolderInvitation(cmd) {
    const email = this.getInviteEmail(cmd);
    if (!email) return Wm.alert(LOCALE.EMAIL_REQUIRED || LOCALE.ENTER_VALID_EMAIL);
    const { nid, hub_id } = this.actualNode();
    const permission = this._folderInviteRole?.privilege || _K.privilege.admin;
    return this.postService(SERVICE.sharebox.assign_permission, {
      email,
      hub_id,
      nid,
      permission,
      privilege: permission,
    })
      .then(() => Wm.alert(LOCALE.INVITATION_SENT_SUCCESSFULLY))
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN));
  }

  removeFolderMember(cmd) {
    const row = cmd.$el && cmd.$el.closest(".window-folder__settings-action-member-row");
    if (row && row.remove) row.remove();
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
