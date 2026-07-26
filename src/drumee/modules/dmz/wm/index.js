const winman = require('window/manager');
const WS_EVENT = "ws:event";
const EOD = "end:of:data";

class __dmz_wm extends winman {
  constructor(...args) {
    super(...args);
    this.capture = this.capture.bind(this);
    this._upload = this._upload.bind(this);
    this.reorder = this.reorder.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.getLocalSelection = this.getLocalSelection.bind(this);
    this._getViewerPosition = this._getViewerPosition.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.openContent = this.openContent.bind(this);
    this._getFile = this._getFile.bind(this);
    this.download = this.download.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._displayContent = this._displayContent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.fig = 1;
    this.prototype.events = {
      drop: '_upload',
      dragenter: 'fileDragEnter',
      dragover: 'fileDragOver'
    };
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.offsetY = 0;
    this.declareHandlers();
    this.isDmz = 1;
    this.offsetHeight = 230;
    // In-place sub-folder navigation (Cases 3+4): a sub-folder is re-listed in
    // THIS grid rather than launching a floating desk window_folder — that window
    // couldn't be moved in the DMZ (its drag-containment references the global Wm,
    // which here is this constrained share panel) and rendered a second chat panel
    // on top of the sharebox's. _folderStack is the trail of entered sub-folders;
    // empty = at the share root (_rootNid).
    this._rootNid = opt.nid;
    this._folderStack = [];
    this.mset({
      nid: opt.nid,
      home_id: opt.home_id,
      hub_id: opt.hub_id
    });
  }

  /**
   * 
   */
  onDestroy() {
    this.unbindEvent();
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  capture(m) {
    if (!m) return
    if (!m.isPseudo) {
      this.warn("Accept only pseudo media", m);
      return;
    }
    const t = this.selectWindow(m);
    if (!t) {
      return;
    }
    return this._target = t.seek_insertion(m);
  }

  /**
   * 
   * @returns 
   */
  route() {
    const args = Visitor.parseModule();
    if (args[3] !== 'wm') {
      return;
    }
    let opt = Visitor.parseModuleArgs();
    switch (args[4]) {
      case _a.open:
        if (opt.filetype == _a.folder) {
          return;
        }

        const fileTypes = [_a.audio, _a.video, _a.image, _a.video, _a.document];
        if ((opt.kind == _a.media) || fileTypes.includes(opt.filetype)) {
          return this.fetchMediaAttributes(opt);
        }
        var o = null;
        if (opt.Kind) {
          o = { explicit: 1 };
        }
        this.launch(opt, o);
        break;

      case 'mfs':
        this.fetchMediaAttributes(opt);
        break;

    }
  }

  /**
   * Open a tile. SUB-FOLDERS navigate IN PLACE (re-list this grid with the child
   * nid, reusing the token/cap-aware getCurrentApi) instead of launching a desk
   * window_folder — that floating window couldn't be moved in the DMZ (its
   * drag-containment references the global Wm = this constrained panel) and
   * rendered a second chat panel over the sharebox's (Cases 3 & 4). FILES are
   * UNCHANGED — they fall through to the inherited openContent (players/preview).
   */
  openContent(media, args) {
    if (media && media.mget && media.mget(_a.filetype) === _a.folder) {
      if (!media.wait) return;
      if (media.mget(_a.status) === _a.deleted) { media.wait(0); return; }
      media.wait(0);
      const childNid = media.mget(_a.nid);
      if (!childNid) return;
      const childName =
        media.mget(_a.filename) || media.mget(_a.name) || LOCALE.FOLDER;
      this._folderStack.push({ nid: childNid, name: childName });
      return this._navToCurrentFolder();
    }
    return super.openContent(media, args);
  }

  /**
   * Re-list the grid at the current folder (top of _folderStack, or the share
   * root when the stack is empty) and tell the sharebox to refresh the header
   * breadcrumb (the sharebox owns the topbar). The notify reuses the same
   * triggerHandlers→sharebox.onUiEvent path the wm already uses for
   * dmz-request-download.
   */
  _navToCurrentFolder() {
    const cur = this._folderStack[this._folderStack.length - 1];
    const nid = cur ? cur.nid : this._rootNid;
    this.mset({ nid });
    this.triggerHandlers({ service: "dmz-nav-changed" });
    return this.ensurePart(_a.list).then((l) => {
      if (l && l.setApi) l.setApi(this.getCurrentApi());
      if (l && l.restart) l.restart();
    });
  }

  /**
   * Navigate to a header-breadcrumb level: keep `depth` entries of _folderStack
   * (depth 0 = the share root, depth k = the k-th entered sub-folder). Called by
   * the sharebox when a crumb is clicked.
   */
  navigateToStackIndex(depth) {
    const d = Math.max(0, ~~depth);
    if (d >= this._folderStack.length) return;
    this._folderStack = this._folderStack.slice(0, d);
    return this._navToCurrentFolder();
  }

  /**
   * The recipient's current folder trail (each {nid, name} below the share
   * root). Read by the sharebox to build the header breadcrumb.
   */
  folderTrail() {
    return this._folderStack || [];
  }

  /**
   * Force the share's privilege onto every window opened from the DMZ WM so
   * players never inherit the file's full hub privilege from node_info.
   */
  getWindowPreset(c, opt) {
    const item = super.getWindowPreset(c, opt);
    const sharePriv = ~~this.mget(_a.privilege);
    item.privilege = sharePriv;
    // Players copy props (incl. privilege) from item.media via
    // copyPropertiesFrom, which would otherwise re-elevate to the file's FULL
    // hub privilege — the guest session is cookie-bound to the share creator, so
    // node listings carry the creator's privilege. Pin the media model to the
    // share privilege so e.g. a view-only share can't expose a working download
    // button in the player.
    if (item.media && item.media.mset) item.media.mset(_a.privilege, sharePriv);
    // Propagate the share TOKEN to every window opened from the DMZ WM. A nested
    // sub-folder opens as its own window/folder, whose make_dir/upload already send
    // `mget(token)` — but without it pinned here the launched window has no token,
    // so the server write-guard (media.js _secureShareWriteAllowed) sees none,
    // returns "allowed", and the creator-bound guest session's full privilege lets a
    // VIEW-ONLY recipient write one layer deep. Pinning the token closes that hole at
    // every nesting level (the guard re-derives caps from the token, not the folder).
    const shareToken = this.mget(_a.token);
    if (shareToken) {
      item.token = shareToken;
      if (item.media && item.media.mset) item.media.mset(_a.token, shareToken);
    }
    // Pin the creator's signed owner-edit token (present ONLY when the genuine owner
    // is previewing their own link — dmz.login mints it for is_owner) so the office
    // editor can let the creator follow the link's edit permission. Sourced from the
    // sharebox (`desk`), which stored the dmz.login response. Absent for recipients /
    // anonymous openers → no effect there (byte-identical behaviour).
    const _sb = this.mget('desk');
    const ownerEditToken = (_sb && _sb.mget) ? _sb.mget('owner_edit_token') : this.mget('owner_edit_token');
    if (ownerEditToken) {
      // Set on `item` (top-level) — the launched window/player model is built from
      // `item`, so document edit() reads it via this.mget (mirrors item.token above) —
      // AND on item.media for grid/list consumers.
      item.owner_edit_token = ownerEditToken;
      if (item.media && item.media.mset) item.media.mset('owner_edit_token', ownerEditToken);
    }
    return item;
  }

  /**
  *
  */
  fetchMediaAttributes(opt) {
    return this.fetchService(SERVICE.media.node_info, {
      nid: opt.nid,
      hub_id: opt.hub_id
    }).then((r) => {
      let m = new Backbone.Model(r);
      opt = { ...opt, ...r };
      // node_info returns the file's full hub privilege; override with the
      // share's restricted privilege so players respect the share access level.
      // Pin the media model too — the player copies privilege from it
      // (copyPropertiesFrom), which would otherwise re-elevate past the share.
      if (this.isDmz) {
        opt.privilege = ~~this.mget(_a.privilege);
        m.set(_a.privilege, opt.privilege);
      }
      Kind.waitFor(_a.media).then((k) => {
        opt.media = new k({ model: m });
        this.launch(opt, { explicit: 1 });
      })
    }).catch((e) => {
      this.warn("Failed to fetch info", e)
      Butler.say(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * 
   */
  insert() { }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _upload(e) {
    // Drag-and-drop hits this handler DIRECTLY (the drop event), bypassing the
    // sharebox topbar gate that the Upload button / "+ Add new" go through. Re-apply
    // that gate here so an anonymous visitor (or a signed-in non-member without the
    // write grant) meets the sign-up / Request-Access flow instead of starting a
    // doomed upload — otherwise the A3 read-only ceiling blocks the server write and
    // the recipient is left staring at a stuck 100% progress window. The sharebox is
    // stored on the model as `desk`; _gateInteraction returns true when it gated.
    //
    const desk = this.mget('desk');
    // A single-FILE share has no writable container: only the shared file was shared,
    // not a folder to upload into. The Upload button + "+ Add new" are already hidden
    // for file shares (desk-content.js keys off the same sharebox `file_nid`), but
    // drag-and-drop reaches this drop handler regardless — refuse it here too (the
    // server also denies it; this avoids a doomed request + stuck progress window).
    // Folder/workspace shares (no file_nid) proceed unchanged.
    if (desk && desk.mget('file_nid')) {
      return Butler.say(LOCALE.SECURE_SHARE_FILE_ONLY_NO_UPLOAD || LOCALE.SOMETHING_WENT_WRONG);
    }
    if (desk && desk._gateInteraction &&
      desk._gateInteraction(desk.havePermission(_K.permission.write, desk.mget(_a.privilege)))) {
      return;
    }
    return this.upload(e, this.mget(_a.token));
  }

  /**
   *
   * @param {*} m
   * @returns
   */
  reorder(m) {

  }

  /**
   * Persisting tile order is not a share-recipient feature, and the server call
   * (media.reorder, scope:hub src:delete) sends no nid, so its ACL falls back to
   * the hub home — where a non-member recipient has no grant → 403. The base
   * _syncOrder still fires it after insertMedia (its `permission.modify` guard
   * passes for a can_edit recipient). The note is already saved and its tile
   * inserted locally, so skip the server reorder entirely (notify() is a no-op).
   */
  _syncOrder() { }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "browser-wraper":
        return this._content = child;

      case _a.list:
        this.iconsList = child;
        // The dmz list bypasses buildIconsList (the home-wm path that wires
        // partitioning), so set up the same 3-tier folder/file partition here
        // (mirrors window-folder). The MutationObserver buckets tiles into
        // .folder-section / .file-section as they arrive; the EOD pass handles
        // the initial load. Guarded so it no-ops if the mixin is ever absent.
        if (typeof this._setupPartitionObserver === "function") {
          this._partitionListPart = child;
          child.el.dataset.role = _a.container;
          this._setupPartitionObserver(child);
          child.once(EOD, () => {
            this._partitionFoldersAndFiles(child);
          });
        }
        break;

      case 'windows-layer':
        this.windowsLayer = child;
        child.onAddKid = c => {
          c.once(_e.destroy, () => {
            const last = child.children.last();
            if ((last != null) && _.isFunction(last.raise)) {
              return last.raise();
            }
          })
          child.el.style.width = '';
          return child.el.style.height = '';
        }

        child.collection.on(_e.remove, function () { });
        return child.on(_e.show, () => {
          this.trigger("content:ready", child);
          this.route();
        });

      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Abstract
   */
  autoMenu() {
  }

  /**
   * 
   */
  getLocalSelection() {
    const f = [];
    this.iconsList.children.each(function (c) {
      if (c.model.get(_a.state)) {
        return f.push(c);
      }
    });
    if (_.isEmpty(f)) return this.iconsList.children.toArray();
    return f;
  }

  /**
   * 
   * @param {*} c 
   */
  _getViewerPosition(c) {
    const width = this.$el.width();
    const height = this.$el.height();
    const p = c.$el.position();
    p.width = _K.docViewer.width; //_K.browser.width
    p.height = _K.docViewer.height; //_K.browser.height
    p.zIndex = 1000 + this.windowsLayer.collection.length;
    if ((p.left + _K.docViewer.width) > width) {
      p.left = width - _K.docViewer.width - 52;
      if (p.left < 0) {
        p.left = 0;
      }
    }
    if ((p.top + _K.docViewer.height) > height) {
      p.top = height - _K.docViewer.height - 52;
      if (p.top < 0) {
        p.top = 0;
      }
    }
    return p;
  }

  /**
  *
  */
  async onDomRefresh() {
    await Kind.waitFor('window_confirm');
    await Kind.waitFor('media_uploader');
    this.feed(require('./skeleton').default(this));
    let timer = setInterval(() => {
      let event = wsRouter.hasListener(this);
      if (event && event.length) {
        clearInterval(timer);
        return;
      }
      this.bindEvent("live");
    }, 2000)

  }

  /**
   *
   */
  // handleUpload() {
  //   let target = this.getActiveWindow();
  //   return this.__fileselector.open((e) => {
  //     if (target && target !== this) target.raise();
  //     this.upload(e);
  //   });
  // }


  /**
   * 
   * @param {*} url 
   * @param {*} nid 
   * @returns 
   */
  _getFile(url, nid) {
    $(`#${nid}`).remove();
    const link = document.createElement(_K.tag.a);
    link.setAttribute(_a.download, null);
    link.style.display = _a.none;
    document.body.appendChild(link);
    link.setAttribute(_a.href, url);
    link.setAttribute(_a.id, nid);
    const $el = $(`#${nid}`);
    const f = () => {
      return $el[0].click();
    };
    this.waitElement($el[0], f);
    return link;
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service =
      args.service ||
      cmd.service ||
      (cmd.model && cmd.model.get(_a.service));
    switch (service) {
      case 'dmz-request-download':
        // A player gated a download (DMZ share, no download grant). Forward to
        // the sharebox (this WM's uiHandler), which routes anonymous visitors to
        // sign-up/login and signed-in non-members to Request Access.
        return this.triggerHandlers({ service: 'dmz-request-download' });

      case _e.download:
        return this.download();

      case _e.upload:
        return this.__fileselector.open(this._upload.bind(this));

      case "open-node":
        return this.openContent(cmd);

      case "filter-by-type": {
        // The toolkit button() stores its `value` on the model, so read
        // cmd.mget('value') first (cmd.options.value was always undefined —
        // that's why filtering did nothing). Fall back to options/args.
        const value =
          (cmd.mget && cmd.mget(_a.value)) ||
          (cmd.options && cmd.options.value) ||
          args.value;
        this.ensurePart(_a.list).then((l) => {
          l.setApi(this.getCurrentApi(value));
          l.restart();
        });
        return;
      }

      case "add-folder":
        return this.ensurePart("wrapper-modal").then((p) => {
          p.feed(require("builtins/window/folder/skeleton/create-folder-dialog")(this));
          p.el.dataset.mode = "create-folder";
          this.ensurePart("create-folder-name").then(
            (entry) => entry.focus && entry.focus(),
          );
        });

      case "close-folder-dialog":
        return this.ensurePart("wrapper-modal").then((p) => {
          p.el.dataset.mode = "";
          p.clear();
        });

      case "create-folder-submit":
        return this._createFolder(cmd);

      case "new-document":
        return this._newDocument(cmd);

      case "add-note":
        return this._newNote();

      // The create-folder name field is flagged `interactive`, so it emits this
      // live keyup event on every keystroke. Folder creation happens on
      // create-folder-submit (Enter / button), so the live signal is a no-op here
      // — swallow it instead of logging "method not processed" on each keypress.
      case _a.interactive:
        return;

      default:
        return this.warn(WARNING.method.unprocessed.format(service));
    }
  }

  /**
   * Create a sub-folder in the shared folder. media.make_dir has the same
   * ACL as media.upload (scope:hub, write) — a write-capable DMZ guest can
   * call it with the share token.
   *
   * @param {*} cmd — the create-folder-submit command (EntryBox or button)
   */
  _createFolder(cmd) {
    if (this._creatingFolder) return;
    this._creatingFolder = 1;
    const entry = this.getPart("create-folder-name");
    const value =
      (cmd.getValue && cmd.getValue()) ||
      (entry && entry.getValue && entry.getValue()) ||
      LOCALE.NEW_FOLDER;
    const filename = String(value).trim() || LOCALE.NEW_FOLDER;
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) {
      this._creatingFolder = 0;
      return Butler.say(LOCALE.INVALID_FILENAME);
    }
    return this.postService(SERVICE.media.make_dir, {
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
      dirname: filename,
      filename,
      token: this.mget(_a.token),
    })
      .then((data) => {
        if (data && (data.error || data.error_code)) {
          return Butler.say(LOCALE[data.error] || data.reason || data.error);
        }
        this.ensurePart("wrapper-modal").then((p) => {
          p.el.dataset.mode = "";
          p.clear();
        });
        this.ensurePart(_a.list).then((l) => l && l.restart && l.restart());
      })
      .catch((e) => {
        this.warn("DMZ create folder failed", e);
        Butler.say(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._creatingFolder = 0;
      });
  }

  /**
   * Create an office document (Document / Spreadsheet / Presentation) in the
   * current share folder, then open it in the editor. Mirrors the desk path
   * (window/core.js newDocument) but TARGETS THIS DMZ wm — not Wm.getActiveWindow,
   * which is empty in the share view — and threads the share TOKEN so the server
   * (euroffice.new_doc) can gate the create to a can_edit recipient + node-scope it
   * to the shared subtree (the creator-bound session alone isn't trusted). The
   * created node arrives in this grid via the server's `media.new` broadcast
   * (handleWsEvent → newContent); the poll then opens it in the editor.
   *
   * @param {*} cmd — the new-document menu command (carries the template `name`)
   */
  _newDocument(cmd) {
    if (this._creatingDoc) return;
    // Resolve the editor namespace from the `doc_editor` sysconf (same as the desk
    // and the document player) rather than hard-coding euroffice/onlyoffice.
    const editor = Platform && Platform.get && Platform.get("doc_editor");
    const ns = editor && SERVICE && SERVICE[editor];
    const service = ns && (ns.new_doc || ns.create || ns.create_doc);
    if (!service) {
      return Butler.say(LOCALE.FEATURE_NOT_AVAILABLE || LOCALE.SOMETHING_WENT_WRONG);
    }
    const name = cmd && cmd.mget && cmd.mget(_a.name);
    if (!name) {
      this.warn("DMZ newDocument: missing template name");
      return;
    }
    this._creatingDoc = 1;
    this.postService(service, {
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      name,
      token: this.mget(_a.token),
    })
      .then((data) => {
        if (!data || !data.nid) return;
        // A file-scoped share filters the grid to the single shared file, so its
        // newContent() never inserts the media.new broadcast and the poll below would
        // never match. Open the created node directly from the server response instead.
        if ((this.mget(_a.api) || {}).file_nid) {
          return this.fetchMediaAttributes({ nid: data.nid, hub_id: data.hub_id || this.mget(_a.hub_id) });
        }
        // Folder share: wait for the new tile to land in this grid (via the media.new
        // broadcast), then open it in the editor. Cleared on success or after a 30s
        // timeout so a missed broadcast can't leave the interval running.
        const timer = setInterval(() => {
          for (let media of this.getItemsByAttr(_a.nid, data.nid)) {
            if (/^media/.test(media.mget(_a.kind))) {
              clearInterval(timer);
              media.wait(1);
              this.openContent(media, { service: "open-node", mode: _a.edit });
            }
          }
        }, 500);
        setTimeout(() => clearInterval(timer), 30000);
      })
      .catch((e) => {
        this.warn("DMZ newDocument: server error", e);
        Butler.say(e.reason || e.error || LOCALE.SOMETHING_WENT_WRONG);
      })
      .finally(() => {
        this._creatingDoc = 0;
      });
  }

  /**
   * Create a markdown note in the current share folder. Mirrors the desk folder
   * window (window/folder/index.js "add-note": Wm.windowsLayer.append) but uses
   * THIS wm's windows-layer and passes `target: this` — the editor's save target
   * is normally Wm.getActiveWindow(), which is empty in the share view, so without
   * an explicit target the note would never save. The DMZ wm is a valid target
   * (mget nid/hub_id, canUpload, insertMedia, getItemsByAttr inherited). The note
   * saves via media.save as the recipient: a signed-in can_edit recipient's
   * node-grant authorizes + node-scopes the write (stage-verified); an anonymous
   * recipient is blocked by the A3 read-only ceiling (media.save is write-src).
   * Editor opens as a draggable window in the windows-layer (markdow extends the
   * player → inherits the DMZ viewport containment).
   */
  _newNote() {
    if (!this.windowsLayer) return;
    return this.windowsLayer.append({
      kind: "editor_markdown",
      uiHandler: [this],
      target: this,
    });
  }

  /**
   * Build the list API for a given filter type. Mirrors window/core.js getCurrentApi
   * but reuses the dmz initial api (set by desk-content.js) as the base so nid /
   * hub_id / share_id / recipient_id aren't lost on filter switches.
   *
   * @param {string} type — one of "all" | "docs" | "pdf" | "image" | "other"
   */
  getCurrentApi(type) {
    const original = this.mget(_a.api) || {};
    const base = {
      service: SERVICE.media.show_node_by,
      page: 1,
      // Explicit sort: without it the server falls back to rank, which with
      // DESC yielded reverse-manual-order. Same modified-newest-first
      // contract as the desk default listing.
      sort: _a.mtime,
      order: _K.order.descending,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
    };
    // Only forward share_id / recipient_id / file_nid when they actually exist.
    // Copying them unconditionally added keys with `undefined` values, which the
    // socket serializes to the literal string "undefined" — the server then
    // filters by share_id="undefined" and returns an empty list (filter looked
    // broken). The window-folder request omits these entirely.
    if (original.share_id != null) base.share_id = original.share_id;
    if (original.recipient_id != null) base.recipient_id = original.recipient_id;
    if (original.file_nid != null) base.file_nid = original.file_nid;
    switch (type) {
      case "all":
      case "docs":
      case "pdf":
      case "image":
      case "other":
        return { ...base, type };
      default:
        return base;
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _displayContent(data) {
    return this.feed(require("./skeleton").default(this, data));
  }


  /**
  * 
  */
  selectItems(data, key = _a.nid, value) {
    value = value || data[key];
    return this.getItemsByAttr(key, value).filter((c) => {
      if (!c) return false;
      if (!data.privilege) {
        data.privilege = c.mget(_a.privilege);
      }
      return (c.isMfs || c.isFolder)
      // return c.isMfs
    })
  }


  /**
   * 
   * @param {*} data 
   */
  onNewHub(data) {
    this.warn("This feature is not allowed within as DMZ", data);
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  newContent(xhr, options = {}) {
    if ((this.mget(_a.api) || {}).file_nid) return;
    super.newContent(xhr, options);
  }

  onWsMessage(service, data, options = {}) {
    let items = [];
    let sender = options.sender;
    this.verbose("[356]onWsMessage:", options.service, data.socket_id, data, options);
    if (sender && sender.socket_id == Visitor.get(_a.socket_id)) {
      if (!options.loopback) return;
    }
    this.trigger(WS_EVENT, { service, data, options })
  }


  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.media.show_node_by:
        return this._displayContent(data);

      case SERVICE.media.download:
        var {
          id
        } = data;
        var h = data.vhost;
        let { svc, protocol, keysel, main_domain, localhost} = bootstrap();
        // In a secure-share context, carry the share token on the zip retrieval URL
        // so the server can enforce the download capability (media.zip guard): a
        // view-only recipient stages a zip but cannot retrieve it. Appended only when
        // a token is present, so regular/non-secure downloads are unchanged.
        const _shareToken = this.mget(_a.token);
        const _tok = _shareToken ? `&token=${encodeURIComponent(_shareToken)}` : '';
        // Encode zipname (it can contain '#'/'&'/spaces) — unencoded, the appended
        // &token would fall into the URL fragment and miss the server download guard.
        // Matches the media/core.js zip-url path.
        const _zip = encodeURIComponent(data.zipname || '');
        let url = `${protocol}://${h}${svc}/media.zip?id=${id}&keysel=${keysel}&zipname=${_zip}${_tok}`;
        if(localhost){
           url = `${protocol}://${main_domain}${svc}/@{h}/media.zip&id=${id}&keysel=${keysel}&zipname=${_zip}${_tok}`;
        }
        return this._getFile(url, id);
    }
  }
}
__dmz_wm.initClass();

module.exports = __dmz_wm;
