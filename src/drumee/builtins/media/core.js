const { filesize, timestamp, dataTransfer } = require("@drumee/ui-essentials")

const MEDIA_GRID = "media_grid";
const MEDIA_ROW = "media_row";
const SET_ICON_TYPE = "set-icon-type";
const ECHO_ID = "echoId";

const OPEN_NODE = "open-node";
const UPLOADER = "media_uploader";
const SEEDING = "seeding";
const IGNORED_FILES = /Thumbs.db|.DS_Store|__MACOSX|.thumbnails|\~+/;
const MAX_BLOB_SIZE = 100000000;
const EDITABLE = [
  'docx', 'docm', 'dotx', 'dotm', 'odt', 'ott', 'xlsx', 'xlsm', 'xltx',
  'xltm', 'xlsb', 'ods', 'ots', 'pptx', 'pptm', 'potx', 'potm', 'ppsx',
  'ppsm', 'odp', 'otp'
];

/**
 * 
 * @param {*} name 
 * @returns 
 */
function shiftDir(name) {
  let a = name.split(/\/+/).filter(function (e) { return e.length });
  a.shift()
  return '/' + a.join('/')
}

require("./skin");
class __media_core extends DrumeeMFS {
  constructor(...args) {
    super(...args);
    this.helper = this.helper.bind(this);
    this._hover = this._hover.bind(this);
    this._pointerenter = this._pointerenter.bind(this);
    this._pointerleave = this._pointerleave.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragging = this._dragging.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    let { id } = opt;
    if (!id) {
      id = opt.nid || _.uniqueId('media-');
      opt.id = id;
    }
    super.initialize(opt);
    this.canRemoveiewOnly = false;
    this.model.atLeast({
      state: 0,
      aspect: _a.grid,
      justify: _a.none,
      signal: _e.ui.event,
      bubble: 0,
      filename: LOCALE.PROCESSING,
    });

    this.iconType = localStorage.iconType || _a.vignette;
    if (this.mget(_a.serial) != null && this.mget(_a.serial) < 1000) {
      this.mset({
        state: 1,
      });
    }

    switch (this.mget(_a.filetype)) {
      case _a.hub:
      case _a.document:
        this.iconType = _a.vector;
        break;
    }
    this._timer = {};

    this.declareHandlers();
    this.initData();
    this.mset({ echoId: this.getLogicalParent().mget('echoId') })
    this.el.dataset.filetype = this.mget(_a.filetype) || '';

    if (this.imgCapable()) {
      this._setIconType = () => {
        this.iconType = t;
        return (this.content.el.dataset.icontype = this.iconType);
      };
      RADIO_MEDIA.on(SET_ICON_TYPE, this._setIconType);
    }

    this._responsive = () => {
      return this.initBounds();
    };

    this.initURL();
    switch (this.mget(_a.filetype)) {
      case _a.folder:
        if (_.isEmpty(this.mget(_a.hubs))) break;
      case _a.hub:
        this.bindActivityHandlerEvent();
        break;
    }
    this.metadata();
    this.contextmenuSkeleton = require("builtins/contextmenu/skeleton");
  }

  /**
   * 
   * @returns 
   */
  onBeforeDestroy() {
    RADIO_BROADCAST.off(
      "notification:details",
      this.updateNotificationCount.bind(this)
    );
    //RADIO_BROADCAST.off("moved:away", this._onPeerMovedAway.bind(this));
    if (this._setIconType) {
      return RADIO_MEDIA.off(SET_ICON_TYPE, this._setIconType);
    }
    try {
      this.logicalParent.syncBounds();
    } catch (e) {
    }
  }

  /**
   * 
   */
  // _onPeerMovedAway(attr = {}) {
  //   if (this.mget(_a.nid) == attr.nid) {
  //     let { cid } = attr;
  //     if (cid && cid != this.cid) {
  //       this.goodbye();
  //     }
  //   }
  // }

  /**
   *
   * @param {*} ui
   * @param {*} event
   */
  contextmenuItems() {
    let items = []
    if (Visitor.inDmz && this.canDownload()) {
      return [_a.download];
    }

    const fileType = this.mget(_a.filetype);
    switch (fileType) {
      case _a.hub:
        items = this.contextmenuItemsForHub();
        break;
      case _a.folder:
        items = this.contextmenuItemsForFolder();
        break;

      case _a.schedule:
        items = [_a.startMeeting, _a.meetingLink, _a.deleteMeeting];
        break;

      default:
        items = this.contextmenuItemsForFiles();
    }

    items.push('share_qrcode');

    /** Children of window_search */
    if (this.mget(_a.role) == _a.search) {
      hubItems.push(_a.separator, _a.openFileLocation);
    }

    /** Children of panel_trash */
    if (this.mget(_a.status) == _a.deleted) {
      fileItems = [_a.separator, _a.restoreToDesk, _a.deletePermanently];
    }

    return items;
  }

  /**
   *
   */
  contextmenuItemsForHub() {
    let fileItems = [];
    if (this.canOrganize() || this.isMediaOwner()) {
      fileItems = [_a.rename, _a.upload, _a.download, _a.separator, _a.info];
      if (this.canShare()) {
        fileItems.push(_a.share)
      }
      fileItems.push(_a.separator, _a.trash)
    } else if (this.canDownload()) {
      fileItems = [_a.download, _a.separator, _a.info];
      if (this.canShare()) fileItems.push(_a.share);
      if (this.canRemove()) fileItems.push(_a.trash);
    }
    // for media files in trash
    if (this.mget(_a.status) == _a.deleted) {
      fileItems = [, _a.separator, _a.restoreToDesk, _a.deletePermanently];
    }
    return fileItems;
  }

  /**
   * 
   */
  contextmenuItemsForFolder() {
    let fileItems = [];
    if (this.canOrganize() || this.isMediaOwner()) {
      // Figma B.1.2/B.2.2/B.3.2 (Folder Action - all workspace types):
      // Download, Rename, Organize, Make a copy, [Share?], Delete
      fileItems = [_a.download, _a.rename, 'organize', 'makeACopy', _a.separator, _a.trash];
      if (this.canShare()) fileItems.splice(fileItems.length - 1, 0, _a.share);
    } else if (this.canDownload()) {
      // Restricted/shared recipient — Download only per Figma 2.2
      fileItems = [_a.download];
      if (this.canShare()) fileItems.push(_a.share);
      if (this.canRemove()) fileItems.push(_a.separator, _a.trash);
    }
    // for media files in trash
    if (this.mget(_a.status) == _a.deleted) {
      fileItems = [, _a.separator, _a.restoreToDesk, _a.deletePermanently];
    }
    return fileItems;
  }

  /**
   *
   */
  contextmenuItemsForFiles() {
    let fileItems = [];
    const fileType = this.mget(_a.filetype);

    if (this.canOrganize() || this.isMediaOwner()) {
      fileItems = [_a.rename, _a.download, _a.separator, _a.copy, _a.duplicate, _a.separator, _a.info];
      if (this.canShare()) fileItems.push(_a.share)
      if (fileType == _a.image) {
        fileItems.push(_a.separator, 'background', _a.rotateLeft, _a.rotateRight);
      }
      fileItems.push(_a.separator, _a.trash)
    } else if (this.canDownload()) {
      fileItems = [_a.download, _a.separator, _a.copy, _a.duplicate, _a.separator, _a.info];
      if (this.canShare()) fileItems.push(_a.share);
      if (fileType == _a.image) {
        fileItems.push(_a.separator, 'background');
      }
      if (this.canRemove()) fileItems.push(_a.trash);
    }

    let extra = []
    // 3WC href
    if (this.isRegularFile()) {
      extra.push("directUrl");
    }

    switch (this.mget(_a.filetype)) {
      case _a.note:
        extra.push("pinOn");
        break;
      case _a.document:
        if (this.canUpload() && EDITABLE.includes(this.mget(_a.ext).toLowerCase())) {
          if ((this.mget(_a.status) !== _a.locked)) extra.push(_a.edit);
        }
        break;
      case _a.web:
        extra.push("setAsHomepage");
        break;
      case _a.script:
        if (Visitor.profile().devel) {
          fextra.push("execute");
        }
        break;
    }

    if (this.canOrganize() || this.isMediaOwner()) {
      if (this.mget(_a.status) === _a.locked) {
        extra.push(_e.unlock);
      } else {
        extra.push(_e.lock);
      }
    }
    if (extra.length) {
      fileItems.push(_a.separator, ...extra)
    }
    return fileItems;

  }

  /**
   *
   */
  bindActivityHandlerEvent() {
    RADIO_BROADCAST.on(
      "notification:details",
      this.updateNotificationCount.bind(this)
    );
  }

  /**
   *
   * @param {*} f
   */
  initURL() {
    let f = "vignette";
    if (this.mget(_a.filetype) == _a.vector) {
      f = "orig";
    }
    this.mset({
      url: this.actualNode(f).url,
      type: this.mget(_a.filetype),
    });
    if (this.mget(_a.parent_id) == Wm.mget(_a.home_id)) {
      this.mset({ role: 'desk' })
    }
  }

  /**
   *
   * @returns
   */
  haveSeen() {
    if (this.isHub || this.isFolder) return true;
    let seen = this.metadata()._seen_ || [];
    if (_.isArray(seen)) {
      let v = seen.filter((e) => {
        return e[Visitor.id]
      });
      if (v.length) {
        return 1;
      }
      return 0
    }
    return seen[Visitor.id];
  }

  /**
   *
   * @returns
   */
  rotate(angle) {
    if (this.mget(_a.filetype) != _a.image) {
      Wm.alert(LOCALE.ACTION_NOT_PERMITTED);
      return;
    }
    this.wait(1);
    this.postService(SERVICE.media.rotate, {
      nid: this.mget(_a.nid),
      angle,
      hub_id: this.mget(_a.hub_id),
      echoId: this.mget(ECHO_ID)
    }).then((data) => {
      this.mset(data);
      this.restart();
      this.wait(0);
    }).catch(() => {
      this.wait(0);
    });
  }

  /**
   *
   * @param {*} count
   * @returns
   */
  renderNotification(c) {
    const counter = this._notify;
    if (!counter) return;
    counter.dataset.refresh = 0;
    if (c <= 0) {
      counter.innerText = "";
      counter.style.visibility = _a.hidden;
    } else {
      counter.style.visibility = _a.visible;
    }
    if (c >= 100) {
      c = "9+";
    }
    counter.innerText = c;
  }

  /**
   *
   */
  getHubNotification(details, hub_id) {
    let count = { media: 0, teamchat: 0 };
    if (!details) return count;
    for (let k of [_a.media, "teamchat"]) {
      if (!details[hub_id]) continue;
      let { content } = details[hub_id];
      if (content[k]) {
        count[k] = content[k].cnt;
      }
    }
    return count;
  }

  /**
   *
   * @param {*} a
   */
  updateNotificationCount(details) {
    let new_file = 0;
    let new_chat = 0;
    let hub_id = this.mget(_a.hub_id);
    if (this.mget(_a.filetype) == _a.hub) {
      let { media, teamchat } = this.getHubNotification(details, hub_id);
      new_file = media;
      new_chat = teamchat;
    } else {
      let hubs = [];
      try {
        hubs = this.mget(_a.hubs).split(",");
      } catch (e) { }
      for (var id of hubs) {
        let { media, teamchat } = this.getHubNotification(details, id);
        new_file = media + new_file;
        new_chat = teamchat + new_chat;
      }
    }
    if (new_file !== null) {
      this.mset({
        new_media: new_file,
        new_file: new_file,
      });
    }
    if (new_chat !== null) {
      this.mset({
        new_message: new_chat,
        new_chat: new_chat,
      });
    }
    this.renderNotification(new_file);
  }

  /**
   *
   * @returns
   */
  isAttachment() {
    return this.mget("isAttachment");
  }

  /**
   *
   * @returns
   */
  _getKind() {
    if (
      this.mget(_a.mode) === _a.row ||
      this.getLogicalParent().getViewMode() === _a.row
    ) {
      return MEDIA_ROW;
    }
    return MEDIA_GRID;
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  allowedAction() {
    if (this.mget(_a.isalink)) return true;
    if (this.isGranted(_K.permission.write)) {
      return true;
    } else {
      if (this.mget(_a.type) == _a.hub) {
        return this.getLogicalParent().isGranted(_K.permission.modify);
      }
    }
    if (this.getLogicalParent().isGranted(_K.permission.modify)) return true;
    return false;
  }

  /**
   * 
   * @returns 
   */
  getLogicalParent() {
    if (this.logicalParent) return this.logicalParent;

    let lp = this.mget("logicalParent");
    if (lp) {
      this.logicalParent = lp;
      return lp;
    }

    lp = this.getHandlers(_a.ui);
    if (lp && lp[0]) {
      this.logicalParent = lp[0];
      return lp[0];
    }

    let p = this.parent;
    while (p) {
      if (p.acceptMedia) {
        lp = p;
        this.logicalParent = p;
        return p;
      }
      p = p.parent;
    }
    return Wm;
  }

  /**
   *
   * @param {*} item
   */
  intersect(item) {
    const mbox = item.bbox;
    if (mbox == null) {
      return 0;
    }
    let r = this.rectangle || this.bbox;
    const i = mbox.intersection(r);
    if (i == null) {
      return 0;
    }
    return i.area() / r.area();
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  overlaps(r) {
    const i = this.bbox.intersection(r);
    if (i == null) {
      return 0;
    }
    return i.area() / this.bbox.area();
  }

  /**
   * 
   * @param {*} side 
   */
  delaySelect(side) {
    const f = () => {
      clearTimeout(this._timer.select);
      this.shift(side);
    };
    this._timer.select = setTimeout(f, 200);
  }

  /**
   * 
   * @returns 
   */
  index() {
    return this.mget(_a.rank);
  }

  /**
   * 
   * @returns 
   */
  toggleStatus() {
    let status;
    if (this.mget(_a.status) === _a.active) {
      status = _a.idle;
    } else {
      status = _a.active;
    }
    return this.postService({
      service: SERVICE.media.update_status,
      nid: this.mget(_a.nid),
      status,
      hub_id: this.mget(_a.hub_id),
      echoId: this.mget(ECHO_ID)
    });
  }

  /**
   * 
   * @returns 
   */
  _getDestination() {
    let dest = this.mget(_a.destination);
    if (_.isEmpty(dest)) {
      let nid, home_id;
      if (this.isHub) {
        nid = this.mget(_a.actual_home_id);
        home_id = nid;
      } else {
        nid = this.mget(_a.nid);
        home_id = this.mget(_a.home_id);
      }
      dest = {
        nid,
        home_id,
        hub_id: this.mget(_a.hub_id),
      };
    }
    if (this._uploadingInplace) {
      dest.destpath = this.mget(_a.ownpath)
    } else {
      dest.destpath = this.getLogicalParent().mget(_a.ownpath) || '/';
    }
    return dest;
  }

  /**
   * 
   */
  checkFailedUpload(c) {
    let failed = c.getFailed();
    if (_.isEmpty(failed)) return;
    let skeleton = require("./skeleton/failed-upload");
    let info = Wm.getItemsByKind('window_info')[0];
    let list;
    if (!info) {
      list = skeleton(this, failed);
      Wm.info(list);
    } else {
      info.ensurePart('failed-upload').then((p) => {
        if (!p) return;
        if (p) {
          list = failed.map((content) => {
            return Skeletons.Note({
              className: `${this.fig.group}__failed-upload-item`,
              content
            })
          })
          p.append(list)
        }
      })
    }
  }


  /**
   * Update numbers and areas of the inner nodes to ease sanity check 
   */
  async updateInnerNodes() {
    if (!this.isFolder) return;
    let svc = SERVICE.media.get_node_attr;
    let hub_id = this.mget(_a.hub_id)
    let nid = this.get(_a.nid)
    let args = {
      hub_id, nid
    }
    let widgetId = this.mget(_a.widgetId)
    this.postService(svc, args, { async: 1 }
    ).then((attr) => {
      attr.widgetId = widgetId;
      this.mset(attr);
      this.restart();
    }).catch((e) => {
      this.warn('Failed to update', args)
      console.trace()
    });
  }

  /**
   * 
   */
  async afterUpload(c) {
    this.unselect();
    this.overed(_a.off);
    this.mset(_a.phase, _a.upload);
    this.isUploading = 0;
    this.trigger(_e.reset);
    setTimeout(() => {
      this.trigger(_e.uploaded);
    }, 1000);

    this.model.unset(_a.folder);
    this.model.unset(_a.file);

    /** Refresh data in case of recursive upload */
    if (!this._uploadBase) {
      this.restart();
      this.logicalParent.syncOrder();
      return;
    }
    this.model.unset(_a.folder);
    this.model.unset(_a.file);
    let svc = SERVICE.media.get_node_attr;
    let opt = { ...this._uploadBase };
    let attr;
    if (opt.relpath) {
      attr = await this.postService(svc, opt);
      if (attr) {
        attr.kind = this._getKind();
        attr.service = OPEN_NODE;
        attr.uiHandler = this.mget(_a.uiHandler);
        this.logicalParent.syncOrder();
        this.model.clear();
        this.mset(attr);
      }
    }
    this.restart();
    this.model.set({ state: 0 });
    this.checkFailedUpload(c);
    if (!this.emptyFolders.length || c.isCanceled()) return;

    /** Create empty folder inside the node */
    for (let relpath of this.emptyFolders) {
      svc = SERVICE.media.make_dir;
      const args = {
        hub_id: opt.hub_id,
        nid: opt.nid,
        ownpath: relpath,
        socket_id: Visitor.get(_a.socket_id),
        echoId: this.mget(ECHO_ID)
      }
      try {
        await this.postService(svc, args);
      } catch (e) {
        this.warn(e);
      }
    }
  }

  /**
   * 
   * @returns 
   */
  uploader(isFolder = false) {
    let c;
    for (c of Array.from(this.children.toArray())) {
      if (c.mget(_a.kind) === UPLOADER) {
        return c;
      }
    }
    const lp = this.getLogicalParent();
    const dest = this._getDestination();
    this.append({
      kind: UPLOADER,
      destination: dest,
      mode: lp.getViewMode(),
      token: lp.mget(_a.token),
      uiHandler: [this],
      echoId: this.mget(ECHO_ID),
      isFolder: isFolder,
      uploadingInplace: this._uploadingInplace
    });

    c = this.children.last();

    c.once("quota:exceeded", () => {
      this.goodbye();
    });

    c.once(_e.eod, (s) => {
      this.triggerHandlers({ service: "media-uploaded" });
      this.triggerHandlers({ service: "media:eod" });
    });


    c.once("upload:response", (data) => {
      if (this._uploadBase || this._uploadingInplace || isFolder) {
        /** No update for folders or upload in place*/
        return;
      }
      this.model.unset(_a.file);
      this.model.unset(_a.phase);
      this.model.unset(_a.mode);
      this.model.set(data);
      this.isUploading = 0;
      this.restart();
    });

    c.on(_e.cancel, () => {
      const { nid, hub_id } = this._getDestination();
      if (nid && hub_id) {
        this.mset(_a.phase, _a.deleted);
        this.trigger(_e.reset);
        this.postService(SERVICE.media.cancel_upload, {
          nid,
          hub_id,
        });
      }
      this.triggerHandlers({ service: "cancel_media" });
      this.cut();
      this.logicalParent.syncOrder();
    });

    c.once(_e.destroy, () => {
      this.afterUpload(c)
    });

    return c;
  }

  /**
   * 
   * @returns 
   */
  uploadFile(file, ownpath) {
    this.isUploading = 1;
    const queue = this.uploader();
    const dest = this._getDestination();
    dest.notify = 1;
    dest.single = 1;
    let args = {
      destination: dest,
      file,
      listener: this,
      position: this.getIndex(),
    }
    if (ownpath) {
      args.ownpath = ownpath;
      args.replace = 1;
    } else {
      if (this.mget(_a.ownpath)) args.ownpath = this.mget(_a.ownpath);
    }
    queue.add(args);
  }

  /**
   * 
   * @param {*} folder 
   * @param {*} queue 
   * @param {*} dest 
   * @returns 
   */
  uploadFolder(folder, opt = {}) {
    let { hub_id, destpath, home_id, nid } = this._getDestination();
    let cx = 0;
    const queue = this.uploader(1);

    if (!folder.isDirectory) {
      this.warn("Designed for folder only");
      return;
    }
    let { updateOnComplete, newDir } = opt;
    if (updateOnComplete) {
      /** uploadInplace doesn't need this */
      this._uploadBase = {
        hub_id,
        nid,
        relpath: folder.fullPath
      }
    }
    if (newDir) {
      delete this._uploadBase.relpath;
    }
    let destination = {
      hub_id,
      nid: home_id,
      destpath,
      home_id
    }
    this.emptyFolders = [];
    let traversed = new Map();
    const self = this;
    var walk = function (c) {
      const folder = c.createReader();
      cx = 0;
      var fetch = () =>
        folder.readEntries(function (entries) {
          if (!Array.from(entries).length) {
            if (c.isDirectory) {
              if (!traversed.get(c.fullPath)) {
                let ownpath = destpath + c.fullPath;
                if (newDir) {
                  ownpath = destpath + shiftDir(c.fullPath);
                }
                self.emptyFolders.push(ownpath);
              }
            }
          }
          for (let entry of Array.from(entries)) {
            cx++;
            if (entry.isDirectory) {
              if (IGNORED_FILES.test(entry.name)) {
                continue;
              }
              walk(entry);
            } else if (entry.isFile) {
              if (IGNORED_FILES.test(entry.name)) {
                continue;
              }
              let ownpath = destpath + entry.fullPath;
              if (newDir) {
                ownpath = destpath + shiftDir(entry.fullPath);
              }
              const opt = {
                destination,
                ownpath,
                file: entry,
              };
              queue.add(opt);
              let path = entry.fullPath.split(/\/+/);
              path.pop();
              let p = path.join('/');
              traversed.set(p, 1)
            }
          }

          if (entries.length) {
            return fetch();
          }
        });
      return fetch();
    };
    walk(folder);
  }


  /**
   * 
   * @returns 
   */
  syncData() {
    let opt;
    let hub_id;
    const phase = this.mget(_a.phase);
    const dest = this.mget(_a.destination);
    switch (phase) {
      case _a.creating:
        return this.seedFolder();
      case _a.moved:
        opt = {
          service: SERVICE.media.move,
          hub_id: dest.hub_id,
          nid: this.mget(_a.nodeId),
          pid: dest.nid,
          action: _a.move,
        };
        if (this.isHub) {
          opt.service = SERVICE.media.relocate;
          this.preserveWidgetId = this.mget(_a.widgetId);
        }
        break;
      case _a.copied:
        opt = {
          service: SERVICE.media.copy,
          nid: this.mget(_a.nodeId),
          pid: dest.nid,
          action: _a.copy,
          recipient_id: dest.hub_id,
          hub_id: this.mget(_a.hub_id),
        };
        break;
      case _a.deleted:
        opt = this.makeTrashOptions();
        break;

      case _a.restored:
        if (this.isHub) {
          hub_id = this.mget(_a.holder_id);
        } else {
          hub_id = this.mget(_a.hub_id);
        }
        var list = [
          {
            nid: this.mget(_a.nodeId),
            hub_id,
            recipient_id: dest.hub_id,
            pid: dest.nid,
            rank: this.index(),
          },
        ];
        opt = {
          service: SERVICE.media.restore_into,
          list,
          hub_id: this.mget(_a.hub_id),
          recipient_id: dest.hub_id,
          pid: this.getLogicalParent().getCurrentNid(),
        };
        break;
      case _e.paste:
        return;

      case "open-manager":
        if (this.isGranted(_K.permission.admin)) {
          this.triggerHandlers({ service: OPEN_NODE });
        }
        this.mset({ phase: _a.idle });
        return;

      case _a.local:
        break;
    }

    if (opt != null) {
      opt.notify = 1;
      opt.echoId = this.mget(ECHO_ID);
      this.postService(opt);
    }

  }

  /**
   * 
   * @param {*} state 
   * @param {*} timeout 
   */
  wait(state, timeout) {
    if (state) {
      this._chrono = timestamp();
    }

    if (
      !Visitor.inDmz &&
      this.mget(_a.status) != _a.deleted &&
      !this.haveSeen()
    ) {
      this.postService({
        service: SERVICE.media.mark_as_seen,
        nid: this.mget(_a.nid),
        hub_id: this.mget(_a.hub_id),
        mode: "direct_call",
        echoId: this.mget(ECHO_ID)
      }).then((data) => {
        this.mset(data);
        if (this.haveSeen()) {
          this.mset({ new_file: 0 });
          this.renderNotification(0);
        }
      });
    } else if (this.isHub || this.isFolder) {
    }
    this.spinner(state, timeout);
    this._isWaiting = state;
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this.content = child;
        return child.once(_e.show, () => {
          this.setupInteract();
          this.enablePreview(true);
          this._pointerleave();
          Kind.waitFor(UPLOADER).then(() => {
            this.isUploading = 0;
            this._shouldUploadFile();
            this._shouldUploadFolder();
          })
          child.el.dataset.status = this.mget(_a.status);
        });

      case _a.entry:
        let service = child.mget(_a.service);
        this.entry = child;
        switch (service) {
          case _e.rename:
            this.el.dataset.status = service;
            child.once(_e.destroy, () => {
              this.el.dataset.status = "";
              this._renameOnStart = null;
              this.phase = null;
              this.mset({ pahse: null })
            });
            RADIO_CLICK.once(_e.reset, this.restart);
            break;
          case "add-folder":
            this.el.dataset.status = service;

            child.once(_e.destroy, () => {
              if (child.status == _e.Escape) {
                this.goodbye();
                return;
              }
              this.el.dataset.status = "";
              this.phase = null;
              this.mset({ pahse: null })
              if ([_a.commit, _e.Enter].includes(child.status) || this._pendingSeed) {
                return;
              }
              this.mkdir(child.getValue())
            });
            RADIO_CLICK.once(_e.reset, this.restart);

            break;
        }
        return
    }
  }

  /**
   * 
   * @param {*} m 
   * @param {*} append 
   * @returns 
   */
  importMedia(m, append) {
    const item = m.model.toJSON();
    item.phase = _a.imported;
    return (item.destination = {
      hub: this.mget(_a.hub_id),
      node: this.getCurrentNid(),
    });
  }

  /**
   *
   * @param {*} origin
   */
  restart(origin) {
    this.unbindEvent(_a.live);
    if (window.ActivityHandler) this.stopListening(window.ActivityHandler, 'notificationUpdated');
    this.initData();
    this.initURL();
    this.initContainer()
    const { md5Hash } = this.metadata();
    this.mset({ md5Hash });
    this.trigger(_e.restart);
    if (_.isString(origin)) this.trigger(origin);
    this.onDomRefresh();
    this.status = null;
    this.unselect();
  }

  /**
   * 
   * @returns 
   */
  unselect() {
    this.resetMotion();
    if (!this.get(_a.state) && !this._renaming) return;
    this.model.unset("handSelect");
    this.setState(0);
    this.el.dataset.selected = this.mget(_a.state);
    this.el.dataset.phase = "";
    this.overed(_a.off);
    this._changeState("checkbox", "selected", this.mget(_a.state));
    const status = this.status || this.mget(_a.status);
    switch (status) {
      case _e.rename:
        this.requestRename();
        return;
    }

    if (this.entry && !this.entry.isDestroyed()) {
      this.requestRename();
    }
    try {
      if (this.children.last().mget(_a.sys_pn) === "contextmenu") {
        this.collection.pop();
      }
    } catch (error) { }

    this.trigger(_e.unselect);
  }

  /**
   * 
   * @param {*} opt 
   * @param {*} hide 
   * @returns 
   */
  select(opt, hide) {
    this.setState(1);
    this.el.dataset.selected = this.mget(_a.state);
    return this.mset(opt);
  }

  /**
   * 
   * @param {*} player 
   * @returns 
   */
  addPlayer(player) {
    if (!player) {
      return;
    }
    this.el.dataset.opened = 1;
    this._players = this._players || {};
    this._players[player.cid] = 1;
    player.once(_e.destroy, () => {
      delete this._players[player.cid];
      if (_.isEmpty(this._players)) {
        this.el.dataset.opened = 0;
        this.unselect();
        if (this.__notify) {
          this._notify.dataset.refresh = 1;
          this.refreshNotification();
        }
      }
    });
  }


  /**
   * 
   */
  seedFolder() {
    const filename = this.mget(_a.filename) || LOCALE.FOLDER;
    const area = this.mget(_a.area) || this.logicalParent.mget(_a.area) || _a.personal;
    const service = "add-folder";
    this.model.set({ area, filename, service });
    this.model.unset(_a.phase);
    this._createInput(filename, { service, preselect: 1 });
  }

  /**
   * 
   * @param {*} data 
   */
  showInboundInfo(data) {
    this.triggerHandlers({ service: "open-inbound-dialog", ...data });
  }

  /**
   * 
   * @param {*} data 
   */
  showOutboundInfo(data) {
    this.data = data;
    this.triggerHandlers({ service: "open-outbound-dialog", ...data });
  }

  /**
   *
   * @returns
   */
  imgCapable() {
    if (/^\-/.test(this.mget(_a.capability))) return 0;
    switch (this.mget(_a.ext)) {
      case 'svg':
        return 1;
      case _a.pdf:
        return 0;
    }
    if (/text/.test(this.mget(_a.mimetype))) return 0;
    if (/shell|script|text/.test(this.mget(_a.filetype))) return 0;
    if (/^r/.test(this.mget(_a.capability))) return 1;
    return 0;
  }

  /**
   *
   * @returns
   */
  waitPreview(cb, args) { }


  /**
   *
   */
  prepareRename(e) {
    if (this.isUploading) return;
    if (!this.isGranted(_K.permission.delete) && !this.isHub) {
      this.triggerHandlers({ service: OPEN_NODE });
      return;
    }
    if (e.type == _e.click && this.phase == _e.rename) {
      return;
    }
    try {
      let elem;
      try {
        if (window.prevElem) {
          window.prevElem.children[1].style.display = "none";
          window.prevElem.children[0].style.display = "block";
          window.prevElem.dataset.service = "rename";
        }
      } catch (x) { }
      if (!e.target.id) {
        elem = e.target.parentElement.parentElement;
      } else if (e.target.id.includes("edit-icon")) {
        elem = e.target.parentElement;
      } else {
        elem = e.target;
      }
      window.prevElem = elem;
      elem.children[1].style.display = "block";
      elem.children[0].style.display = "none";
      elem.dataset.service = "commit-rename";
    } catch (x) { }
    this.rename();
  }

  /**
   *
   */
  commitRename(e) {
    let elem;
    if (e.target.id.includes("commit-edit")) {
      elem = e.target.parentElement;
    } else {
      elem = e.target;
    }
    elem.children[1].style.display = "none";
    elem.children[0].style.display = "block";
    elem.dataset.service = "rename";
    this.requestRename();
  }

  /**
   *
   * @returns
   */
  rename() {
    if (!this.isGranted(_K.permission.delete) && !this.isHub) {
      return;
    }
    if (pointerDragged) {
      return;
    }
    const name = this.mget(_a.filename) || "";
    this._renaming = 1;
    this._changeState(_a.tooltips, _a.hover, _a.off);
    this._createInput(name, { service: _e.rename, preselect: 1 });
  }

  /**
   * 
   * @returns 
   */
  makeTrashOptions() {
    const list = [];
    const svc = SERVICE.media.trash;
    let hub_id = this.mget(_a.hub_id);
    this.trigger(_e.trash);
    if (this.isHub) {
      hub_id = this.mget(_a.holder_id) || Visitor.id;
      const p = parseInt(this.mget(_a.privilege)) & _K.privilege.admin;
    }
    list.push({
      nid: this.mget(_a.nodeId),
      hub_id,
    });
    const opt = {
      service: svc,
      nid: list,
      hub_id: this.mget(_a.hub_id),
    };
    return opt;
  }

  /**
   * 
   * @returns 
   */
  lock() {
    let status;
    if (this.mget(_a.status) === _a.locked) {
      status = _a.active;
    } else {
      status = _a.locked;
    }
    let hubId = this.mget(_a.hub_id);
    if (this.mget(_a.filetype) === _a.hub) {
      return;
    }
    return this.postService({
      service: SERVICE.media.update_status,
      nid: this.mget(_a.nid),
      status,
      hub_id: hubId,
    });
  }

  /**
   * To check the media is locked
   * @returns bool
   */
  isLocked() {
    return this.mget(_a.status) === _a.locked;
  }

  /**
   * 
   * @param {*} msg 
   */
  actionDenied(msg = LOCALE.FORBIDEN_DELETE) {
    this.moveForbiden(msg);
    this.anim(
      [0.3, { scale: 0.9, alpha: 0.7 }],
      [0.3, { scale: 1, alpha: 1 }]
    );
    setTimeout(() => { this.moveAllowed() }, Visitor.timeout());
  }

  /**
   * 
   * @param {*} single_node 
   * @param {*} trashbin 
   * @returns 
   */
  delete() {
    this.triggerHandlers({
      service: "remove-selection", media: this
    });
  }

  /**
   * 
   * @param {*} single_node 
   * @returns 
   */
  putIntoTrash(single_node = 1) {
    if (this.mget(_a.status) === SEEDING) {
      this.suppress();
      return;
    }
    if (single_node) {
      this.postService(this.makeTrashOptions());
    }
  }

  trash() {
    if (!this.canRemove()) return;
    this.putIntoTrash(1);
  }

  /**
   * 
   */
  _nameExists(value) {
    let name = value;
    if (this.mget(_a.ext)) {
      name = `${value}.${this.mget(_a.ext)}`
    }
    return this.getLogicalParent().sameFilename(this, name)
  }

  /**
   * 
   * @param {*} src 
   * @returns 
   */
  prepareMove(src) {
    let opt;
    if (src.mget(_a.files)) {
      // Upload
      return;
    }
    if (src.isHub && this.isFolder) {
      opt = {
        service: SERVICE.media.relocate,
        nid: src.mget(_a.nodeId),
        pid: this.mget(_a.nodeId),
        action: _a.move,
        hub_id: this.mget(_a.hub_id),
        notify: 1,
        moved_in: 1,
        echoId: this.mget(ECHO_ID)
      };
      this.executedService = opt.service;
      return opt;
    }
    // Move inside same hub
    if (src.mget(_a.home_id) === this.mget(_a.actual_home_id)) {
      opt = {
        service: SERVICE.media.move,
        nid: src.mget(_a.nodeId),
        pid: this.mget(_a.nodeId),
        action: _a.move,
        hub_id: this.mget(_a.hub_id),
        notify: 1,
        moved_in: 1,
      };
      this.executedService = opt.service;
      return opt;
    }
    if (src.mget(_a.hub_id)) {
      opt = {
        service: SERVICE.media.copy,
        nid: src.mget(_a.nodeId),
        pid: this.mget(_a.nodeId),
        action: _a.copy,
        hub_id: src.mget(_a.hub_id),
        recipient_id: this.mget(_a.hub_id),
        notify: 1,
        moved_in: 1,
      };
      this.executedService = opt.service;
      opt.echoId = this.mget(ECHO_ID);
      return opt;
    }
  }

  /**
   *
   * @param {*} e
   */
  async _uploadFiles(files, replace = 0) {
    if (!_.isArray(files)) files = [files];
    const queue = this.uploader();
    const dest = this._getDestination();
    this.isUploading = 1;
    let pos = 0;
    for (let f of Array.from(files)) {

      dest.notify = 1;
      dest.single = 1;
      let args = {
        destination: dest,
        file: f,
        listener: this,
        position: this.getIndex() + pos,
        replace
      }
      pos++;
      let ownpath = this.mget(_a.ownpath) || '/';
      if (f.fullPath) ownpath = `${ownpath}/${f.fullPath}`;
      ownpath = ownpath.replace(/\/+/g, '/');
      ownpath = ownpath.replace(/\/+$/g, '');
      args.ownpath = ownpath;

      queue.add(args);
      // this.type = null;
    }
  }

  /**
   *
   * @param {*} e
   */
  async uploadInplace(e) {
    const { files, folders } = dataTransfer(e);

    this._uploadingInplace = true;
    await this._uploadFiles(files)

    if (_.isEmpty(folders)) {
      return;
    }

    for (let folder of Array.from(folders)) {
      this.uploadFolder(folder);
    }
  }

  /**
   *
   * @param {*} moving
   */
  moveIn(moving, paste = 0) {
    let m = moving;
    let src = m.mget(_a.filetype);
    const dest = this.mget(_a.filetype);
    let mode;
    this.overed(_a.off);
    if (this._movedInItems == null) {
      this._movedInItems = 0;
    }
    this._movedInItems++;
    if (src === _a.hub && dest === _a.hub) {
      return;
    }
    const failed = (e) => {
      this.warn("Failed to move", e);
      const msg = e.reason || e.error;
      this.moveForbiden(msg);
    };
    switch (dest) {
      case _a.folder:
        mode = _a.move;
        return this.postService(this.prepareMove(m))
          .then((data) => {
            this.afterMoveIn(m, paste, mode, data);
          })
          .catch(failed);

      case _a.hub:
        src = this.prepareMove(m);
        mode = _a.copy;
        let opt = {
          service: SERVICE.media.copy,
          nid: src.nid,
          pid: this.mget(_a.actual_home_id),
          action: _a.copy,
          recipient_id: this.mget(_a.hub_id),
          hub_id: src.hub_id,
          notify: 1,
          moved_in: src.moved_in,
          async: 1,
          echoId: this.mget(ECHO_ID)
        };
        this.executedService = opt.service;
        this.postService(opt).then((data) => {
          this.afterMoveIn(m, paste, mode, data);
        }).catch(failed);
        return;
      default:
        return;
    }
  }

  /**
   *
   * @param {*} dest
   */
  retrieve(dest) {
    this._dest = this._dest || {};
    this._dest[this.mget(_a.nodeId)] = dest;
    this.postService({
      service: SERVICE.media.retrieve,
      nid: this.mget(_a.nodeId),
      hub_id: this.mget(_a.hub_id),
      echoId: this.mget(ECHO_ID)
    });
  }

  /**
   *
   * @param {*} dest
   */
  restore(dest) {
    this.postService({
      service: SERVICE.media.restore,
      echoId: this.mget(ECHO_ID),
      nid: this.mget(_a.nodeId),
      hub_id: this.mget(_a.hub_id),
    });
  }

  /**
   *
   */
  checkSanity() {
    this._nameConflict = null;

    if (!this.entry || this.entry.isDestroyed()) {
      return null;
    }

    let { value } = this.entry.getData();

    if (_.isEmpty(value)) {
      Wm.alert(LOCALE.EMPTY_FILE);
      return null;
    }

    if (this.entry.status === _a.error) {
      return null;
    }

    if (this.entry.status === _e.cancel) {
      this.collection.remove(this.entry.model);
      return null;
    }

    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(value)) {
      Wm.alert(LOCALE.INVALID_FILENAME);
      return null;
    }

    if (this._nameExists(value)) {
      if (this.mget(_a.filename) !== value) {
        this._nameConflict = value;
        Wm.alert(value.printf(LOCALE.NAME_ALREADY_EXISTES));
        return null;
      }
    }

    value = value.trim();
    value = value.replace(/\n/g, "<br>");
    return value;
  }

  /**
   *
   * @param {*} fname
   */
  mkdir(fname) {
    const value = fname || LOCALE.FOLDER;
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(value)) {
      Wm.alert(LOCALE.INVALID_FILENAME);
      return this.seedFolder();
    }
    if (this._pendingSeed) return;
    this._pendingSeed = 1;
    this.model.set(_a.filename, value);
    let opt = {
      kind: this._getKind(),
      service: OPEN_NODE,
      uiHandler: this.mget(_a.uiHandler),
    };
    let args = {
      hub_id: this.mget(_a.hub_id),
      dirname: value,
      nid: this.mget(_a.parentId),
      notify: 1,
      socket_id: Visitor.get(_a.socket_id),
      seeding: 1,
      echoId: this.mget(ECHO_ID)
    }

    const good = (data) => {
      this.wait(0);
      if (data.error) {
        Wm.alert(LOCALE[data.error] || data.error)
        return this.goodbye()
      }
      let reopen = this.mget('reopen');
      let widgetId = this.mget(_a.widgetId)
      this.model.clear();
      data.echoId = this.mget(ECHO_ID);
      this.model.set({ widgetId, ...data, ...opt, actual_home_id: data.home_id, service: OPEN_NODE });
      this.restart("media:created");
      if (reopen) {
        this.triggerHandlers({ service: OPEN_NODE })
      }
    }

    const bad = (e) => {
      this.warn("Failed to create dir", e);
      this.restart();
    }


    args.filename = value;
    args.area = this.mget(_a.area);
    switch (this.mget(_a.area)) {
      case _a.public:
      case _a.share:
      case _a.private:
        args.pid = args.nid;
        this.postService(SERVICE.desk.create_hub, args).then(good).catch(bad);
        break;
      default:
        this.postService(SERVICE.media.make_dir, args).then(good).catch(bad);
    }

  }

  /**
   *
   */
  getHostName() {
    return this.mget(_a.vhost);
  }

  /**
   *
   */
  getHostId() {
    return this.mget(_a.hub_id);
  }

  /**
  *
  */
  afterCopy(data) {
    Wm.unselect(2);
    this.unselect();
    if (!data) return;
    if (_.isArray(data)) {
      data = data[0];
    }
    let { args } = data;
    if (!args) {
      this.warn("ERR[1731]: missing args", data)
      return
    }
    let { dest } = args;
    if (!dest) return;
    this.service = _a.idle;
    this.status = _a.idle;

    this._onMoveDone(dest);
    this.trigger(_a.copied);
  }

  /**
   *
   */
  afterRename(data) {
    let { args } = data;
    this.service = _a.idle;
    this.status = _a.idle;
    if (!args) {
      this.warn("ERR[1727]: missing args", data)
      return
    }
    let { src, dest } = args;
    this.mset("renamed", [src.filename, dest.filename]);
    this.mset(dest)
    this.restart();
  }

  /**
   *
   * @param {*} cmd
   */
  requestRename(cmd) {
    try {
      if (window.prevElem) {
        window.prevElem.children[1].style.display = "none";
        window.prevElem.children[0].style.display = "block";
        window.prevElem.dataset.service = "rename";
      }
    } catch (e) { }
    let data;
    const value = this.checkSanity();
    this._renaming = 0;
    if (_.isEmpty(value)) {
      return;
    }

    if (value === this.mget(_a.filename)) {
      try {
        this.entry.softDestroy();
      } catch (error) { }
      return;
    }
    data = {
      filename: value,
      nid: this.mget(_a.nodeId),
      service: SERVICE.media.rename,
      hub_id: this.mget(_a.hub_id),
      echoId: this.mget(ECHO_ID)
    };
    if (this.isHub) {
      data.hub_id = Visitor.id;
    }

    this.postService(SERVICE.media.rename, data).then(this.afterRename.bind(this));
  }

  /**
   *
   * @param {*} name
   * @param {*} attr
   * @param {*} value
   */
  _changeState(name, attr, value) {
    const el = document.getElementById(`${this._id}-${name}`);
    if (el != null) {
      el.dataset[attr] = value;
    }
  }

  /**
   * 
   */
  _shouldUploadFile() {
    const file = this.mget(_a.file);
    if (!file) return;
    this.isUploading = 1;

    if (!file.fullPath) {
      /** Pasted data */
      this.uploadFile(file);
      return;
    }
    let name = file.fullPath.replace(/\/+/g, "");
    let existing = this._nameExists(name)
    if (!existing) {
      this._uploadFiles(file);
      return;
    }

    let message;
    let b1;
    if (existing.isFolder || existing.isHub) {
      message = LOCALE.CONFIRM_DIRNAME_CONFLICT.format(name);
      b1 = LOCALE.INSERT;
    } else {
      message = LOCALE.CONFIRM_FILENAME_CONFLICT.format(name);
      b1 = LOCALE.REPLACE;
    }
    Wm.choice(message, LOCALE.CANCEL, b1, LOCALE.DUPLICATE).then((r) => {
      switch (r.choice) {
        case 1:
          this.goodbye();
          break;
        case 2:
          if (existing.isFolder || existing.isHub) {
            existing.isUploading = 1;
            existing._uploadFiles(file)
            setTimeout(() => { this.cut() }, 300)
          } else {
            this._uploadFiles(file, 1);
            existing.cut()
          }
          break;
        case 3:
          this._uploadFiles(file, 0);
          break;
      }
    })
  }

  /**
   * 
   */
  _shouldUploadFolder() {
    const folder = this.mget(_a.folder);
    if (!folder) return;
    this.isUploading = 1;
    let dirname = folder.fullPath.replace(/\/+/g, "");
    let existing = this._nameExists(dirname)
    if (!existing) {
      this.uploadFolder(folder, { updateOnComplete: 1 });
      return;
    }
    let msg = LOCALE.CONFIRM_FILENAME_CONFLICT.format(dirname);
    Wm.confirm(msg).then(() => {
      existing.uploadFolder(folder);
      existing.once(_e.reset, () => {
        this.cut()
      })
    }).catch(async (r) => {
      this.debug("ERROR[1799]: failed to upload folder", r)
      let { response } = r;
      if (response == _e.close) {
        this.goodbye();
        return;
      }
      const svc = SERVICE.media.make_dir;
      const { hub_id, nid } = this._getDestination();
      let data = await this.postService(svc, {
        hub_id,
        nid,
        socket_id: Visitor.get(_a.socket_id),
        dirname,
        echoId: this.mget(ECHO_ID)
      })
      this.model.clear();
      this._renameOnStart = 1;
      this.model.set({ ...data, actual_home_id: data.home_id });
      this.restart("media:created");
      this._uploadingInplace = true;
      this.uploadFolder(folder, { updateOnComplete: 1, newDir: 1 });
    })
  }

  /**
   *
   */
  _poke() {
    this.anim([0.3, { scale: 1.2 }], [0.3, { scale: 1 }]);
  }

  /**
   *
   */
  isHandSelect() {
    return this.mget("handSelect");
  }

  /**
   *
   * @param {*} e
   * @param {*} service
   */
  removeMedia(e, service) {
    this.mset(_a.service, service);
    try {
      this.triggerHandlers({ service });
    } catch (e) {
      this.softDestroy();
    }

  }

  /**
   *
   * @param {*} data
   */
  _onMoveDone(data) {
    let opt;
    this.model.unset(_a.phase);
    this._poke();
    if (_.isArray(data)) {
      opt = data[0];
      if (_.isArray(opt)) {
        opt = opt[0];
      }
    } else {
      opt = data;
    }

    if (!opt) {
      return;
    }
    if (this._movedInItems > 0) {
      this._movedInItems--;
      return;
    }
    if (opt.args && opt.args.dest) {
      opt = { ...opt.args.dest }
    }

    opt.service = OPEN_NODE;
    opt.kind = this._getKind();
    opt.uiHandler = this.mget(_a.uiHandler);
    opt.isAttachment = this.isAttachment();
    this.model.clear();
    opt.privilege = opt.permission || this.logicalParent.mget(_a.privilege);
    if (this.preserveWidgetId) opt.widgetId = this.preserveWidgetId;
    this.model.set(opt);
    this.restart();
  }

  /**
   *
   */
  refreshNotification() {

  }

  /**
   *
   */
  handleDownload(data) {
    // set by core/mfs when downloading a tree/branch
    let { svc, keysel } = bootstrap();
    if (this.mget("zipid") === data.zipid) {
      if (this._isDownloading === data.zipid) return;
      if (this._progress && !this._progress.isDestroyed()) {
        if (data.exit === 0) {
          this._progress.suppress();
          if (this._zipsize > MAX_BLOB_SIZE) {
            let nid = this.mget(_a.nid);
            let hub_id = this.mget(_a.hub_id);
            let zip_id = data.zipid;
            let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${zip_id}&keysel=${keysel}`;
            this.getFromUrl(url);
            Wm.alert(
              LOCALE.DOWNLOAD_LONG_TIME.format(
                data.zipname,
                filesize(this._zipsize)
              )
            );
            return;
          }
          this.append({
            kind: "progress",
            filename: this.mget(_a.filename),
          });
          this._progress = this.children.last();
          this._isDownloading = data.zipid;
          delete data.progress;
          this.download_zip(data);
          return;
        } else if (data.exit > 0) {
          this._progress.setLabel("ERROR");
        }
        this._progress.update(data.progress);
      }
      return;
    }
    // set by core/mfs when downloading a tree/branch
    if (this._waitingForZip !== this.mget(_a.nid)) {
      return;
    }
    this._waitingForZip = null;
    this.download(data);
  }

  /**
   *
   */
  dispatchNotifications(data) {
    // set by core/mfs when downloading a tree/branch
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    this.requestRename(cmd);
  }

  /**
   *
   * @param {*} res
   */
  onServerComplain(res) {
    this.warn("onServerComplain[2109]", res)
    if (res.error == "limit_exceeded") {
      Wm.alert(LOCALE.QUOTA_EXCEEDED);
      this.goodbye();
    }
  }

  /**
   *
   * @param {*} method
   * @param {*} data
   */
  __dispatchRest(method, data) {
    this.verbose("dispatchRest[2026]", method, data, this);
    this.executedService = method;
    switch (method) {
      case SERVICE.sharebox.get_outbound_node_attr:
        this.model.set({
          node_attr: data,
        });
        return this.triggerHandlers({ service: "open-outbound-dialog" });

      case SERVICE.sharebox.get_inbound_node_attr:
        return this.showInboundInfo(data);

      case SERVICE.hub.update_name:
        this.model.set(_a.filename, data.name);
        this.restart();
        return Wm.unselect();

      case SERVICE.media.update_status:
        // case SERVICE.media.get_node_attr:
        this.model.set(data);
        return this.restart();

      case SERVICE.media.trash:
        this.trigger(_e.deleted);
        this.suppress();
        return

      case SERVICE.media.move:
      case SERVICE.media.relocate:
      case SERVICE.media.restore:
      case SERVICE.media.restore_into:
        return this._onMoveDone(data);

      case SERVICE.media.copy:
        return this.afterCopy(data);

      case SERVICE.desk.leave_hub:
        return this.parent.collection.remove(this.model);

      case SERVICE.media.download:
        if (data.wait === 0) {
          this.download_zip(data);
          return;
        }
        if (data.zipid) {
          this.mset({ zipid: data.zipid });
          this._zipsize = data.size;
          if (this._progress) this._progress.setLabel(LOCALE.PREPARING);
        }
        break;
      case null:
      case undefined:
      default:
        return this.warn(WARNING.service.unexpected.format(method));
    }
  }

  /**
   *
   * @param {*} service
   * @param {*} data
   */
  __dispatchPush(service, data) {
    if (_.isEmpty(data)) {
      return;
    }
    let hubs, nodes;
    try {
      hubs = this.mget(_a.hubs).split(",");
    } catch (error) { }
    try {
      nodes = this.mget(_a.nodes).split(",");
    } catch (error1) { }
    hubs = hubs || [];
    nodes = nodes || [];

    const concerned =
      data.hub_id === this.mget(_a.hub_id) ||
      hubs.includes(data.hub_id) ||
      (data.zipid != null && data.zipid == this.mget("zipid"));

    if (!concerned) return;
    switch (service) {

      case SERVICE.signaling.notify:
        this.dispatchNotifications(data);
        return;
    }
  }
}

module.exports = __media_core;
