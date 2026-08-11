const CHANGE_RADIO = "change:radio";
const Rectangle = require('rectangle-node');
const { copyToClipboard, timestamp } = require("@drumee/ui-essentials")
const { TimelineMax } = require("@drumee/ui-core/vendor");

const windowCore = require("../core");
const { isGrouped } = require("../skeleton/toolkit/file-group");
class __window_interact extends windowCore {
  constructor(...args) {
    super(...args);
    this.buildRectangles = this.buildRectangles.bind(this);
    this._resizeStart = this._resizeStart.bind(this);
    this._resizeStop = this._resizeStop.bind(this);
    this._resize = this._resize.bind(this);
    this._resizeAnimation = this._resizeAnimation.bind(this);
    this._dragStart = this._dragStart.bind(this);
    this._dragStop = this._dragStop.bind(this);
    this._tick = this._tick.bind(this);
    this.mediaDragOver = this.mediaDragOver.bind(this);
  }

  static initClass() {
    this.prototype.behaviorSet = {
      bhv_radio: 1,
    };
    this.prototype.handles = "all";
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);

    this._filenames = [];
    this._path = [];
    this.isFileUpdated = 0;

    this.declareHandlers();
    if (opt.headless) {
      return
    }

    let width = _K.docViewer.width;
    let height = _K.docViewer.height;
    let minWidth = 700;
    let minHeight = 400;
    if (this.size) {
      if (this.size.width) width = this.size.width;
      if (this.size.height) height = this.size.height;
      if (this.size.minWidth) minWidth = this.size.minWidth;
      if (this.size.minHeight) minHeight = this.size.minHeight;
    }
    let w = Math.max(width, window.innerWidth / 4);
    let h = Math.max(height, window.innerHeight / 4);
    this.offset = {
      left: 0,
      top: 0,
    };
    if (Visitor.isMobile()) {
      w = window.innerWidth;
      h = window.innerHeight - 70;
    } else {
      this._lastX = 0;
    }
    this.size = {
      width: w,
      height: h,
      minWidth,
      minHeight,
    };
    this._shifted = [];
    const top = this.style.get(_a.top);
    if (top < 0) {
      this.style.set({ top: 0 });
    }
    let offset = window.innerHeight - (top + h);
    if (offset < 0) {
      if ((top + offset) < 0) {
        this.style.set({ top: 0 });
      } else {
        this.style.set({ top: top + offset });
      }
    }

  }

  /**
   * 
   */
  raise() {
    if (this._pendingDestroy) {
      return
    }
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   *
   */
  onDomRefresh() {
    this.initBounds();
    this.el.dataset.name = this.mget(_a.filename) || this.mget(_a.name);
  }

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

  /** window.confirm(...).then(*confirm_handler).catch(*cancel_handler)
   * @param {String|Skeleton}
   * @param {String}  -- default : on body(b), footer(f), off=header(h)
   * @param {Boolean} -- default : close the modal on confirm click
   * @param {Boolean} -- default : close the modal on cance click
   */
  confirm(
    content = "",
    mode = "bf",
    close_on_confirm = 1,
    close_on_cancel = 1
  ) {
    if (_.isString(content)) {
      content = Skeletons.Note(content, `${this.fig.group}-confirm__message`);
    }
    if (!this.overlayWrapper || this.overlayWrapper.isDestroyed()) {
      this.append(
        Skeletons.Wrapper.Y({
          className: `${this.fig.group}__dialog-overlay`,
          name: "dialog",
        })
      );
      this.overlayWrapper = this.children.last();
    }
    this.el.dataset.dialog = _a.open;
    this.overlayWrapper.feed(
      require("../confirm/skeleton")(this, content, mode)
    );
    this.overlayWrapper.once(_e.removeChild, () => {
      this.el.dataset.dialog = _a.closed;
    });
    const a = new Promise((resolve, reject) => {
      this.onConfirm = (cmd, args) => {
        if (close_on_cancel) {
          this.overlayWrapper.softClear();
        }
        try {
          resolve(cmd, args);
        } catch (e) { }
      };
      this.onCancel = (cmd, args) => {
        if (close_on_confirm) {
          this.overlayWrapper.softClear();
        }
        try {
          reject(cmd, args);
        } catch (e) { }
      };
    });
    return a;
  }

  // **********************************************************
  //                     RESPONSIVE SECTION                    #
  // **********************************************************

  /** window.webrtc.freeSide
   * according to the current position of the window, select the most
   * avalaible side
   */
  freeSide(considerRatio = 0) {
    const o = this.el.getBoundingClientRect();
    let a = [
      { side: "y-n", value: o.top },
      { side: "y-s", value: window.innerHeight - o.bottom },
      { side: "x-e", value: window.innerWidth - o.right },
      { side: "x-w", value: o.left },
    ];
    let side = _.values(_.orderBy(a, ["value"], ["desc"])[0])[0];
    if (considerRatio) {
      if (o.width / o.height > 1.2) {
        side = side.replace(/^y/, "x");
        side = side.replace(/[sn]/, "w");
      } else {
        side = side.replace(/^x/, "y");
        side = side.replace(/[ew]/, "n");
      }
    }
    return side;
  }

  /**
   * 
   * @returns 
   */
  buildRectangles() {
    if (this.__list == null) {
      return;
    }
    this.mosaic = [];
    const w = 120;
    const h = 110;
    let last = null;
    this.__list.children.each((c) => {
      let area, m;
      const o = c.$el.offset();
      for (let side of [0, 120]) {
        const x = Math.floor(o.left - 60) + side;
        const y = o.top - 13;
        const r = new Rectangle(x, y, w, h);
        area = 0;
        try {
          area = last.rectangle.intersection(r).area();
        } catch (error) { }
        if (side === 0) {
          m = {
            rectangle: r,
            right: c,
            area,
          };
        } else {
          if (last != null) {
            m.left = last.right;
          }
        }
      }
      if (!area) {
        this.mosaic.push(m);
      }
      return (last = m);
    });
  }

  // **********************************************************
  //                     INTERACT SECTION                     #
  // **********************************************************

  /**
   * 
   */
  setupInteract() {
    this.captured = {};
    this.el.dataset.role = _a.root;
    this._minY = -Wm.$el.offset().top;
    this._minX = 0;
    this._maxY = Wm.$el.height() + this._minY;
    this._maxX = Wm.$el.width();
    this._minHeight = parseInt(this.getActualStyle(_a.minHeight));
    this._minWidth = parseInt(this.getActualStyle(_a.minWidth));
    this.waitElement(this.el, () => {
      this.$el.draggable({
        distance: 5,
        //containment, // Desk.$el #Wm.$el
        start: this._dragStart,
        stop: this._dragStop,
        scroll: false,
        handle: `.${this.fig.group}__header`,
      });
      this.setContainment();
      this.$el.resizable({
        start: this._resizeStart,
        stop: this._resizeStop,
        resize: this._resize,
        aspectRatio: false,
        scroll: false,
        maxHeight: window.innerHeight,
        maxWidth: window.innerWidth,
        minHeight: this.style.get("minHeight") || this._minHeight,
        minWidth: this.style.get("minWidth") || this._minWidth,
        handles: this.handles,
      }); //"all"
      this.initBounds();
    });
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _resizeStart(e, ui) {
    this._isResizing = true;
    if (this._sizeCtrl == null || this._sizeCtrl.isDestroyed()) {
      this._sizeCtrl = this.getPart("size-ctrl") || this.findPart("size-ctrl");
    }
    if (this.acceptMedia && !this.getState()) {
      this.triggerMethod(CHANGE_RADIO);
    }
    this._sizeCtrl && this._sizeCtrl.changeState(0);
    super._resizeStart(e, ui);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _resizeStop(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.el.dataset.freeside = this.freeSide();
    this.size.height = ui.size.height;
    this.size.width = ui.size.width;
    if (_.isFunction(this.completeResize)) {
      this.completeResize(e, ui);
    }
    this.syncGeometry();
    this.setContainment();
    this._isResizing = ui;
    return false;
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   * @param {*} anim
   */
  _resize(e, ui, anim) {
    let offset, size;
    if (this.constrainResize(e, ui)) return;
    if (this.getViewMode() === _a.row) {
      offset = 87;
    } else {
      offset = 84;
    }
    if (e === null) {
      size = {
        width: ui.width,
        height: ui.height - 44,
      };
    } else {
      size = {
        width: ui.size.width,
        height: ui.size.height - 44,
      };
    }
    this.size.height = size.height;
    this.size.width = size.width;
    if (anim) {
      if (anim.to.left < 0) {
        anim.to.width = anim.to.width + anim.to.left + 16;
        anim.to.left = 0;
      }

      this._resizeAnimation(anim, offset);
    }
  }

  /**
   *
   * @param {*} anim
   * @param {*} change
   * @param {*} cb
   */
  _resizeAnimation(anim, change, cb) {
    if (this.mget(_a.headless)) {
      return;
    }

    change = change || 0;
    anim.to.height = anim.to.height - change;
    if (anim.to.left < 0) {
      anim.to.left = 0;
    }
    this.$el.css({
      overflow: _a.hidden,
    });
    const f = () => {
      anim.to.overflow = _a.visible;
      this.$el.css(anim.to);
      try {
        this.syncBounds();
      } catch (error) { }
      if (_.isFunction(cb)) {
        return cb(anim.to);
      }
    };
    TweenMax.to(this.$el, 0.5, {
      width: anim.to.width,
      height: anim.to.height,
      left: anim.to.left,
      top: anim.to.top,
      onComplete: f,
    });
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragStart(e, ui) {
    this._isMoving = true;
    this.triggerMethod(CHANGE_RADIO);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _dragStop(e, ui) {
    this._moved = true;
    this.el.dataset.freeside = this.freeSide();

    if (!this._isMoving) {
      return;
    }
    this.syncGeometry();
  }

  /**
   *
   * @param {*} resync
   */
  syncBounds(resync) {
    if (this.synced && timestamp() - this.synced < 1000) {
      if (!resync) return;
    }
    if (this.__list == null || this.__list.isDestroyed()) {
      this.__list = this.findPart(_a.list);
    }

    this.initBounds();
    this.synced = timestamp();
  }

  /**
   *
   */
  syncGeometry(no_width = 0) {
    this.currentSize = {
      width: this.$el.width(),
      height: this.$el.height(),
    };
    this.size = this.currentSize;
    let p = this.$el.position();
    let opt = { ...this.currentSize, ...p };
    if (no_width) delete opt.width;
    this.style.set(opt);
    if (!this.isWm) {
      this.$el.css(opt);
    }
    this.syncBounds();
    if (!this.__list) {
      return;
    }
    const f = () => {
      this._isMoving = false;
      if (!this.acceptMedia) {
        return;
      }
      this.__list.children.each((c) => {
        try {
          c.initBounds();
        } catch (e) { }
      });
    };
    _.delay(f, 500);
  }

  /**
   *
   */
  syncContent() {
    this.__list._renderChildren();
    // _renderChildren reattaches every child view as a direct descendant of
    // .smart-container, undoing the .workspace-section / .folder-section /
    // .file-section partition. Empirically the MutationObserver from
    // _setupPartitionObserver does NOT fire reliably here — likely because
    // _renderChildren batches into a documentFragment then a single append,
    // and our async rAF debounce skips while a Marionette destroy handler
    // is still on the stack (afterUpload → syncOrder → _syncOrder → syncAll
    // calls us synchronously from a child destroy chain). Without an
    // explicit re-partition the items reflow into the scrollEl flex-column
    // layout. Folder + Wm + DMZ share all need this; gate on isWm / isFolder /
    // isDmz to keep the remaining flat surfaces (search/meeting) untouched.
    if ((this.isWm || this.isFolder || this.isDmz)
      && typeof this._partitionFoldersAndFiles === "function"
      && this.getViewMode && this.getViewMode() !== _a.row) {
      this._partitionFoldersAndFiles(this.__list);
    }
    // Every tile just moved in the DOM, so the cached bboxes the drag logic
    // reads (seek_insertion, _rowNeighbor) now describe the OLD layout. Left
    // stale, the next drag compares the pointer against last-render
    // coordinates and picks the wrong slot — or none at all.
    //
    // initBounds() reads $el.offset(), which includes any active shift
    // transform, so a tile still sliding back from its ±24px insertion slot
    // would cache a position 24px off — the grid measured correctly only
    // when the tween happened to be done, which is what made re-dragging
    // work intermittently. Clear the transforms first, then measure.
    _.defer(() => {
      if (!this.__list || this.__list.isDestroyed()) return;
      this.__list.children.each((c) => {
        try {
          // snapToRest kills the slide instantly; a tween still running here
          // would leave part of the offset in the measurement below.
          if (_.isFunction(c.snapToRest)) c.snapToRest();
          if (_.isFunction(c.initBounds)) c.initBounds();
        } catch (e) { }
      });
    });
  }

  /**
   *
   * @returns
   */
  syncAll() {
    const f = () => {
      this.syncContent();
      this.syncGeometry();
      // Wm.unselect(2);
    };
    const g = _.debounce(f, 400, { maxWait: 1000 });
    return g();
  }

  /**
   *
   * @returns
   */
  selectAll() {
    this.__list.children.each((c) => c.select());
  }
  /**
   *
   * @returns
   */
  resetShift() {
    // Everything is back at rest, so the shifted bookkeeping must not leak
    // into the next drag — _releaseShifted would poke destroyed views.
    this._shifted = [];
    if (this.__list == null || this.__list.isDestroyed()) {
      return;
    }
    this.__list.children.each((c) => {
      if (_.isFunction(c.resetMotion)) c.resetMotion();
    });
  }

  /**
   *
   * @param {*} moving
   */
  check_sanity(moving) {
    let priv;
    if (moving.isPseudo) {
      return this;
    }
    if (!moving.ui || moving.disabled) {
      return this.moveForbiden(moving);
    }

    if (this.isTrash) {
      if (moving.containsHub) {
        return this.moveForbiden(moving);
      }
      if (moving.mget(_a.filetype) == "schedule") {
        return this.moveAllowed(moving);
      }
      if (moving.mget(_a.status) == _a.deleted) {
        return null;
      }
    } else if (!this.isSchedule) {
      if (moving.mget(_a.filetype) == "schedule") {
        return this.moveForbiden(moving, LOCALE.EXTERNAL_CALL_MUST_STAY_WITHIN);
      }
    }

    if (this.isDialoguing) {
      if (moving.intersect(this) > 0.1) {
        return this.moveForbiden(moving);
      }
    }
    if (moving.mget(_a.status) === _a.deleted && moving.logicalParent.isTrash) {
      return this;
    }
    if (moving.mget(_a.filetype) === _a.hub) {
      if (this.mget(_a.filetype) === _a.hub) {
        return this.moveForbiden(moving);
      }
      return this;
    }
    if (this.captured && this.captured.over) {
      priv = this.captured.over.mget(_a.privilege);
    } else {
      priv = this.mget(_a.privilege);
    }
    if (!(_K.permission.write & priv)) {
      return this.moveForbiden(moving, LOCALE.WEAK_PRIVILEGE);
    }
    if (moving.mget(_a.pid) == this.getCurrentNid() && moving.logicalParent.cid != this.cid) {
      return this.moveForbiden(moving);
    }
    if (this.circularReference(moving)) {
      this.moveForbiden(moving);
      return null;
    }
    return this;
  }


  /**
   *
   * @param {*} moving
   * @param {*} reason
   */
  moveForbiden(moving, reason = LOCALE.IMPOSSIBLE_ACTION) {
    if (!moving.ui) return;
    const { helper } = moving.ui;
    helper.attr(_a.data.forbiden, 1);
    this._intercept(moving, _a.off);
    if (!helper.enabled) {
      helper.prepend(require("../template/forbiden")(moving, reason));
      helper.enabled = true;
    }
    let f = helper.children().first();
    if (f.attr(_a.data.drag) == _a.ok) f.attr(_a.data.drag, _a.forbiden);
    return null;
  }

  /**
   *
   * @param {*} moving
   */
  moveAllowed(moving) {
    if (moving.ui == null) {
      return;
    }
    const h = moving.ui.helper;
    let f = moving.ui.helper.children().first();
    f.attr(_a.data.drag, _a.ok);
    return true;
  }

  /**
   *
   * @param {*} moving
   * @param {*} dest
   */
  _check_icon_sanity(moving, dest) {
    const priv = dest.mget(_a.privilege) || dest.mget(_a.permission);
    if (!(_K.permission.write & priv)) {
      return this.moveForbiden(moving, LOCALE.WEAK_PRIVILEGE);
    }

    const move_type = moving.mget(_a.filetype);
    const dest_type = dest.mget(_a.filetype);
    switch (move_type) {
      case _a.hub:
        if (dest_type != _a.folder) {
          return this.moveForbiden(moving);
        }
        break;
      case _a.pseudo:
        break;
      //@_show_tooltips(moving, dest)
      default:
        switch (dest_type) {
          case _a.folder:
          case _a.hub:
            break;
          default:
            return this.moveForbiden(moving);
        }
    }
    this._intercept(dest, _a.on, moving);
    return this;
  }


  /**
   *
   * @param {*} target
   * @param {*} state
   */
  _intercept(target, state, moving) {
    if (target == null) {
      this.captured == null;
      if (this._prevOver) {
        this._prevOver.overed(_a.off);
      }
      return;
    }
    if (this.captured == null) {
      return;
    }
    if (state === _a.on) {
      if (this._prevOver != null) {
        this._prevOver.overed(_a.off);
      }
      this.captured.over = target;
      target.overed(_a.over, moving);
      this._prevOver = target;
      this.moveAllowed(moving);
    } else {
      this.captured.over = null;
      target.overed(_a.off);
      if (this._prevOver) {
        this._prevOver.overed(_a.off);
        this._prevOver = null;
      }
    }
  }

  /**
   * Send every tile shifted for a previous insertion slot back to rest,
   * except the ones staying armed for the current slot. The release goes
   * through delaySelect too: it cancels a still-pending shift on the same
   * tile, so a fast drag cannot strand tiles in their pushed-aside position.
   * @param {*} keep tiles that stay shifted for the current slot
   */
  _releaseShifted(keep = []) {
    if (!this._shifted) this._shifted = [];
    if (!_.isArray(this._shifted)) this._shifted = [this._shifted];
    for (const s of this._shifted) {
      if (keep.indexOf(s) >= 0) continue;
      if (s.isDestroyed && s.isDestroyed()) continue;
      if (_.isFunction(s.delaySelect)) s.delaySelect();
    }
    this._shifted = [];
  }

  /**
   * Nearest tile flanking `ref` on one side within the same visual row.
   * Geometry-based on purpose: _doPartition (window/utils.js) re-appends
   * tiles into workspace/folder/file sections, so the collection-adjacent
   * tile is often somewhere else entirely on screen.
   * @param {*} ref the tile the slot sits against
   * @param {*} before true for the slot on ref's leading edge
   * @param {*} moving the dragged tile, never paired with itself
   * @returns {*} the flanking tile, or null when the slot ends the row
   */
  _rowNeighbor(ref, before, moving, isRow) {
    if (!ref || !ref.bbox) return null;
    // Row view is a single vertical column, so the neighbour is the tile
    // directly above/below and there is no same-line test to apply.
    const sameLine = (c) =>
      isRow || Math.abs(c.bbox.y - ref.bbox.y) < (ref.bbox.h || 1) / 2;
    const gap = (c) => {
      const d = isRow
        ? (before ? ref.bbox.y - c.bbox.y : c.bbox.y - ref.bbox.y)
        : (before ? ref.bbox.x - c.bbox.x : c.bbox.x - ref.bbox.x);
      return d;
    };
    let best = null;
    let bestGap = Infinity;
    for (const c of this.__list.children.toArray()) {
      if (c.cid === ref.cid || c.cid === moving.cid || !c.bbox) continue;
      if (!sameLine(c)) continue;
      const d = gap(c);
      if (d <= 0 || d >= bestGap) continue;
      best = c;
      bestGap = d;
    }
    return best;
  }

  /**
   *
   * @param {*} moving
   */
  seek_insertion(moving) {
    const target = this.check_sanity(moving);
    if (!target) {
      return null;
    }
    const isRow = this.getViewMode() == _a.row;
    // Still sitting on its OWN slot — nothing to insert. selfOverlapped is
    // just the raw intersection with the tile's home rect, which is truthy
    // from the very first pixel of the drag, so it must be measured: bailing
    // on any overlap at all made a grid drag unable to ever reach the
    // insertion logic below. Only a mostly-covering overlap counts as "has
    // not really left home yet".
    if (moving.selfOverlapped && moving.bbox) {
      const home = moving.bbox.area ? moving.bbox.area() : 0;
      const covered = moving.selfOverlapped.area
        ? moving.selfOverlapped.area()
        : 0;
      if (home > 0 && covered / home > 0.5) {
        // Tiles shifted for a previous slot must not stay pushed aside here.
        this._releaseShifted();
        return null;
      }
    }
    this.captured = {};
    // The tile the drag covers the most is the reference; where the cursor
    // sits across its width decides the intent. The old rule keyed the
    // decision on overlap ratio alone (<15% = insert, otherwise drop-into),
    // which left insertion reachable only on a few-px rim between tiles —
    // and "drop into" a regular file was a dead end anyway (moveIn only
    // handles folder/hub destinations).
    let primary = null;
    let primaryArea = 0;
    for (const c of this.__list.children.toArray()) {
      if (c.cid === moving.cid) continue;
      let area = 0;
      try {
        area = c.overlaps(moving.rectangle);
      } catch (e) {
        return this;
      }
      if (area > primaryArea) {
        primary = c;
        primaryArea = area;
      }
    }
    if (!primary) {
      this._releaseShifted();
      this.captured.self = moving;
      this.captured.self.pos = _e.end;
      this._intercept(null);
      return this;
    }
    // Rows stack vertically, tiles flow horizontally: measure along the axis
    // the list actually advances on, so the same before/after logic serves
    // both view modes.
    const r = moving.rectangle;
    let t = 0.5;
    if (isRow) {
      if (primary.bbox && primary.bbox.h) {
        t = (r.y + r.h / 2 - primary.bbox.y) / primary.bbox.h;
      }
    } else if (primary.bbox && primary.bbox.w) {
      t = (r.x + r.w / 2 - primary.bbox.x) / primary.bbox.w;
    }
    // Folders and hubs keep a wide middle drop-into zone; their edges — and
    // the whole width of a regular file — read as insertion slots.
    if (primary.isHubOrFolder && t >= 0.3 && t <= 0.7) {
      this._releaseShifted();
      if (!this._check_icon_sanity(moving, primary)) return null;
      this.captured.over = primary;
      // Through delaySelect so a still-pending edge-zone shift on this same
      // tile is cancelled instead of firing over the drop-into highlight.
      primary.delaySelect();
      return this;
    }
    const before = t < (primary.isHubOrFolder ? 0.3 : 0.5);
    // Pick the tile that VISUALLY flanks the slot, not the collection
    // neighbour: the grid is re-partitioned into workspace/folder/file
    // sections (window/utils.js _doPartition), so collection order and
    // on-screen order diverge — and even within a section the row wraps.
    // Nearest tile on the chosen side of the same row, by geometry.
    const paired = this._rowNeighbor(primary, before, moving, isRow);
    if (before) {
      this.captured.right = primary;
      if (paired) this.captured.left = paired;
    } else {
      this.captured.left = primary;
      if (paired) this.captured.right = paired;
    }
    // Group view never re-arms the flanking tiles below, so nothing may be
    // kept shifted: `keep` skips the release AND `_shifted` is reset, leaving
    // those two tiles pushed aside until the delayed clearShift a second later.
    const grouped = isGrouped(this);
    this._releaseShifted(
      grouped ? [] : [this.captured.left, this.captured.right],
    );
    if (!grouped) {
      if (this.captured.left) {
        // The indicator bar rides the left tile's trailing edge when one
        // exists, otherwise the right tile's leading edge (slot at row start).
        this.captured.left.delaySelect(_a.left, 1);
        this._shifted.push(this.captured.left);
      }
      if (this.captured.right) {
        this.captured.right.delaySelect(_a.right, this.captured.left ? 0 : 1);
        this._shifted.push(this.captured.right);
      }
    }
    this._intercept(null);
    return this;
  }

  /**
   *
   */
  getIcons() {
    return this.__list._getImmediateChildren();
  }

  // **********************************************************
  //            MEDIA MANAGEMNTRESPONSIVE SECTION             #
  // **********************************************************

  /**
   * moveToEnd
   * move to end inside same logical parent
   * phase is used to sync data with backend
   *
   * @param {*} m
   */
  makeOptions(m) {
    const item = m.model.toJSON();
    if (this.isDmz) {
      this.verbose("makeOptions::1066", m);
      item.phase = _a.local;
    } else if (!this.isTrash && item.status === _a.deleted) {
      this.verbose("makeOptions::477");
      item.phase = _a.restored;
    } else if (this.isTrash && item.status !== _a.deleted) {
      this.verbose("makeOptions::481");
      item.phase = _a.deleted;
    } else if (this.isTrash && item.status === _a.deleted) {
      this.verbose("makeOptions::482");
      item.phase = _a.deleted;
    } else if (m.logicalParent.isSearch) {
      item.phase = _a.moved;
    } else if (item.pid === this.mget(_a.nodeId)) {
      this.verbose("makeOptions::480", item.pid, this.mget(_a.nodeId));
      if (m.logicalParent.isChatWindow) {
        item.phase = _a.copied;
      } else {
        item.phase = _a.local;
        m.parent.collection.remove(m.model);
      }
    } else if (item.actual_home_id === this.mget(_a.home_id)) {
      item.phase = _a.moved;
      if (m.logicalParent.isChatWindow) {
        item.phase = _a.copied;
      }
      this.verbose("makeOptions::486", item.phase);
    } else if (item.actual_home_id !== this.mget(_a.home_id)) {
      if (item.filetype === _a.hub) {
        item.phase = _a.moved;
      } else {
        item.phase = _a.copied;
      }
    } else {
      item.phase = _a.local;
    }

    if ([_a.moved, _a.deleted, _a.restored].includes(item.phase)) {
      if (m.parent) m.parent.collection.remove(m.model);
      if (m.logicalParent && m.logicalParent.syncOrder) {
        m.logicalParent.syncOrder();
      }
    }

    if (item.phase !== _a.local || m.isPseudo) {
      item.destination = {
        hub_id: this.mget(_a.hub_id),
        ownpath: this.mget(_a.ownpath) || '',
        nid: this.mget(_a.nodeId) || this.getCurrentNid(),
        home_id: this.mget(_a.home_id),
        area: this.mget(_a.area),
      };
    }

    this.verbose("makeOptions::804", this, m, item);
    item.uiHandler = [this];
    item.kind = this._getKind();
    if (m.isPseudo) {
      let priv;
      if (this.captured && this.captured.over) {
        priv = this.captured.over.mget(_a.privilege);
      } else {
        priv = this.mget(_a.privilege) || this.mget(_a.permission);
      }
      if (!(_K.permission.write & priv)) {
        this.warning(LOCALE.WEAK_PRIVILEGE);
        return null;
      }
      item.phase = _a.upload;
      item.file = m.get(_a.file);
      item.folder = m.get(_a.folder);
      item.mode = this.getViewMode();

      if (this.mget(_a.share_id)) {
        item.token = this.mget(_a.share_id);
      }
      if (item.file && /^.+\.lnk$/i.test(item.file.name)) {
        Butler.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED, { title: LOCALE.UPLOAD });
        return null;
      }
    }
    return item;
  }

  /**
   *
   * @param {*} m
   * @param {*} position
   */
  _insertMedia(m, position) {
    let opt;
    if (position == null || _.isNaN(position)) {
      position = 0;
    }
    if (m.model != null) {
      opt = this.makeOptions(m);
      if (opt == null) {
        return false;
      }
    } else {
      opt = m;
    }
    if (_.isEmpty(opt)) {
      return;
    }
    if (opt.isAttachment) {
      delete opt.isAttachment;
    }

    opt.logicalParent = this;
    if (this.captured && this.captured.over && opt.phase === _a.upload) {
      // Handled by Wm.upload
      return;
    }

    // Trigger upload event when file is inserted with upload phase
    // This allows upload progress window to listen and add items immediately
    if (opt.phase === _a.upload && opt.file && typeof RADIO_MEDIA !== 'undefined') {
      // Get destination from opt or try to get from media if available
      let destination = opt.destination;
      if (!destination && typeof this._getDestination === 'function') {
        destination = this._getDestination();
      }

      RADIO_MEDIA.trigger("upload:start", {
        file: opt.file,
        fileName: opt.file.name || opt.filename,
        fileSize: opt.file.size || opt.size || 0,
        destination: destination,
        position: position,
        opt: opt
      });
    }

    if (!this.__list || this.__list.isDestroyed()) {
      this.__list = this.getPart(_a.list);
      if (!this.__list) {
        return;
      }
    }
    switch (position) {
      case -1:
        this.__list.prepend(opt);
        break;
      case 0:
        this.__list.append(opt);
        break;
      default:
        this.__list.collection.add(opt, { at: position });
    }

    // Wm (workspace inline) relies on a MutationObserver to partition new
    // children into .file-section / .folder-section. The observer can miss
    // the first drop when a pseudo lands during the empty-folder retry loop
    // — leaving uploading items as direct children of .smart-container
    // (flex-column) so concurrent drops stack vertically until refresh.
    // Explicit partition kick after append removes that race; folder window
    // already does this in its own override. DMZ share partitions too.
    if ((this.isWm || this.isDmz) && typeof this._partitionFoldersAndFiles === "function"
      && this.getViewMode && this.getViewMode() !== _a.row) {
      this._partitionFoldersAndFiles(this.__list);
    }
  }

  /**
   *
   * @param {*} files
   * @param {*} position
   */
  _crossHubCopyOpt(m) {
    if (!m || !m.mget) return null;
    if (this.isTrash || this.isDmz || this.isSearch) return null;
    if (m.mget(_a.files) || m.isPseudo || m.phase === _a.creating) return null;
    if (m.mget(_a.status) === _a.deleted) return null;
    if (m.mget(_a.filetype) === _a.hub) return null;
    const srcHub = m.mget(_a.hub_id);
    const dstHub = this.mget(_a.hub_id);
    if (!srcHub || !dstHub || srcHub === dstHub) return null;
    // No echoId so the destination window renders the server's newContent echo (carries the real copy nid).
    return {
      service: SERVICE.media.copy,
      nid: m.mget(_a.nodeId),
      pid: this.mget(_a.nodeId) || this.getCurrentNid(),
      action: _a.copy,
      hub_id: srcHub,
      recipient_id: dstHub,
      notify: 1,
      moved_in: 1,
      async: 1,
    };
  }

  insertMedia(files, position = 0) {
    if (!_.isArray(files)) {
      files = [files];
    }
    let newFile = files[0];
    if (newFile.model) {
      newFile = newFile.model.toJSON();
    }
    if (newFile.nid && newFile.status == _a.active) {
      this.isFileUpdated = 1;
    }
    let hub = 0;
    let shouldSync = 1;
    for (let file of Array.from(files)) {
      if (this.isTrash && file.isHub) {
        hub++;
        continue;
      }
      if (file.phase == _a.creating || file.isPseudo) shouldSync = 0;
      // Cross-hub drops use the same media.copy payload as moveIn/prepareMove (media/core.js:1471); makeOptions would otherwise pick phase=moved and 403.
      const copyOpt = this._crossHubCopyOpt(file);
      if (copyOpt) {
        this.postService(copyOpt).catch((e) =>
          this.warn("Cross-hub drop failed", e),
        );
        continue;
      }
      this._insertMedia(file, position);
    }
    this.resetShift();
    if (hub) this.warning(LOCALE.USE_MANAGER_TO_DELETE);
    if (hub == files.length) return;
    if (!shouldSync) return;
    this.syncOrder((data) => {
      this.notify(files);
    });
  }

  /**
   *
   * @param {*} data
   */
  addMedia(data) {
    data.kind = this._getKind();
    this.__list.append(data);
  }

  /**
   *
   */
  getLocalSelection() {
    const f = [];
    if (!this.__list || this.__list.isDestroyed()) {
      this.__list = this.findPart(_a.list);
    }
    if (this.__list != null) {
      this.__list.children.each(function (c) {
        if (c.mget(_a.state)) {
          return f.push(c);
        }
      });
    }
    return f;
  }

  /**
   *
   * @param {*} all
   */
  unselect(all = 1) {
    this.captured = {};
    if (all > 1) {
      pointerDragged = false;
    }
    if (this._isMoving || pointerDragged) {
      return;
    }
    this._selection = {};
    //@trigger _e.unselect

    if (!this.__list || this.__list.isDestroyed()) {
      this.__list = this.findPart(_a.list);
    }

    if (this.__list != null) {
      this.__list.children.each((c) => {
        try {
          return c.unselect();
        } catch (error) { }
      });
    }

    if (!all) {
      return;
    }
    if (this.windowsLayer != null) {
      return this.windowsLayer.children.each((c) => {
        try {
          return c.unselect();
        } catch (error) { }
      });
    }
  }

  /**
   *
   * @param {*} m
   * @param {*} value
   */
  sameFilename(src, name) {
    for (let f of Array.from(this.__list.children.toArray())) {
      let { filename } = f.actualNode();
      if (!filename) continue;
      if (name.toLocaleLowerCase() == filename.toLocaleLowerCase()) {
        if (f.cid != src.cid) {
          return f;
        }
      }
    }
    return null;
  }

  /**
   *
   * @param {*} fname
   */
  filenameExists(fname) {
    for (let f of Array.from(this.__list.children.toArray())) {
      if (
        fname.toLocaleLowerCase() === f.mget(_a.filename).toLocaleLowerCase()
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   *
   * @param {*} node
   */
  circularReference(node) {
    const nid = node.mget(_a.nodeId);
    return _.find(this._path, (i) => i.nid === nid);
  }

  /**
   *
   * @param {*} names
   */
  findByFilename(names) {
    if (!_.isArray(names)) {
      names = [names];
    }
    const r = [];
    this.__list.children.each((c) => {
      let needle;
      if (
        ((needle = c.mget(_a.filename)), Array.from(names).includes(needle))
      ) {
        return r.push(c);
      }
    });
    return r;
  }

  /**
   *
   * @param {*} id
   */
  findByNodeId(id) {
    for (let c of Array.from(this.__list.children.toArray())) {
      if (c.mget(_a.nid) === id) {
        return c;
      }
    }
  }

  /**
   *
   * @param {*} m
   * @param {*} phase
   */
  restoreMedia(m, phase) {

  }

  /**
   *
   * @param {*} e
   */
  _tick(e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    this.model.set(_a.service, _a.select);
    if (e.ctrlKey || e.shiftKey) {
      this.viewerLink(_a.orig, e).then((url) => {
        setTimeout(async () => {
          await copyToClipboard(url);
          Wm.acknowledge();
        }, 0);
      });
    }
    this.model.set(_a.state, 1 ^ this.mget(_a.state));
    this.el.dataset.selected = this.mget(_a.state);
    if (this.mget(_a.state)) {
      this.status = _e.select;
    } else {
      this.status = _e.unselect;
    }
    this.triggerHandlers();
    return false;
  }

  /**
   *
   * @param {*} prepend
   */
  pasteMedia(prepend) {
    if (_.isEmpty(Wm.clipboard.files)) {
      return;
    }
    const list = [];
    return (() => {
      const result = [];
      for (let media of Array.from(Wm.clipboard.files)) {
        const item = media.model.toJSON();
        item.phase = Wm.clipboard.command === _e.copy ? _a.copied : _a.moved;
        item.state = 1;
        item.service = _a.select;
        item.selected = 1;
        item.destination = {
          hub_id: this.mget(_a.hub_id),
          nid: this.getCurrentNid(),
        };
        item.uiHandler = [this];
        item.logicalParent = this;
        list.push(item);
        this.addMedia(item, prepend);
        if (Wm.clipboard.command !== _e.copy) {
          media.model.set(_a.phase, _a.deleted);
          media.parent.collection.remove(media.model);
        }
        result.push((media.el.dataset.phase = ""));
      }
      return result;
    })();
  }

  /**
   *
   */
  exportMedia() {
    if (_.isEmpty(Wm.clipboard.files || Wm.clipboard.command !== _a.share)) {
      return;
    }
    for (let media of Array.from(Wm.clipboard.files)) {
      const item = media.model.toJSON();
      item.phase = _a.sharing;
      item.destination = {
        hub: this.mget(_a.hub_id),
        node: this.getCurrentNid(),
      };
      item.handler = { uiHandler: this };
      item.service = _e.share;
      this.addMedia(item);
    }
    return Wm.clearClipboard();
  }

  /**
   *
   * @param {*} opt
   */
  feedContent(opt) {
    this.__list.feed(opt);
  }


  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  mediaDragOver(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    const m = ui.helper.moving;
    if (m == null) {
      return;
    }
    if (e.target === m.target) {
      return false;
    }
    m.target = e.target;
    m.dest_id = this.cid;
    m.siblings = this.__list._getImmediateChildren();
    m.dest = this;
    return false;
  }

  /**
   *
   */
  initBounds() {
    this.waitElement(this.el, () => {
      this.bbox = new Rectangle(
        this.$el.offset().left,
        this.$el.offset().top,
        this.$el.width(),
        this.$el.height()
      );
    });
  }
}
__window_interact.initClass();

module.exports = __window_interact;
