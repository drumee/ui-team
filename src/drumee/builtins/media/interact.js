

const { timestamp, loadJS, toggleState } = require("@drumee/ui-essentials")
const Rectangle = require('rectangle-node');
const OPEN_NODE = "open-node";
const ECHO_ID = "echoId";

// Vignette cache, shared by every media tile. Each render used to re-XHR its
// thumbnail blob — and Wm.reload() (every Home click) re-renders EVERY tile,
// re-downloading all thumbs and re-firing a 404 per missing one. Hits are
// keyed by the versioned URL, so a content change (new mtime → new URL)
// naturally misses. Misses are remembered only briefly: thumbs are generated
// asynchronously after upload, so a 404 must be retried on a later render.
const VIGNETTE_CACHE_MAX = 600;
const VIGNETTE_MISS_TTL = 60000;
const _vignetteCache = new Map();
function _vignetteRemember(url, entry) {
  if (_vignetteCache.size >= VIGNETTE_CACHE_MAX) {
    const first = _vignetteCache.keys().next().value;
    _vignetteCache.delete(first);
  }
  _vignetteCache.set(url, entry);
}
require("./skin");
const media_core = require("./core");
const { copyToClipboard } = require("@drumee/ui-essentials")
// Shortens the "Designation link" URL only. Falls back to the long form for
// anything it cannot round-trip — see the module header.
const { toCompactUrl } = require("libs/compact-deep-link");
class __media_interact extends media_core {
  constructor(...args) {
    super(...args);
    this.helper = this.helper.bind(this);
    this.dispatchUiEvent = this.dispatchUiEvent.bind(this);
    this._hover = this._hover.bind(this);
    this._pointerenter = this._pointerenter.bind(this);
    this._pointerleave = this._pointerleave.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragging = this._dragging.bind(this);
    this._dragStop = this._dragStop.bind(this);
  }

  /**
   *
   * @param {*} reason
   * @param {*} timeout
   */
  moveForbiden(reason, timeout) {
    const d = document.getElementById(this._id + "-forbiden");
    _.delay(this.moveAllowed.bind(this), Visitor.timeout());
    if (d) {
      return;
    }
    this.el.dataset.raised = 1;
    this.content.$el.prepend(require("./template/forbiden")(this, reason));
  }

  /**
   *
   */
  moveAllowed() {
    const d = document.getElementById(this._id + "-forbiden");
    this.el.dataset.raised = 0;
    if (d != null) {
      d.remove();
    }
  }

  /**
   *
   */
  helper() {
    return require("./template/helper")(this);
  }

  /**
   *
   * @param {*} ui
   */
  initHelper(ui) {
    let rlPOS = -15;
    let zPOS = 50;
    ui.helper.empty();
    ui.helper.moving = this;
    this.ui = ui;
    const make_helper = (sibling) => {
      sibling.el.dataset.drag = _a.on;
      zPOS = zPOS - 1;
      const helper = sibling.$el.clone();
      helper.moving = sibling;
      rlPOS = rlPOS - 5;
      helper.css({
        position: _a.absolute,
        left: rlPOS,
        top: rlPOS,
        zIndex: zPOS,
        margin: 0,
        opacity: 1,
        width: _K.size.full,
        height: _K.size.full,
      });
      return helper;
    };
    let leader = make_helper(this);
    leader.css({ zIndex: zPOS + 10 });
    this.$el.addClass("leader");
    ui.helper.append(leader);
    const selected = Wm.getGlobalSelection();
    if (!selected.length) {
      return;
    }
    let t = require("./template/files-count")(this, selected.length);
    leader.append(t);
    let i = 0;
    let n = 5;
    this.el.dataset.drag = "leader";
    while (i < n && selected[i] != null) {
      if (selected[i] !== this) {
        ui.helper.append(make_helper(selected[i]));
      }
      i++;
    }
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStart(e, ui) {
    if (!this.allowedAction()) {
      this.moveForbiden(LOCALE.FORBIDEN_MOVE);
      this.disabled = true;
      return;
    }
    window.pointerDragged = true;
    this.el.dataset.drag = _a.on;
    this.initBounds();
    this.initHelper(ui);
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragging(e, ui) {
    if (!this.allowedAction()) {
      return;
    }
    this.selected = {};
    if (this.disabled) {
      return;
    }
    this.rectangle = new Rectangle(
      ui.offset.left,
      ui.offset.top,
      ui.helper.width() * 0.7,
      ui.helper.height() * 0.7
    );
    this.selfOverlapped = this.bbox.intersection(this.rectangle);
    Wm.capture(this);
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStop(e, ui) {
    if (this.isHoveringBin) {
      return;
    }

    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!this.allowedAction()) {
      this.moveAllowed();
      this.disabled = false;

      return;
    }
    this.el.dataset.drag = _a.off;
    const selected = Wm.getGlobalSelection();
    if (selected.length > 1) {
      for (let obj of Array.from(selected)) {
        obj.el.dataset.drag = _a.off;
      }
    }
    this.content.el.dataset.icontype = this.iconType;
    if (!Wm.insert(this) && this.over) {
      this.over.moveIn(this);
    }
    this.initBounds();
    window.pointerDragged = false;

    return true;
  }

  /**
   *
   * @param {*} delay
   */
  initBounds(delay) {
    let ox, oy;
    //if (delay == null) { delay = 700; }
    const o = this.$el.offset();
    try {
      ox = this.getLogicalParent().getOffsetX();
      oy = this.getLogicalParent().getOffsetY();
    } catch (error) {
      ox = 0;
      oy = 0;
    }
    // $el.offset() reports the RENDERED position, shift transform included.
    // Measuring a tile that is still parked in (or sliding back from) an
    // insertion slot would bake that offset into the cache and leave the
    // drag zones sitting beside the tiles they belong to. Subtract whatever
    // shift is currently applied so bbox always describes the resting seat.
    const sx = this._shiftX || 0;
    const sy = this._shiftY || 0;
    this.self = null;
    this.left = null;
    this.right = null;
    this.over = null;
    this.bbox = new Rectangle(
      o.left + ox - sx,
      o.top + oy - sy,
      this.$el.width(),
      this.$el.height()
    );
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.mset(_a.bubble, 0);
    this.el.dataset.role = _a.root;
    if (window.PointerEvent) {
      this.el.onpointerenter = this._pointerenter;
      this.el.onpointerleave = this._pointerleave;
    } else {
      this.el.onmouseenter = this._pointerenter;
      this.el.onmouseleave = this._pointerleave;
    }
    this.service = _a.idle;
    this.el.onclick = this.dispatchUiEvent;
    try {
      const m = JSON.parse(this.mget(_a.metadata));
      if (
        (m._seen_ && !m._seen_[Visitor.id]) ||
        this.mget(_a.phase) === "notify"
      ) {
        this._unseen = 1;
        this.mset({
          notify: "",
        });
      }
    } catch (error) { }
    if (this.mget(_a.uiHandler) == null) {
      this.mset({
        uiHandler: [this.getLogicalParent()],
      });
    }
    this.feed(this.container);
    this.el.dataset.selected = this.mget(_a.state);
    this.el.setAttribute(_a.id, `media-${this._id}`);
    this.parent.off(_e.scroll, this.initBounds.bind(this));
    this.parent.on(_e.scroll, this.initBounds.bind(this));

    if (this.mget(_a.file)) {
      return;
    }

    this.model.set({
      rank: parseInt(this.mget(_a.rank)),
    });
    this.initURL();
    this.syncData();
  }

  /**
   *
   */
  defaultTrigger(e) {
    if (pointerDragged) {
      return;
    }
    this.service = this.mget(_a.service) || OPEN_NODE;
    this.model.set(_a.state, 0);
    this.el.dataset.selected = 0;
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.service = this.service;
    if (this.waitPreview()) return;
    this.wait(1, 1000);
    this.triggerHandlers(e);
    if (this.isHubOrFolder) {
      this.el.dataset.read = 0;
    } else {
      if (this._unseen) {
        this.markAsSeen();
      }
    }
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e);
    if (service != "tick") {
      let delay = 1000;
      if (this.mget(_a.filetype) === _a.document) delay = 5000;
      // The wait-latch expires after 30s: openers are supposed to call
      // wait(0), but a failed open (player never loads) may not, and a
      // stale latch would otherwise lock this tile until page reload.
      const stillWaiting =
        this._isWaiting &&
        this._waitingSince &&
        timestamp() - this._waitingSince < 30000;
      if (stillWaiting || timestamp() - this._clickTimestap < delay)
        return;
    }
    this._clickTimestap = timestamp();
    switch (service) {
      case "open-creator":
      case "open-settings":
      case _a.outbound:
      case _a.inbound:
      case _a.access:
        this.service = service;
        this.triggerHandlers({ service });
        break;

      case "tick":
        this.tick(e);
        break;

      case "commit-rename": {
        this.commitRename(e);
        break;
      }
      case _e.rename: {
        this.prepareRename(e);
        break;
      }
      case "enable":
        this.toggleStatus();
        break;

      case "remove-upload":
      case "remove-minifyer":
      case "remove-transfer":
        this.removeMedia(e, service);
        break;

      case _e.download:
        break;

      case "wait-preview":
        Wm.alert(LOCALE.WAIT_FOR_CREATION.format(LOCALE.PREVIEW));
        break;

      case _a.href:
        let c = e.target;
        let url = null;
        while (c) {
          url = c.getAttribute(_a.url);
          if (url) break;
          c = c.parentElement;
        }
        let opt = Visitor.parseLocation(url);
        this.triggerHandlers({
          service: _e.launch,
          hub_id: opt.hub_id,
          kind: opt.kind,
        });
        this._pendingMeeting = opt.hub_id;
        this.restart();
        break;

      case undefined:
      case null:
        this.defaultTrigger(e);
        break;

      default:
        if (e.target.tagName.match(/^(input)$/i)) {
          return;
        }
        if (this.entry && !this.entry.isDestroyed()) {
          this.collection.remove(this.entry.model);
        }
    }

    return false;
  }

  /**
   *
   */
  _setupInteract() {
    const opt = {
      distance: 5,
      cursorAt: this.cursorPosition,
      start: this._dragStart,
      drag: this._dragging,
      stop: this._dragStop,
      opacity: 0.7,
      helper: this.helper,
      handle: `.${this.fig.family}__container`,
      containment: [0, 40, window.innerWidth, window.innerHeight - 40], //Desk.$el
      appendTo: _a.body, // Desk.$el #
      scroll: false,
    };
    const k = () => {
      this.$el.draggable(opt);
      this.initBounds();
    };
    this.waitElement(this.el, k);

    const mimetype = this.mget(_a.mimetype);
    if (mimetype != null && this.mget(_a.mimetype).match(/^audio/)) {
      this.model.set(_a.filetype, _a.audio);
    }

    this.content.el.dataset.capability = this.imgCapable();
    if (this._oldType != null) {
      this.$el.removeClass(this._oldType);
    }
    this.$el.addClass(this.mget(_a.filetype));
    this.$el.addClass(this.mget(_a.area));
    this._oldType = this.mget(_a.filetype);

    const id = this._id + "-notify-count";
    this.waitElement(id, () => {
      this._notify = document.getElementById(id);
      if (this._renameOnStart) {
        this.rename();
      }
    });

    const tt_id = this._id + "-filename";
    this.waitElement(tt_id, () => {
      this._longName = document.getElementById(tt_id);
      this._longName.onmouseenter = (e) => {
        if (e.buttons) return;
        this._filenameHover(_a.on, e);
      };
      this._longName.onmouseleave = (e) => {
        clearTimeout(this._timer.filename);
        this._filenameHover(_a.off, e);
      };
    });
  }

  /**
   *
   */
  _mobileInteract() {
    thiw.debug("MOBILE INTERACT : TBD");
  }

  /**
   *
   */
  setupInteract() {
    if (this.mget(_a.interactive) === 0) return;
    let filetype = this.mget(_a.filetype);
    let f = filetype == _a.vector ? _a.orig : _a.vignette;
    const { url } = this.actualNode(f);
    this.model.atLeast({ url });
    switch (filetype) {
      case _a.video:
      case _a.image:
      case _a.vector: {
        const showMissing = () => {
          this.mset(_a.capability, 0);
          this.content.el.innerHTML = this.innerContent(this);
          this._setupInteract();
          this.trigger("content-ready");
        };
        const showThumb = (blobUrl) => {
          this.mset(_a.url, blobUrl);
          this.content.el.innerHTML = this.innerContent(this, blobUrl);
          this._setupInteract();
          this.trigger("content-ready");
        };
        const cached = _vignetteCache.get(url);
        if (cached) {
          if (cached.blobUrl) return showThumb(cached.blobUrl);
          if (timestamp() - cached.missedAt < VIGNETTE_MISS_TTL)
            return showMissing();
          _vignetteCache.delete(url);
        }
        this.fetchFile({ url })
          .then(async (blob) => {
            if (!blob) {
              this.warn(`Got no blob from ${url}`);
              return;
            }
            switch (blob.error) {
              case 404:
                _vignetteRemember(url, { missedAt: timestamp() });
                showMissing();
                // Missing vignette is common for stale dev data or not-yet-generated thumbs.
                if (this.verbose) {
                  this.verbose(`Vignette not found ${url}, showing fallback icon`);
                }
                return;//this.suppress();
              default:
                if (blob.error) return;
            }

            let u = URL.createObjectURL(blob);
            _vignetteRemember(url, { blobUrl: u });
            showThumb(u);
          })
          .catch((e) => {
            this.mset({ filetype: _a.error });
            this.content.el.innerHTML = this.innerContent(this);
            this._setupInteract();
          });
        break;
      }
      default:
        this.content.el.innerHTML = this.innerContent(this);
        this._setupInteract();
        this.trigger("content-ready");
    }
  }


  /**
   * 
   * @param {*} ui 
   * @returns 
   */
  moved(ui) {
    const dx = Math.abs(ui.originalPosition.left - ui.position.left);
    const dy = Math.abs(ui.originalPosition.top - ui.position.top);
    if (dx < 175 && dy < 50) {
      return false;
    }
    return true;
  }

  /**
   *
   */
  unselect() {
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
   * @param {*} value
   * @param {*} service
   */
  async _createInput(value, opt) {
    if (value == null) {
      value = "no name";
    }
    const multiline = /\<br\>/.test(value);
    value = value.replace(/\<br\>/g, "\n");
    await Kind.waitFor('entry')
    this.append(
      Skeletons.Textarea({
        className: `${this.fig.family}__input`,
        sys_pn: _a.entry,
        name: _a.lastname,
        volatility: 1,
        value,
        require: _a.any,
        bubble: 0,
        mode: _a.commit,
        rows: this.rowsCount(value),
        uiHandler: [this],
        partHandler: [this],
        ignoreEnter: true,
        preselect: 1,
        removeOnEscape: 1,
        ...opt
      })
    );

    const c = this.children.last();
    c.on(_e.keyup, (a) => {
      let r;
      if (!a.target) {
        return;
      }
      if (a.target.value.length > 12 || multiline) {
        r = 2;
      } else {
        r = 1;
      }
      return a.target.setAttribute(_a.data.row, r);
    });
    const id = this._id + "-filename";
    this._filename = null;
    this.waitElement(id, () => {
      this._filename = document.getElementById(this._id + "-filename");
      return (this._filename.style.visibility = _a.hidden);
    });
    c.once(_e.destroy, (a) => {
      return (this._filename.style.visibility = _a.visible);
    });

    RADIO_CLICK.trigger(_e.click);
  }

  /**
   * Create a copy beside this media item. The live update owns grid insertion so the
   * HTTP response and WebSocket broadcast cannot add the same copy twice.
   */
  duplicateInPlace() {
    const echoId = Visitor.get(_a.echoId);
    return this.postService(
      SERVICE.media.copy,
      {
        service: SERVICE.media.copy,
        nid: this.mget(_a.nodeId),
        pid: this.mget(_a.pid),
        action: _a.copy,
        recipient_id: this.mget(_a.hub_id),
        hub_id: this.mget(_a.hub_id),
        echoId,
      },
      { async: 1 },
    )
      .then((data) => {
        if (data && data.error) {
          const message = data.reason || data.error.message || data.error;
          return Wm.alert(message || LOCALE.TRY_AGAIN);
        }
        Wm.unselect && Wm.unselect();
      })
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN));
  }

  /**
   * @param {Letc} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    let { nid, hub_id } = this.actualNode();
    this.verbose("media:service[607]", service, args)
    switch (service) {
      case _e.rename:
        this.service = service;
        if (cmd.status == _e.Escape) {
          return;
        }
        if ([_a.commit, _e.Enter].includes(cmd.status)) {
          return this.requestRename(cmd);
        } else {
          const fname = cmd.mget(_a.value);
          this._nameConflict = null;
          if (this._nameExists(fname)) {
            return (this._nameConflict = fname);
          }
        }
        break;
      case 'add-folder':
        this.service = service;
        const filename = cmd.mget(_a.value);
        this.mset({ filename })
        if ([_a.commit, _e.Enter].includes(cmd.status)) {
          const filename = cmd.mget(_a.value);
          this.mkdir(filename);
          return;
        }
        break;

      case OPEN_NODE:
        return this.triggerHandlers({ service, mode: _a.edit });

      case "direct-rename":
        return this.rename();

      case "organize":
        // Organize: shows submenu with Move + Link to task tracker.
        // Submenu rendering handled by contextmenu skin (hover state).
        return;

      case "move":
        // Open move-to dialog (existing flow); fallback to duplicate-target picker.
        if (typeof this.move === "function") return this.move();
        return this.warn("move handler not implemented for this media");

      case "link-to-task-tracker":
        return this.linkToTaskTracker();

      case _a.duplicate:
        return this.duplicateInPlace();

      case "set-as-homepage":
        return this.postService(SERVICE.media.set_homepage, ({ nid, hub_id }));

      case _e.download:
        return this.download();

      case 'open-in-window': {
        // Force-open a workspace (hub) as a window_folder, regardless of its
        // default kind (window_team / window_sharebox / window_website).
        const item = Wm.getWindowPreset(this);
        item.kind = 'window_folder';
        item.wm_unique_id = `window_folder-${item.hub_id}`;
        return Wm.launch(item, { explicit: 1, singleton: 1 });
      }

      case _e.delete:
        this.delete();
        return;

      case _e.remove:
        this.delete()
        return;

      case "load-script":
        let o = this.actualNode(_a.orig);
        loadJS(o.url)
          .then(() => {
            Wm.alert(LOCALE.SCRIPT_X_LOADED_SUCCESSFULLY.format(o.publicUrl));
          })
          .catch((e) => {
            Wm.alert(e);
          });
        return;

      case _e.rotate:
        return this.rotate(cmd.mget(_a.value));

      case _e.lock:
        return this.lock();

      case _a.share:
        // "Share" opens the invite-members popup — the per-file/folder
        // shortcut into the invite flow (spec 2026-06-10). DMZ guests cannot
        // invite, so they fall through to the legacy share-link copy below.
        if (!Visitor.inDmz) return this.openInvitePopup();
      /* falls through */
      case _a.link:
        if (Visitor.inDmz && this.isHubOrFolder) {
          // In DMZ, sharing a folder/hub must copy the current workspace share
          // URL — not a result from get_external_room_attr, which may return a
          // file-specific token that shows blank when opened without a file_nid.
          // The current page URL is always the correct working share link.
          // Strip any /{nid}/play suffix in case we're in a file-specific view.
          const cleanHash = location.hash.replace(/\/[0-9a-f]{16}\/play$/, '');
          const shareUrl = location.href.replace(/#.*/, '') + cleanHash;
          setTimeout(async () => {
            await copyToClipboard(shareUrl);
            Wm.acknowledge();
          }, 0);
          return;
        }
        return this.viewerLink().then((url) => {
          setTimeout(async () => {
            await copyToClipboard(url);
            Wm.acknowledge();
          }, 0);
        });

      case "direct-url":
        let url = this.directUrl();
        if (this.mget(_a.area) == _a.share) {
          this.viewerLink().then((link) => {
            url = `${link}/${nid}/get`;
          });
          setTimeout(async () => {
            await copyToClipboard(url);
            Wm.acknowledge();
          }, 0);
          return;
        }
        if (!url) break;
        setTimeout(async () => {
          await copyToClipboard(url);
          Wm.acknowledge();
        }, 0);
        break;

      case _a.acknowledge:
        return this.collection.remove(cmd.model);

      case "new-media":
      case "new-messages":
        args.trigger = this;
        return this.triggerHandlers(args);

      case _a.properties:
        return this.triggerHandlers({ trigger: this, service });

      case 'secure-share': {
        // Contextual tour, first statement in the case. Everything below races
        // three outcomes through a once() latch — wrapper resolved, wrapper
        // rejected, 600ms timeout — and the share panel appears either as a
        // drawer or as a floating window. The tour is about sharing, not about
        // which of those won, so it is raised before the race starts rather
        // than inside any branch of it.
        require("libs/tutorial-tours").fire("share", this);
        const item = Wm.getWindowPreset(this);
        item.kind = 'window_secure_share';
        item.wm_unique_id = `window_secure_share-${item.nid}`;
        const launchFloating = () => Wm.launch(item, { explicit: 1, singleton: 1 });
        // Figma: render the panel as a right drawer INSIDE the host workspace
        // window (the same dialog-wrapper mechanism as folder settings) so it
        // reads as part of the folder, not a detached floating window. Walk up to
        // the host window; if it isn't a drawer-capable workspace window, or the
        // wrapper can't be resolved quickly, fall back to the standalone window —
        // sharing must never break.
        const DRAWER_HOSTS = ['window_folder', 'window_sharebox'];
        let host = this.parent;
        while (host && !DRAWER_HOSTS.includes(String(host.mget && host.mget(_a.kind)))) {
          host = host.parent;
        }
        if (!host || !host.ensurePart) return launchFloating();
        let done = false;
        const once = (fn) => { if (done) return; done = true; fn(); };
        host.ensurePart('wrapper-dialog').then((wrapper) => once(() => {
          if (!wrapper || !wrapper.feed) return launchFloating();
          host.isShowSettings = false;          // mirror the settings drawer toggle state
          wrapper.clear();
          wrapper.feed({
            kind     : 'window_secure_share',
            embedded : 1,
            dataset  : { embedded: 'yes' },
            nid      : item.nid,
            hub_id   : item.hub_id   || this.mget(_a.hub_id),
            filetype : item.filetype || this.mget(_a.filetype),
            uiHandler: [host],
          });
        })).catch(() => once(launchFloating));
        // Safety net: if the wrapper never resolves (window kind without that
        // part), open the standalone panel instead of hanging silently.
        setTimeout(() => once(launchFloating), 600);
        return;
      }
      case "designation-link":
        this.viewerLink().then((url) => {
          setTimeout(async () => {
            // Shortened for the human who pastes it (Lexis, 2026-08-18): ~103
            // chars down to ~62. Applied HERE and not inside viewerLink(),
            // which lives in @drumee/ui-core and is shared by the folder
            // window's "Share link" (window/core.js), send-by-email and
            // share-qrcode (widget/settings/hub) — none of which asked for a
            // different format. toCompactUrl() returns its input untouched for
            // anything it cannot round-trip losslessly, so this can never
            // produce a link that resolves to less than it does today.
            url = `${bootstrap().protocol}://${bootstrap().main_domain}${toCompactUrl(url)}`
            await copyToClipboard(url);
            Wm.acknowledge();
          }, 0);
        });
        break;
      case "share-qrcode":
        if (/^(dmz|share)$/i.test(this.mget(_a.area))) {
          this.viewerLink().then((url) => {
            Wm.showQrCode(url);
          });
        } else {
          this.viewerLink().then((url) => {
            Wm.showQrCode(url + `/${this.mget(_a.nid)}/play`);
          });
        }
        break;
      case "show-qrcode":
        return this.fetchService(SERVICE.room.public_link, { nid, hub_id }).then((data) => {
          Wm.showQrCode(data.link);
        });

      case "seo-index":
        return this.postService(SERVICE.seo.create, { nid, hub_id });

      case _a.chat:
        args = {
          type: "channel",
          hub_id,
          nid,
        };
        return this.bubbleService(service, cmd._args);

      // "Chat Threads" submenu parent — no-op; the submenu opens on hover (CSS),
      // mirroring `organize`. Real actions live on the child rows below.
      case "chat-threads":
        return;

      // "Download Chat Threads" → bubble to the folder window, which opens the
      // export modal scoped to THIS file's thread (file nid carried on the node).
      case "download-file-chat":
        return this.bubbleService(service, cmd._args);

      case _e.copy:
        Visitor.set({ clipboard: this });
        this.triggerHandlers({ service: "copy-media" });
        Wm.storeClipboard(_e.copy, this);
        break;

      case _e.paste:
        if (!this.isGranted(_K.permission.write)) return;
        let media = Visitor.get("clipboard");
        if (!media) return;
        this.moveIn(media, 1);
        break;

      case "shortcut":
        this.postService(SERVICE.media.link, {
          nid,
          hub_id,
          recipient_id: Visitor.id,
          pid: Visitor.get(_a.home_id),
        });
        break;

      case _e.upload:
        // Route through the same BundleJob path as the Upload button / drag-drop
        // (mobile multi-select is a change event — legacy uploadInplace spawned
        // one uploader per file and flooded the gateway).
        Wm.__fileselector.open((e) => {
          if (Wm && typeof Wm._bundleDrop === "function") {
            Wm._bundleDrop(this, e);
            return;
          }
          this.uploadInplace(e);
        });
        break;

      case "set-as-background":
        this.setAsBackground();
        break;

      case "open-file-location":
      case "restore-to-desk":
      case "delete-permanently":
        this.emitServiceToHandler(service, args);
        break;

      case "start-meeting":
        this.emitServiceToHandler(_e.start, args);
        break;

      case "copy-meeting-link":
        this.emitServiceToHandler(_e.copy, args);
        break;

      case "delete-meeting":
        this.emitServiceToHandler("delete-popup", args);
        break;

      case _e.settings:
        // "Get info": a workspace (hub) or folder opens as a window_folder
        // with the settings panel pre-selected (members + roles); a regular
        // file opens its own details window (spec 2026-06-10). Previously
        // non-hub nodes emitted "hub-settings" → Wm.openSettings, which
        // showed the parent HUB's settings popup — nothing about the file
        // itself, hence "Get info looks dead" reports.
        if (this.isHubOrFolder) {
          return this.openInfoWindow();
        }
        return this.openDetailsWindow();

      case "manage-access":
        this.emitServiceToHandler(service, args);
        break;
      case "export-to-server":
      case "import-from-server":
        Wm.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this,
          },
          { explicit: 1, singleton: 1 }
        );
        break;

      case "nop":
        /** No operation */
        break;
      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * @param {*} service
   */
  emitServiceToHandler(service, args) {
    args.trigger = this;
    args.service = service;
    return this.triggerHandlers(args);
  }

  /**
   * "Get info" on a workspace — open it as a window_folder with the
   * settings panel pre-selected (mirrors the `open-in-window` path).
   * Replaces the standalone settings_hub popup.
   */
  openInfoWindow() {
    const item = Wm.getWindowPreset(this);
    item.kind = "window_folder";
    // A folder opens its own window (keyed by nid); a hub keeps the hub key.
    item.wm_unique_id = `window_folder-${this.isFolder ? item.nid : item.hub_id}`;
    item.showSettings = 1;
    // singleton:1 only raises an already-open window_folder; buildContent
    // won't re-run, so open its settings panel directly in that case.
    const existing = Wm.getItemsByKind("window_folder").find((w) => {
      if (w.isDestroyed() || w.mget(_a.hub_id) != item.hub_id) return false;
      return this.isFolder ? w.mget(_a.nid) == item.nid : true;
    });
    if (existing) {
      existing.openSettingsPanel();
    }
    return Wm.launch(item, { explicit: 1, singleton: 1 });
  }

  /**
   * "Share" — open the invite-members popup targeting this node's hub
   * (the per-file/folder shortcut into the invite flow).
   */
  async openInvitePopup() {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return;
    // Org over-limit / hard_lock: invites are paused — refuse before the
    // popup opens (hub.invite is clamped server-side too).
    if (require("libs/over-limit").guardWrite("invite")) return;
    const hub_id =
      (typeof this.getHostId === "function" && this.getHostId()) ||
      this.mget(_a.hub_id) ||
      Visitor.id;
    // Pre-fill the popup's workspace row with the workspace the user opened
    // Invite from — the kebab "Invite" is a hub-only action, so this node IS
    // that workspace and its name matches hub_id. Pass the name only when this
    // is a hub: for a non-hub node getHostId() points at a parent hub whose
    // name we don't have here, and a name/id mismatch would mislead the user.
    const hub_name = this.isHub
      ? this.mget(_a.filename) || this.mget(_a.name) || ""
      : "";
    // Free: solo — no invites (silent). Org seat cap does not apply to hub.invite.
    const { isFreeSoloPlan, showFreeSoloLimit } = require("libs/billing");
    if (isFreeSoloPlan()) return showFreeSoloLimit();
    return Kind.waitFor("invite_popup").then(() => {
      Wm.__wrapperModal.feed({
        kind: "invite_popup",
        hub_id,
        hub_name,
        uiHandler: [this],
      });
    });
  }

  /**
   * "Organize → Link to task tracker": open the Task tab of the folder window
   * holding these files and start a new task with them already attached.
   * Acts on the whole selection when there is one, like Move does.
   */
  linkToTaskTracker() {
    const selected = (Wm.getGlobalSelection && Wm.getGlobalSelection()) || [];
    const picked = selected.length ? selected : [this];
    // Plain attributes, not widgets: rows can re-render while the Task tab
    // mounts, and a launch payload must not carry widget references. Just the
    // fields the panel reads. Hubs/folders aren't attachable.
    const nodes = picked
      .filter((n) => n && !n.isHubOrFolder && typeof n.mget === "function")
      .map((n) => ({
        nid: n.mget(_a.nid),
        hub_id: n.mget(_a.hub_id),
        filename: n.mget(_a.filename),
        extension: n.mget(_a.extension),
        filetype: n.mget(_a.filetype),
        mimetype: n.mget(_a.mimetype),
        capability: n.mget("capability"),
        metadata: n.mget("metadata"),
      }))
      .filter((a) => a.nid);
    if (!nodes.length) return;

    const host = this.getParentByKind && this.getParentByKind("window_folder");
    if (host && typeof host.linkFilesToTask === "function") {
      return host.linkFilesToTask(nodes);
    }
    // Browsed outside a folder window (desk grid, search results): raise the
    // window on the holding folder, or launch it carrying the files.
    const hub_id = this.mget(_a.hub_id);
    const open = (Wm.getItemsByKind("window_folder") || []).find(
      (w) =>
        !w.isDestroyed() &&
        w.mget(_a.hub_id) == hub_id &&
        typeof w.linkFilesToTask === "function",
    );
    if (open) {
      open.raise();
      return open.linkFilesToTask(nodes);
    }
    const item = Wm.getWindowPreset(this);
    item.kind = "window_folder";
    item.nid = this.mget(_a.pid) || item.nid;
    item.wm_unique_id = `window_folder-${item.nid}`;
    // A window that isn't mounted has nothing to call — it reads this as it
    // comes up (folder/index.js).
    item.link_task_files = nodes;
    return Wm.launch(item, { explicit: 1, singleton: 1 });
  }

  /**
   * "Get info" on a regular file — open its details window (singleton per node).
   */
  openDetailsWindow() {
    const item = Wm.getWindowPreset(this);
    item.kind = "window_media_details";
    item.wm_unique_id = `window_media_details-${item.nid}`;
    return Wm.launch(item, { explicit: 1, singleton: 1 });
  }

  /**
   *
   */
  setAsBackground() {
    let opt = {
      wallpaper: {
        nid: this.mget(_a.nid),
        hub_id: this.mget(_a.hub_id) || this.mget(_a.ownerId),
        vhost: this.mget(_a.vhost),
      },
    };
    return this.postService(
      {
        service: SERVICE.drumate.update_settings,
        settings: opt,
        hub_id: Visitor.id,
      },
      { async: 1 }
    ).then((data) => {
      Visitor.set({ settings: JSON.parse(data.settings) });
      uiRouter.setWallpaper(Visitor.wallpaper());
    });
  }

  /**
   * hover without media, only mouse
   * @param {*} state
   */
  _filenameHover(state, e) {
    if (this.get(_a.state)) return;
    this._changeState(_a.filename, _a.hover, state);
    //}
    if (state == _a.on) {
      this._timer.filename = _.delay(() => {
        if (this._renaming) return;
        this._changeState(_a.tooltips, _a.hover, state);
      }, Visitor.timeout(800));
    } else {
      this._changeState(_a.tooltips, _a.hover, state);
    }
  }

  /**
   * hover without media, only mouse
   * @param {*} state
   */
  _hover(state, e) {
    if (!e) return;
    this.el.dataset.hover = state;
    this.content.el.dataset.hover = state;
    this._changeState("checkbox", _a.hover, state);
    this._changeState("remove", _a.hover, state);
    this._changeState("share", _a.hover, state);
    this._changeState("access", _a.hover, state);
    this._changeState("info", _a.hover, state);

    if (state == _a.off) {
      this._changeState(_a.tooltips, _a.hover, state);
    }

  }

  /**
   * overed with another media
   * @param {*} state
   */
  overed(state, moving) {
    if (moving) {
      moving.over = this;
      if (state !== _a.over) moving.over = null;
    }
    if (state !== _a.over) this.over = null;
    this.el.dataset.over = state;
    this.content.el.dataset.over = state;
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _pointerenter(e) {
    if (e.buttons) return;
    const n = this._notificationsBox;
    if (n != null && !n.isDestroyed()) {
      return;
    }
    const f = () => {
      this._hover(_a.on, e);
      this.enablePreview(true);
    };
    this._timer.hover = _.delay(f, 200);
  }

  /**
   * 
   * @param {*} e 
   */
  _pointerleave(e) {
    this.iconType = localStorage.iconType;
    this.content.el.dataset.icontype = this.iconType;
    clearTimeout(this._timer.hover);
    this._hover(_a.off, e);
    if (!this.imgCapable() || this.get(_a.filetype) === _a.hub) {
      this.iconType = _a.vector;
      this.content.el.dataset.icontype = this.iconType;
    }
  }

  /**
   * 
   * @returns 
   */
  _poke() {
    return this.anim([0.3, { scale: 1.2 }], [0.3, { scale: 1 }]);
  }

  /**
   * 
   * @returns 
   */
  isHandSelect() {
    return this.mget("handSelect");
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  tick(e) {
    this.status = _a.idle;
    this.model.set(_a.state, 1 ^ toggleState(this.mget(_a.state)));
    const state = this.mget(_a.state);
    this.el.dataset.selected = state;

    if (state) {
      this.service = _e.select;
      this.mset({
        handSelect: e.ctrlKey,
      });
    } else {
      this.service = _e.unselect;
      this.model.unset("handSelect");
      this.trigger(_e.unselect);
    }

    this.el.dataset.sharing = _a.off;
    this._changeState("checkbox", "selected", state);
    RADIO_BROADCAST.trigger(_e.select, this);
    return;
  }

  /**
   *
   */
  afterMoveIn(m, paste = 0, mode) {
    m.getLogicalParent().syncOrder();
    this._poke();
    if (paste) return;
    if (m.isAttachment()) return;
    if (m.get(_a.actual_home_id) != this.get(_a.actual_home_id)) {
      mode = _a.copy;
    }
    if (
      m.get(_a.filetype) == _a.hub &&
      m.get(_a.home_id) == this.get(_a.home_id)
    ) {
      mode = _a.move;
    }
    if (mode == _a.copy) return;
    m.suppress();
  }
  download_tree() {
    let nid;
    let hub_id;
    if (this.mget(_a.filetype) === _a.hub) {
      nid = this.mget(_a.actual_home_id);
      hub_id = this.mget(_a.id) || this.mget(_a.hub_id);
    } else {
      nid = this.mget(_a.nid);
      hub_id = this.mget(_a.hub_id);
    }
    this.postService({
      service: SERVICE.media.download,
      nid,
      hub_id,
      socket_id: Visitor.get(_a.socket_id),
    });
    this._waitingForZip = nid;
  }

  /**
   * Open move popup, execute move, then refresh grid
   */
  move() {
    const hubName = this.mget(_a.hubName) || this.mget('hubName') ||
      this.mget(_a.hub_name) || this.mget('hub_name') || LOCALE.WORKSPACE;
    const selectedItems = Wm.getGlobalSelection ? Wm.getGlobalSelection() : [];
    const movingItems = selectedItems.length ? selectedItems : [this];

    Wm.move(movingItems, {
      filename: this.mget(_a.filename),
      folderName: this.mget(_a.filename),
      workspaceName: hubName,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
      area: this.mget(_a.area),
    }).then((result) => {
      const { destination, destinations, items } = result;
      const targetDestinations = destinations || [destination];
      // A true cross-workspace move needs one destination. The move dialog can
      // intentionally select several destinations, which is a copy-to-many
      // operation followed by source removal; keep that legacy flow unchanged.
      const isSingleDestinationMove = targetDestinations.length === 1;

      const moveItem = (item) => {
        const nid = item.mget ? item.mget(_a.nid) : item.nid;
        const itemHubId = item.mget ? item.mget(_a.hub_id) : item.hub_id;
        const isCrossHub = (dest) => String(dest.hub_id) !== String(itemHubId);
        const crossHubDestinations = targetDestinations.filter(isCrossHub);

        const resolvePid = (dest) => {
          // A subfolder destination already carries the exact target nid
          // (resolved by the move dialog via show_node_by) — use it directly
          // for both same-hub and cross-hub so the item lands in the chosen
          // subfolder, not the recipient workspace root.
          if (dest.isFolder && dest.nid) return Promise.resolve(dest.nid);
          if (!isCrossHub(dest)) return Promise.resolve(dest.nid);
          // Workspace-root cross-hub: resolve the recipient hub's home nid.
          return this.fetchService(SERVICE.hub.get_attributes, { hub_id: dest.hub_id })
            .then((attrs) => (attrs && (attrs.actual_home_id || attrs.home_id || attrs.nid)) || dest.nid || '0')
            .catch(() => dest.nid || '0');
        };

        const moveToDestination = async (dest) => {
          const pid = await resolvePid(dest);
          const crossHub = isCrossHub(dest);
          const movingAcrossWorkspaces = crossHub && isSingleDestinationMove;
          let service = crossHub ? SERVICE.media.copy : SERVICE.media.move;

          if (movingAcrossWorkspaces) {
            // One service for every cross-workspace move. The client used to
            // ask whether the file had a chat thread and route those through a
            // separate saga endpoint that carried the messages across; threads
            // now stay in the workspace that owns them, so there is nothing to
            // branch on and nothing to wait for.
            service = (SERVICE.media && SERVICE.media.workspace_move) ||
              "media.workspace_move";
          }

          const payload = crossHub ? {
            service,
            nid,
            pid,
            action: movingAcrossWorkspaces ? _a.move : _a.copy,
            hub_id: itemHubId,
            recipient_id: dest.hub_id,
            notify: 1,
            moved_in: 1,
            async: 1,
            echoId: this.mget(ECHO_ID),
          } : {
            service: SERVICE.media.move,
            nid,
            pid,
            action: _a.move,
            hub_id: itemHubId,
            notify: 1,
            moved_in: 1,
          };
          return await this.postService(payload);
        };

        return Promise.all(targetDestinations.map(moveToDestination)).then(() => {
          if (!crossHubDestinations.length || isSingleDestinationMove) return;
          return this.postService({
            service: SERVICE.media.trash,
            nid: [{ nid, hub_id: itemHubId }],
            hub_id: itemHubId,
          });
        }).then(() => {
          if (item.goodbye) item.goodbye();
        });
      };

      Promise.all(items.map(moveItem)).catch((e) => {
        this.warn("Move failed", e);
        if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.MOVE_FAILED);
      });
    }).catch((e) => {
      if (e.response !== _e.cancel && e.response !== _e.close) {
        this.warn("Move popup error", e);
      }
    });
  }
}
__media_interact.initClass();

module.exports = __media_interact;
