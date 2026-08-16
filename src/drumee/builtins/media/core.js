const { timestamp, dataTransfer } = require("@drumee/ui-essentials")

const MEDIA_GRID = "media_grid";
const MEDIA_ROW = "media_row";
const SET_ICON_TYPE = "set-icon-type";
const ECHO_ID = "echoId";

const OPEN_NODE = "open-node";
const UPLOADER = "media_uploader";
const SEEDING = "seeding";
const IGNORED_FILES = /Thumbs.db|.DS_Store|__MACOSX|.thumbnails|\~+/;
const MAX_BLOB_SIZE = 100000000;
// Office formats that get content posters (thumb.png) via the SEO index worker.
const DOC_EDITABLE = require('player/document/editable');

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
    // this.bindEvent(_a.live);
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
    // this.unbindEvent(_a.live);
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

    if ([_a.public, _a.share, _a.dmz].includes(this.mget(_a.area)) && this.canShare()) items.push('share_qrcode');

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
  /**
   * Whether the current user can invite collaborators into this hub — gates the
   * kebab "Invite" item. Mirrors DrumeeMFS.canShare() (download privilege) but
   * widens the area set: canShare() only allows dmz/share, yet `private` hubs
   * (the orange folder tiles — `.folder-shape.private` fills --area-private
   * #eb6159) are equally invitable. The folder settings panel already invites
   * into them via the same SERVICE.hub.invite endpoint; they just aren't
   * dmz/share so canShare() returns false. Add `_a.restricted` to extend to
   * restricted hubs too.
   */
  _canInviteToHub() {
    const area = this.mget(_a.area);
    if (!["dmz", _a.share, _a.private].includes(area)) return false;
    // Inviting is member management: hub.invite / add_contributors /
    // set_privilege are all `src: admin` server-side, so view, chat AND edit
    // could only ever meet a 403. This used to test the DOWNLOAD bit, which
    // offered the action to chat and edit members and made the refusal look
    // like a bug rather than a permission.
    return this.mget(_a.privilege) & _K.permission.admin;
  }

  contextmenuItemsForHub() {
    let fileItems = [];
    // Over-limit: upload + invite are paused — omit them from the kebab so
    // the menu doesn't offer actions the REST clamp will refuse.
    const locked = require("libs/over-limit").isLocked();
    if (this.canOrganize() || this.isMediaOwner()) {
      fileItems = ['openInWindow', _a.separator, _a.rename];
      if (!locked) fileItems.push(_a.upload);
      fileItems.push(_a.download, _a.separator, _a.info);
      if (!locked && this._canInviteToHub()) {
        fileItems.push(_a.share)
      }
      fileItems.push(_a.separator, _a.trash)
    } else if (this.canDownload()) {
      fileItems = ['openInWindow', _a.separator, _a.download, _a.separator, _a.info];
      if (!locked && this._canInviteToHub()) fileItems.push(_a.share);
      if (this.canRemove()) fileItems.push(_a.trash);
    }
    // for media files in trash
    if (this.mget(_a.status) == _a.deleted) {
      // No leading hole: the sparse `[, ...]` was a leftover from a removed
      // first entry — an `undefined` item the menu had to skip over.
      fileItems = [_a.separator, _a.restoreToDesk, _a.deletePermanently];
    }
    return fileItems;
  }

  /**
   * 
   */
  contextmenuItemsForFolder() {
    // for folders in trash
    if (this.mget(_a.status) == _a.deleted) {
      return [_a.separator, _a.restoreToDesk, _a.deletePermanently];
    }

    // Sectioned Folder menu (spec 2026-06-10): each inner array renders as
    // one separator-delimited section; trash always closes the menu.
    const sections = [];
    if (this.canOrganize() || this.isMediaOwner()) {
      /** 1 — download + make a copy + rename */
      sections.push([_a.download, 'makeACopy', _a.rename]);
      /** 2 — organize (Move submenu) */
      sections.push(['organize']);
      /** 3 — Invite (_a.share) hidden on subfolders per Lexis 2026-06-14: Invite is a
       * parent-folder/hub-only action. Item def, handler, and the hub menu keep it. */
      // if (this.canShare()) sections.push([_a.share]);
      /** 4 — details: members + roles via the folder settings panel */
      sections.push([_a.info]);
      /** 5 — outside-world share link (share area only) */
      if (this.mget(_a.area) === _a.share) sections.push(['secureShare']);
      /** 6 — trash last */
      sections.push([_a.trash]);
    } else if (this.canDownload()) {
      // Restricted/shared recipient — Download only per Figma 2.2
      sections.push([_a.download]);
      // Invite (_a.share) hidden on subfolders per Lexis 2026-06-14 (parent-folder/hub only).
      // if (this.canShare()) sections.push([_a.share]);
      sections.push([_a.info]);
      if (this.canRemove()) sections.push([_a.trash]);
    }

    const fileItems = [];
    sections.forEach((s, i) => {
      if (i) fileItems.push(_a.separator);
      fileItems.push(...s);
    });
    return fileItems;
  }

  /**
   *
   */
  contextmenuItemsForFiles() {
    const fileType = this.mget(_a.filetype);
    const editable = this.canOrganize() || this.isMediaOwner();
    if (!editable && !this.canDownload()) return [];

    // Sectioned File menu (spec 2026-06-10): each inner array renders as one
    // separator-delimited section; trash always closes the menu.
    const sections = [];

    /** 1 — clipboard copy + same-folder duplicate + download */
    const fileActions = [_a.copy];
    if (editable) fileActions.push(_a.duplicate);
    fileActions.push(_a.download);
    sections.push(fileActions);

    /** 2 — organize (Move submenu). Invite (_a.share) hidden on files per Lexis
     * 2026-06-14 (parent-folder/hub only); item def + handler + hub menu keep it. */
    const organize = [];
    if (editable) organize.push('organize');
    // if (this.canShare()) organize.push(_a.share);
    if (organize.length) sections.push(organize);

    /** 3 — rename + chat threads (inside a folder window only) */
    const naming = [];
    if (editable) naming.push(_a.rename);
    if (this.getParentByKind && this.getParentByKind('window_folder')) {
      naming.push('seeChatThreads');
    }
    if (naming.length) sections.push(naming);

    /** 4 — details */
    sections.push([_a.info]);

    /** 5 — area links + type extras. "edit" removed: opening an editable
     * document auto-enters edit mode when permitted, no menu item needed. */
    const extra = [];
    if (editable) {
      switch (this.isRegularFile() && this.mget(_a.area)) {
        case _a.share:
          extra.push('secureShare'); /** Share link for access from the outside world */
          break;
        case _a.private:
          extra.push('designationLink'); /** Open a file from the link with the user environment */
          break;
        case _a.public:
          extra.push('directUrl');  /** Web-base URL. Readable by anyone. No token needed */
          break;
      }
    }
    if (fileType == _a.image) {
      extra.push('background');
      if (editable) extra.push(_a.rotateLeft, _a.rotateRight);
    }
    switch (fileType) {
      case _a.note:
        extra.push("pinOn");
        break;
      case _a.web:
        extra.push("setAsHomepage");
        break;
      case _a.script:
        if (Visitor.profile().devel) {
          extra.push("execute");
        }
        break;
    }
    if (editable) {
      extra.push(this.mget(_a.status) === _a.locked ? _e.unlock : _e.lock);
    }
    if (extra.length) sections.push(extra);

    /** 6 — trash last */
    if (editable || this.canRemove()) sections.push([_a.trash]);

    const fileItems = [];
    sections.forEach((s, i) => {
      if (i) fileItems.push(_a.separator);
      fileItems.push(...s);
    });
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
   * Normalized file extension (ext alias from SQL, or extension field).
   */
  _fileExt() {
    return (this.mget(_a.ext) || this.mget(_a.extension) || "")
      .toString()
      .toLowerCase();
  }

  /**
   *
   * @param {*} f
   */
  initURL() {
    let f = "vignette";
    const ext = this._fileExt();
    if (this.mget(_a.filetype) == _a.vector) {
      f = "orig";
    } else if (ext === _a.pdf || DOC_EDITABLE.includes(ext)) {
      // Whole first page at natural aspect (no center-crop / no letterbox); the
      // cell crops it to cover+top in CSS so the document title stays visible.
      // DOC_EDITABLE = office exts (doc/xls/docx/xlsx…); only used when imgCapable
      // (i.e. metadata.poster is set), otherwise the icon shows instead.
      f = "thumb";
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
    // Keep the notify CONTAINER's data-count in sync. `_notify` is only the
    // inner count element (`-notify-count`); the grid notify highlight in
    // skin/index.scss keys off the container
    // (`:has(.media-grid-notify__container:not([data-count="0"]))`), so the
    // highlight only clears when the container's data-count reaches 0.
    const container = document.getElementById(`${this._id}-notify`);
    if (container) container.dataset.count = c > 0 ? c : 0;
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
   * Toggle the UI-only notification-origin highlight on the cell. Applied to
   * the specific file revealed from a notification item (Wm._highlightNode in
   * window/utils.js) — NOT every new file in the folder. The attribute is
   * decoupled from data-count so it survives mark-as-seen; it is cleared when
   * the file is opened (wait) or its window closes (see below).
   * @param {boolean} on
   */
  _setNotifyHighlight(on) {
    if (!this.el) return;
    if (on) {
      this.el.dataset.uiHighlight = 1;
    } else {
      this.el.removeAttribute("data-ui-highlight");
    }
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
   * Debounced shift request. Called on every drag tick, so it dedupes on the
   * requested (side, bar) pair: the first tick arms the timer and identical
   * follow-ups leave it alone — the shift fires 120ms after entering the
   * zone even while the pointer keeps moving. A DIFFERENT request cancels
   * the pending one and re-arms. The old version cleared the timer inside
   * the callback — after it had already fired — so every call stacked one
   * more live timer and shifts landed twice and late during fast drags.
   * @param {*} side
   * @param {*} bar 1 when this tile anchors the insertion indicator
   */
  delaySelect(side, bar) {
    const req = `${side || ""}:${bar ? 1 : 0}`;
    if (this._shiftReq === req) {
      return;
    }
    this._shiftReq = req;
    clearTimeout(this._timer.select);
    this._timer.select = setTimeout(() => {
      // Applied — drop the dedupe key so a later identical request after an
      // out-of-band reset (resetMotion) re-arms instead of being swallowed.
      this._shiftReq = null;
      this.shift(side, bar);
    }, 120);
  }

  /**
   * Drop any pending delaySelect request without touching the tile's current
   * position. resetMotion goes through this so a shift armed just before the
   * drop cannot land after the cleanup pass already ran.
   */
  cancelShift() {
    clearTimeout(this._timer.select);
    this._shiftReq = null;
  }

  /**
   * 
   * @returns 
   */
  index() {
    return this.mget(_a.rank);
  }

  /**
   * Position of this tile inside its list collection — the unit
   * insertMedia's `position` argument speaks (collection.add {at:...}).
   * Deliberately NOT index(): that returns the stored rank, which only
   * matches the displayed order while the window is sorted by rank. Under
   * the default mtime-desc listing the two are unrelated, so deriving an
   * insertion slot from rank dropped tiles in the wrong place.
   * @returns {number}
   */
  listIndex() {
    const c =
      (this.parent && this.parent.collection) ||
      (this.model && this.model.collection);
    if (!c || !_.isFunction(c.indexOf)) {
      return this.index();
    }
    const i = c.indexOf(this.model);
    return i < 0 ? this.index() : i;
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
    this._uploadingInplace = false;
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
    if (opt.relpath || opt.nid) {
      // relpath (legacy) OR nid (make_dir-first): refresh the adopted top folder.
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
      if (c.mget(_a.kind) !== UPLOADER) continue;
      if (c.isDestroyed && c.isDestroyed()) continue;
      // Reuse only a live uploader — completed instances clear spoolTimer in
      // _onCompletion() but may linger in children until softDestroy finishes.
      if (c.spoolTimer) {
        this._uploader = c;
        return c;
      }
    }
    const lp = this.getLogicalParent();
    const dest = this._getDestination();
    this.append({
      kind: UPLOADER,
      destination: dest,
      mode: lp && lp.getViewMode ? lp.getViewMode() : _a.grid,
      token: lp.mget(_a.token),
      uiHandler: [this],
      echoId: this.mget(ECHO_ID),
      isFolder: isFolder,
      uploadingInplace: this._uploadingInplace
    });

    c = this.children.last();
    this._uploader = c;

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
      if (this._uploader !== c) return;
      this._uploader = null;
      this.afterUpload(c);
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
   * Create a directory under `parentNid` using the nid+dirname form, which the
   * server accepts even for shared/received hubs (the bundle feature does the
   * same — see media/bundle/job.js). NO ownpath is sent, so the server's
   * `_ensureParentExists` check is never triggered.
   *
   * @param {*} hub_id
   * @param {*} parentNid  nid of the directory the new folder is created under
   * @param {*} dirname    name of the folder to create
   * @returns the created node, or null on failure
   */
  async _mkdir(hub_id, parentNid, dirname) {
    try {
      const node = await this.postService(SERVICE.media.make_dir, {
        hub_id,
        nid: parentNid,
        socket_id: Visitor.get(_a.socket_id),
        dirname,
        echoId: this.mget(ECHO_ID),
      });
      if (node && (node.nid != null || node.home_id != null)) return node;
      this.warn("make_dir returned no nid", { hub_id, parentNid, dirname });
      return null;
    } catch (e) {
      this.warn("make_dir failed", { hub_id, parentNid, dirname }, e);
      return null;
    }
  }

  /**
   * Upload a dropped folder tree WITHOUT per-file ownpath.
   *
   * Strategy (make_dir-first): every directory is created first via
   * `_mkdir(hub_id, parentNid, dirname)` (nid+dirname form that works for
   * shared hubs), then each file is queued into its parent folder's REAL nid
   * with no `ownpath`. Dropping ownpath makes the server's `_ensureParentExists`
   * return early, bypassing the `actual_home_id == home_id` check that 403'd
   * folder uploads into shared/received hubs.
   *
   * Caller cases:
   *  - normal (placeholder, {updateOnComplete:1}): create the dropped folder
   *    under the drop directory, adopt it, restart, then upload its contents
   *    into the created top's nid.
   *  - uploadInplace (this.uploadFolder(folder), drop INTO an open folder): the
   *    dropped folder is created as a subfolder of the open directory; root =
   *    the created top's nid.
   *  - merge ({merge:1}): the dropped folder's contents go INTO a pre-existing
   *    same-named folder; root = that folder's own nid; do NOT create a top.
   *  - rename ({updateOnComplete:1, newDir:1}): the widget was already turned
   *    into the renamed dir; root = its own nid; do NOT create a top.
   *
   * @param {*} folder  a DataTransfer directory entry
   * @param {*} opt     { updateOnComplete, newDir, merge }
   * @returns
   */
  async uploadFolder(folder, opt = {}) {
    if (!folder || !folder.isDirectory) {
      this.warn("Designed for folder only");
      return;
    }
    const { updateOnComplete, newDir, merge } = opt;

    let { hub_id, nid } = this._getDestination();
    /**
     * Create a new top folder for the normal placeholder drop and for
     * uploadInplace (drop into an open dir). Skip it for merge (the existing
     * same-named folder IS the root) and rename (newDir:1 — the widget is
     * already the renamed dir). In those two cases the destination nid is root.
     */
    const createTop = !newDir && !merge;
    this.emptyFolders = [];

    let rootNid;
    if (createTop) {
      const top = await this._mkdir(hub_id, nid, folder.name);
      if (!top) {
        Butler.say(LOCALE.UPLOAD_ERROR || "Upload failed");
        this.model.unset(_a.folder);
        this.model.unset(_a.file);
        this.isUploading = 0;
        this.trigger(_e.reset);
        return;
      }
      rootNid = top.nid != null ? top.nid : top.home_id;

      /**
       * Adoption is DEFERRED to afterUpload (refresh-by-nid). Do NOT restart
       * `this` here: a mid-flight restart re-renders the widget and clobbers the
       * uploader child created below, so files never upload. The created top is
       * not broadcast-added on this client (make_dir echoId matches -> newContent
       * skips), so deferring adoption causes no duplicate.
       * No `relpath` on _uploadBase -> afterUpload refreshes by nid (shared-hub
       * safe) and skips the empty-folder loop.
       */
      if (updateOnComplete) {
        this._uploadBase = { hub_id, nid: rootNid };
      }
    } else {
      rootNid = nid;
      if (updateOnComplete) {
        this._uploadBase = { hub_id, nid: rootNid };
      }
    }

    /** Read all entries of a directory reader, batching until empty. */
    const readAll = (reader) =>
      new Promise((resolve, reject) => {
        const out = [];
        const step = () =>
          reader.readEntries((entries) => {
            if (!entries.length) return resolve(out);
            for (const e of entries) out.push(e);
            step();
          }, reject);
        step();
      });

    /** Resolve a FileSystemFileEntry to a stable File object (null on failure). */
    const entryToFile = (fe) =>
      new Promise((resolve) => fe.file((f) => resolve(f), () => resolve(null)));

    /**
     * Phase A — read the ENTIRE tree up-front into stable File objects + a
     * pre-ordered list of dir paths, doing NO network in between. Drag-drop
     * FileSystemEntry objects expire shortly after the drop task: if we await a
     * make_dir network round-trip and only THEN read a subdir's entries / a
     * file's content, the now-expired entry's readEntries()/.file() silently
     * fails — which is why files inside subfolders went missing. Reading
     * everything first (local, fast) sidesteps expiry; File objects don't expire.
     * `parentPath` is relative to the dropped folder ("" = its root).
     */
    const filePromises = []; // Promise<{ file: File, parentPath } | null>
    const dirPaths = [];     // relative dir paths (sorted by depth below)
    /**
     * Fire entry.file() the MOMENT a file is discovered (do NOT await it
     * sequentially) and recurse sibling subdirs in PARALLEL. Drag-drop entries
     * expire fast; a slow sequential traversal lets deep dirs (e.g.
     * icons/src/raw, with hundreds of files) expire before scan reaches them —
     * their readEntries() then fails and the whole subtree's files are lost.
     * Firing reads immediately + parallel recursion keeps the live window as
     * small as possible. File objects, once obtained, do not expire.
     */
    const scan = async (dirEntry, relPath) => {
      let entries;
      try {
        entries = await readAll(dirEntry.createReader());
      } catch (e) {
        this.warn("readEntries failed", relPath, e);
        return;
      }
      const subScans = [];
      for (const entry of entries) {
        if (IGNORED_FILES.test(entry.name)) continue;
        if (entry.isFile) {
          filePromises.push(
            entryToFile(entry).then((f) => {
              if (f) return { file: f, parentPath: relPath };
              this.warn("entry.file() failed", relPath, entry.name);
              return null;
            })
          );
        } else if (entry.isDirectory) {
          const childPath = relPath ? `${relPath}/${entry.name}` : entry.name;
          dirPaths.push(childPath);
          subScans.push(scan(entry, childPath));
        }
      }
      await Promise.all(subScans);
    };
    await scan(folder, "");
    const fileList = (await Promise.all(filePromises)).filter(Boolean);
    /** Parallel scan loses pre-order; sort so phase B creates parents first. */
    dirPaths.sort((a, b) => a.split("/").length - b.split("/").length);

    /**
     * Phase B — create the dir scaffold (parent before child, hence dirPaths is
     * pre-ordered), mapping each relative path to its created nid.
     */
    const pathNid = new Map();
    pathNid.set("", rootNid);
    for (const dp of dirPaths) {
      const slash = dp.lastIndexOf("/");
      const parentPath = slash >= 0 ? dp.slice(0, slash) : "";
      const name = slash >= 0 ? dp.slice(slash + 1) : dp;
      const parentNid = pathNid.get(parentPath);
      if (parentNid == null) {
        this.warn("missing parent nid for dir", dp);
        continue;
      }
      const node = await this._mkdir(hub_id, parentNid, name);
      if (node) pathNid.set(dp, node.nid != null ? node.nid : node.home_id);
    }

    if (!fileList.length) {
      /**
       * Only (empty) dirs — already created in phase B. Do NOT spin up an
       * uploader (its idle spool would self-destruct). Finalize directly with a
       * no-op stub satisfying afterUpload's c.isCanceled()/c.getFailed() usage.
       */
      this.afterUpload({ isCanceled: () => false, getFailed: () => [] });
      return;
    }

    /**
     * Phase C — enqueue every file (stable File objects → no expiry, and
     * checkQuota uses file.size directly) into its parent folder's real nid in
     * one burst so the uploader's spool never sees an empty queue mid-flight.
     * NO ownpath: files go straight into the created folder nids.
     */
    const queue = this.uploader(1);
    queue.add(
      fileList.map(({ file, parentPath }) => {
        const nid = pathNid.get(parentPath);
        return { destination: { hub_id, nid: nid != null ? nid : rootNid }, file };
      })
    );
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
          // Opening the file clears its notification-origin highlight too.
          this._setNotifyHighlight(false);
        }
      });
    } else if (this.isHub || this.isFolder) {
    }
    this.spinner(state, timeout);
    this._isWaiting = state;
    // Stamp the latch so interact's click guard can expire it: nothing
    // guarantees the opener calls wait(0) on failure (e.g. a player that
    // never finishes loading), and a stuck _isWaiting makes the tile
    // permanently unopenable until page reload.
    this._waitingSince = state ? timestamp() : 0;
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
        // The folder/file opened from this cell (via sender / uploaded file /
        // filename click) has now been viewed and its window closed — clear the
        // new-file badge so the grid notify highlight is removed. `_notify` is
        // the count element; renderNotification(0) also zeroes the container's
        // data-count that the highlight keys off. (Was gated on `this.__notify`,
        // which is never assigned — so this clear never ran.)
        if (this._notify) {
          this.mset({ new_file: 0, new_media: 0 });
          this.renderNotification(0);
          this._setNotifyHighlight(false);
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
    // A server-generated content poster (office/pdf first page, marked via
    // metadata.poster) makes the node image-capable — this is the per-node
    // gate for office docs so they only show a thumbnail once it exists.
    const _md = this.metadata();
    if (_md && _md.poster) return 1;
    if (/^\-/.test(this.mget(_a.capability))) return 0;
    const ext = this._fileExt();
    switch (ext) {
      case 'svg':
        return 1;
      // PDF: the server rasterizes page 1 on demand (create_document_thumb →
      // gm convert orig.pdf[0]); show that content thumbnail instead of an icon.
      case _a.pdf:
        return 1;
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
    if (window.Wm && _.isFunction(Wm.removeMediaSelection)) {
      return Wm.removeMediaSelection(this);
    }
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
      let echoId = this.mget(ECHO_ID);
      this.model.clear();
      this.model.set({ widgetId, echoId, ...data, ...opt, actual_home_id: data.home_id, service: OPEN_NODE });
      this._pendingSeed = 0;
      this.status = null;
      this.phase = null;
      this.service = _a.idle;
      this.el.dataset.status = "";
      this.initData();
      this.initURL();
      this.initContainer();
      this.feed(this.container);
      this.unselect();
      this.trigger(_e.restart);
      this.trigger("media:created");
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
    this.service = _a.idle;
    this.status = _a.idle;
    if (!data) return;
    if (_.isArray(data)) {
      data = data[0];
    }
    // Don't call _onMoveDone for copy — it's designed for move/cut-paste
    // where the source widget relocates. For copy, the source stays put
    // and the new item is added via WS broadcast or HTTP response addMedia().
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
    const parent =
      this.logicalParent ||
      (_.isFunction(this.getLogicalParent) && this.getLogicalParent());
    if (parent && _.isFunction(parent.onMediaRenamed)) {
      parent.onMediaRenamed(this, data);
    }
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
      /** merge: contents go INTO the same-named existing folder; no new top */
      existing.uploadFolder(folder, { merge: 1 });
      existing.once(_e.reset, () => {
        this.cut()
      })
    }).catch(async (r) => {
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
            // The server locates the archive at <id>/<zipname>.zip, so use the
            // name it returned (persisted in __dispatchRest) rather than the
            // completion message — which may omit zipname — and URL-encode it
            // (archive names carry spaces/colons, e.g. "Drumee-2026-05-31 04:45").
            const zipname =
              this.mget("zipname") || data.zipname || this.mget(_a.filename);
            // Carry the secure-share token (when present, e.g. a nested folder
            // window opened from a DMZ share) so the server download guard fires —
            // a view-only recipient cannot retrieve the zip. Absent for normal
            // desk downloads → URL unchanged.
            const _sst = this.mget(_a.token) ? `&token=${encodeURIComponent(this.mget(_a.token))}` : '';
            let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${zip_id}&keysel=${keysel}&zipname=${encodeURIComponent(zipname)}${_sst}`;
            this.getFromUrl(url);
            // Native browser download (no in-app byte progress possible). Show a
            // simulated size-scaled progress bar instead of the plain alert so
            // the user sees motion + can tell it's working. Download unchanged.
            Wm.downloadNotice(zipname, this._zipsize);
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
    if (this._waitingForZip !== data.nid) {
      return;
    }
    this._waitingForZip = null;
    this.download(data);
  }

  /**
   * Build the signed media.zip URL and stream the archive.
   *
   * Overrides the ui-core default, which passed the archive name under the
   * query key `name`. The server's media.zip handler does
   * `input.need('zipname')` AND locates the file at `<id>/<zipname>.zip`, so
   * the wrong key produced "VARIABLE zipname IS MANDATORY" (412) and the
   * hub/folder download never started. We send the correct `zipname` key
   * (URL-encoded — the server names archives with spaces/colons, e.g.
   * "Drumee-2026-05-31 04:45"), sourcing it from the caller, then the model
   * (persisted in __dispatchRest), then the filename as a last resort.
   */
  download_zip(o = {}) {
    const { svc, keysel } = bootstrap();
    const type = this.mget(_a.filetype);
    // Reject null/undefined AND the literal strings "null"/"undefined" (which
    // can leak in from the async zip-complete message) so the saved file is
    // never named "null.zip". Prefer the name the server returned (persisted
    // in __dispatchRest), then the node's own name, then a dated fallback.
    const clean = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s && s !== "null" && s !== "undefined" ? s : null;
    };
    const zipname =
      clean(o.zipname) ||
      clean(this.mget("zipname")) ||
      clean(this.mget(_a.filename)) ||
      clean(this.mget(_a.name)) ||
      Dayjs().format("[drumee]-YYYY-MM-DD");
    let hub_id = this.mget(_a.hub_id);
    let nid = this.mget(_a.nid);
    switch (type) {
      case null:
      case undefined:
        if (!Visitor.inDmz) {
          nid = Visitor.get(_a.home_id);
          hub_id = Visitor.get(_a.id);
        }
        break;
      case _a.hub:
        nid = this.mget(_a.actual_home_id);
        hub_id = this.mget(_a.hub_id);
        break;
      default:
        hub_id = this.mget(_a.hub_id);
        nid = this.mget(_a.nid);
    }
    const _sst = this.mget(_a.token) ? `&token=${encodeURIComponent(this.mget(_a.token))}` : '';
    let url =
      `${svc}media.zip?keysel=${keysel}&hub_id=${hub_id}&nid=${nid}` +
      `&id=${o.zipid}&zipname=${encodeURIComponent(zipname)}${_sst}`;
    if (o.backup) url += `&backup=${o.backup}`;
    return this.fetchFile({
      url,
      progress: o.progress || this._progress,
      download: `${zipname}.zip`,
    });
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
      // Was Wm.alert(LOCALE.QUOTA_EXCEEDED): a bare "Your quota has been
      // exceeded" with an OK button and nowhere to go. The card names the
      // limit and, for anyone who can act on it, offers the billing screen.
      // Figures come from the server's own refusal where it sent them, so the
      // card states the numbers the SERVER measured rather than a client-side
      // estimate that may disagree with the decision the user just hit.
      Wm.openQuotaExceeded({
        limit: "storage",
        used: res.used,
        cap: res.limit != null ? res.limit : res.storage,
      });
      // Every upload still queued behind this one will be refused for the same
      // reason, so the progress window is reporting work that cannot finish.
      // Required lazily: media/core is loaded on paths that never touch the
      // uploader, and a top-level require would pull the whole window in.
      try {
        require("builtins/window/upload-progress").dismissForQuota();
      } catch (e) {
        /* uploader not loaded on this path — nothing to dismiss */
      }
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
          // Persist zipname now: the async zip-complete WS message that later
          // drives download_zip() may not echo it, and the server's media.zip
          // endpoint needs zipname to locate <id>/<zipname>.zip.
          this.mset({ zipid: data.zipid, zipname: data.zipname });
          this._zipsize = data.size;
          if (this._progress) this._progress.setLabel(LOCALE.PREPARING);
        }
        break;
      case SERVICE.media.make_dir:
      case SERVICE.media.get_node_attr:
        // Consumed via the postService() return value (folder creation during
        // make_dir-first folder upload / node refresh) — no REST-dispatch action
        // needed. Explicit no-op avoids the "unexpected service" console noise.
        return;
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
