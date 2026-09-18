// Live-call parking, shared by the team meeting (window/meeting) and the 1:1
// call (window/connect). Object.assign'd onto both prototypes, the same way
// webrtc/reactions and webrtc/screenshare are.
//
// WHAT IT IS FOR. A call is not a document you arrange next to other documents,
// and navigating the desk must never end one. So when the desk moves under a
// live call, the call steps aside into the desk's own dock (desk/skeleton
// call-dock) as a 300x180 tile with a "Return to call" cover, and one click
// brings it back. The element is MOVED, never re-rendered, so the WebRTC video
// elements keep their srcObject and the session is untouched throughout.
//
// WHY THE DESK DOCK AND NOT THE WINDOW MANAGER. `.window-manager__ui` is
// `isolation: isolate` (wm/skin), so every window layer is trapped in the WM's
// stacking context and a full-page desk screen (Settings, Billing, Admin
// Console) covers it outright. The dock lives in the desk shell, above all of
// it.
//
// LIFECYCLE — four distinct things, never conflated:
//   FOCUS CHANGE   `data-state` flips on the window. Nothing here reacts to it;
//                  an unfocused call is a live call. (The visibility of an
//                  unfocused call is desk/skin's `data-desk-call`, stamped by
//                  wm/index.js _installDeskStateMirrors on PRESENCE.)
//   MINIMIZE       "call:minimize" -> setCallTile(1). Reversed by
//                  "call:restore" / clicking the tile -> setCallTile(0).
//   CALL END       the room is left; the host window tears itself down.
//   WINDOW UNMOUNT onBeforeDestroy -> _teardownCallParking(), which broadcasts
//                  "call:ended" so the desk drops anything pointing at it.
//
// TWO SEAMS the host window must provide:
//   _canParkCall()    may this window be parked right now? (meeting: only the
//                     full-frame desk screen — an embedded meeting is sized by
//                     its host container.)
//   _onCallTileLeft() optional: re-assert the window's own geometry after it
//                     has been moved back out of the dock.
const CALL_TILE_W = 300;
const CALL_TILE_H = 180;
// THE PARKED TILE IS DRAGGABLE (see _bindCallTileDrag). The corner it rests in
// is the right default and the wrong permanent home: it lands on the task
// modal's buttons, on the chat composer, on the bottom-right of a table — so
// the user has to be able to push it out of the way without leaving the call.
//
// How far the pointer has to travel before a press counts as a drag instead of
// the click that returns to the call. Small enough that a deliberate nudge
// moves the tile, large enough that a shaky click still comes back.
const CALL_TILE_DRAG_SLOP = 4;
// Keep-out inset from the edges of the area the tile is dragged in. MUST match
// the dock's resting inset in desk/skin (`__call-dock` right/bottom), including
// its phone breakpoint — the tile is snapped to these, so a mismatch shows up
// as the tile jumping the moment it is picked up.
const CALL_TILE_INSET = 24;
const CALL_TILE_INSET_SM = 12;
// ...and the width that breakpoint fires at (desk/skin `@media (max-width:650px)`).
const CALL_TILE_SM_W = 650;
// Dropped this close to an edge, the tile goes flush to the inset. A tile left
// three pixels off the edge reads as dropped, not placed.
const CALL_TILE_SNAP = 28;
// Where the user last put it, stored as the fraction of the free travel on each
// axis rather than as pixels, so a tile parked bottom-right stays bottom-right
// across a browser resize, a sidebar collapse and the next session.
const CALL_TILE_POS_KEY = "drumee:call-tile-pos";

module.exports = {
  /**
   * Subscribe to the desk's park/un-park broadcasts. Called from the host
   * window's initialize().
   *
   * The park is deferred a frame on purpose: it resizes the whole call shell
   * (video stage, tiles, analyzers), and doing that synchronously inside the
   * navigation click made the section the user asked for paint late. The screen
   * renders first, the call steps aside right after.
   */
  _installCallParking() {
    if (this._callParkingInstalled) return;
    this._callParkingInstalled = 1;
    this._onCallMinimize = () => {
      if (this._callParkFrame) cancelAnimationFrame(this._callParkFrame);
      this._callParkFrame = requestAnimationFrame(() => {
        this._callParkFrame = 0;
        this.setCallTile(1);
      });
    };
    this._onCallRestore = () => this.setCallTile(0);
    RADIO_BROADCAST.on("call:minimize", this._onCallMinimize);
    RADIO_BROADCAST.on("call:restore", this._onCallRestore);
  },

  /**
   * Called from the host window's onBeforeDestroy. Idempotent.
   *
   * "call:ended" is fired from teardown rather than from any one exit path so
   * it covers every way out: Leave, End for all, the peer hanging up, a decline,
   * a duration cap, a tab close.
   */
  _teardownCallParking() {
    if (!this._callParkingInstalled) return;
    this._callParkingInstalled = 0;
    this._unbindCallTileClick();
    this._unbindCallTileDrag();
    if (this._callParkFrame) cancelAnimationFrame(this._callParkFrame);
    this._callParkFrame = 0;
    RADIO_BROADCAST.off("call:minimize", this._onCallMinimize);
    RADIO_BROADCAST.off("call:restore", this._onCallRestore);
    try {
      RADIO_BROADCAST.trigger("call:ended");
    } catch (e) { /* non-fatal */ }
  },

  /**
   * The layer this window belongs to when it is NOT docked. Used to put it back
   * when the parent it was taken from is gone (the desk can rebuild while a
   * call is parked), which would otherwise re-attach the window to a detached
   * node — the call would keep running with nothing on screen.
   * @returns {Element|null}
   */
  _callLayerEl() {
    try {
      const layer = window.Wm && Wm.callLayer;
      return (layer && layer.el) || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * The desk's dock element, or null when there is no desk (DMZ / share
   * session, where the fallback below parks the window in place instead).
   * @returns {Element|null}
   */
  _callDockEl() {
    try {
      const dock = window.Desk && _.isFunction(Desk.getPart) && Desk.getPart("call-dock");
      return (dock && dock.el) || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * The WM work area, in viewport coords — the coordinate space the window's
   * inline top/left are written in. Only used by the no-dock fallback.
   */
  _callTileArea() {
    try {
      const host = window.Wm && Wm.el && (Wm.el.parentElement || Wm.el);
      if (host) {
        const r = host.getBoundingClientRect();
        if (r.width && r.height) return r;
      }
    } catch (e) { /* fall through to the viewport */ }
    return { width: window.innerWidth, height: window.innerHeight };
  },

  /**
   * Park the call as a corner tile (`on`), or give it the canvas back (`!on`).
   * Idempotent, and a no-op while the browser owns the geometry in fullscreen.
   * @param {Boolean|Number} on
   */
  setCallTile(on) {
    if (!this.el || !this.$el || (this.isDestroyed && this.isDestroyed())) return;
    // The full-frame desk screen only: an embedded meeting is sized by its host
    // container (position: relative — see meeting-shell `&__ui`), so moving it
    // into the dock would take it away from the pane that owns it.
    if (!this._canParkCall()) return;
    if (document.fullscreenElement) return;
    const tiled = this.el.dataset.callTile === "1";
    if (!!on === tiled) return;
    if (on) return this._enterCallTile();
    return this._leaveCallTile();
  },

  _enterCallTile() {
    // Which layer to put it back in. Remembered rather than re-derived, so a
    // desk that rebuilt while the call was parked cannot re-attach it to a
    // detached node (the call would keep running with nothing on screen).
    this._callTileHome = this.el.parentNode;
    this.el.dataset.callTile = "1";
    this._bindCallTileClick();
    this._bindCallTileDrag();

    const dock = this._callDockEl();
    if (dock) {
      // MOVE the live element (appendChild on an attached node is a move, not a
      // remove + insert), so the WebRTC video elements keep their srcObject and
      // never stop playing. This is the whole trick: docked in the desk shell,
      // the call clears every desk screen, which it cannot do from inside the
      // window manager's isolated stacking context.
      dock.appendChild(this.el);
      // Back where the user last dragged it, if they ever did. No-op otherwise:
      // the resting corner is the stylesheet's, and writing it out in pixels
      // here would only start a fight with the phone breakpoint.
      this._applyCallTilePos();
      // Safari can pause a moved <video>; a no-op elsewhere.
      this._resumeCallVideos();
      return;
    }
    // No desk (DMZ / share): park it in place, in the corner of its own layer.
    // This is the one path that writes geometry — there is no dock to size it,
    // so the corner box has to come from here. `_frameTracking` (set for good
    // by _lockGeometry) already keeps Wm.clampWindows off it.
    this.$el.css({
      width: CALL_TILE_W,
      height: CALL_TILE_H,
      // `.window__ui` carries a 600x320 floor in window/skin/window.scss and a
      // CSS minimum WINS over a smaller inline width — the same trap
      // window/frame.js documents for docked viewers.
      minWidth: CALL_TILE_W,
      minHeight: CALL_TILE_H,
    });
    // Sized first, positioned second, and positioned through the SAME bounds
    // the drag uses — its inset, its clamp. A corner of its own here (this used
    // to keep a 20px margin against the drag's 24) is a tile that jumps the
    // moment it is picked up. Bottom-right unless the user has moved it before,
    // which is what the stylesheet gives the docked tile for free.
    this._applyCallTilePos({ fx: 1, fy: 1 });
  },

  _leaveCallTile() {
    const home =
      this._callTileHome && this._callTileHome.isConnected
        ? this._callTileHome
        : this._callLayerEl();
    this._callTileHome = null;
    this.el.dataset.callTile = "0";
    this._unbindCallTileClick();
    this._unbindCallTileDrag();
    if (home && home !== this.el.parentNode && home.appendChild) {
      home.appendChild(this.el);
      this._resumeCallVideos();
    }
    // Give the host window its own box back. The meeting re-asserts the
    // full-frame lock (its stylesheet fills the canvas); the 1:1 call restores
    // the popup geometry it was launched with. The DMZ corner-park in
    // _enterCallTile is what makes this necessary in both cases.
    if (_.isFunction(this._onCallTileLeft)) this._onCallTileLeft();
    if (_.isFunction(this.raise)) this.raise();
    this.responsive();
    // The screen that pushed the call into the dock is still up, and the
    // full-size window lives back inside the window manager where that screen
    // covers it — so ask the desk to take the screen down.
    try {
      RADIO_BROADCAST.trigger("call:returned");
    } catch (e) { /* non-fatal */ }
  },

  /**
   * CLICK ANYWHERE ON THE PARKED TILE TO COME BACK.
   *
   * The "Return to call" cover (skeleton/index.js, `service: "restore-call"`)
   * is the designed target and still works — but it is one skeleton node
   * layered over a 300x180 box every other child of which is a live WebRTC
   * widget with click handlers of its own, and `__handleClick` in ui-core
   * stopPropagation()s unconditionally. Anything that lands on a descendant
   * instead of the cover — a tile, an avatar, an analyzer canvas, a cover that
   * has not mounted yet — is a click that appears to do nothing, which is
   * exactly what "clicking it doesn't bring me back" looks like.
   *
   * At tile size there is only ONE thing a click can mean, so take it on the
   * window root in the CAPTURE phase: that runs before any descendant handler,
   * so nothing downstream can swallow it. Bound only while parked, so the
   * full-size call's own controls are untouched.
   */
  _bindCallTileClick() {
    if (this._callTileClick || !this.el) return;
    this._callTileClick = (e) => {
      // Defensive: the listener is removed on un-park, so this only matters if
      // a click is already in flight when that happens.
      if (!this.el || this.el.dataset.callTile !== "1") return;
      e.stopPropagation();
      e.preventDefault();
      // A drag that just ended fires a click on release like any other press,
      // and taking that click would snap the call back to full screen the
      // instant the user finished placing the tile.
      //
      // _swallowDragClick normally takes that click first (window, capture
      // phase, so it runs before this listener ever sees it) — this is the
      // fallback for the one case it cannot cover, and the failure it guards
      // against is the whole feature undoing itself. Time-boxed rather than a
      // plain flag consumed here: a release outside the browser produces no
      // click at all, and a flag left standing would eat the user's next real
      // one.
      if (this._callTileDragAt && Date.now() - this._callTileDragAt < 400) {
        this._callTileDragAt = 0;
        return;
      }
      this.setCallTile(0);
    };
    this.el.addEventListener("click", this._callTileClick, true);
  },

  _unbindCallTileClick() {
    if (!this._callTileClick) return;
    if (this.el) {
      this.el.removeEventListener("click", this._callTileClick, true);
    }
    this._callTileClick = null;
  },

  // ── DRAGGING THE PARKED TILE ────────────────────────────────────────────
  //
  // The corner is where the tile belongs by default and not where it can be
  // forced to stay: at 300x180, fixed at bottom-right and above every desk
  // layer, it sits on whatever the user walked away from the call to do — the
  // task modal's Update button, a chat composer, the last rows of a table. The
  // only way out used to be to end the call or come back to it full-screen.
  //
  // So the whole tile is a drag handle, and the same press is still the click
  // that returns to the call: travel under CALL_TILE_DRAG_SLOP is a click,
  // anything more is a move. There is no separate grab bar because there is no
  // room for one — at this size the skin already drops the top bar, the panel
  // and the resize handles.
  //
  // WHAT MOVES is not always this window. Docked in the desk, the dock owns the
  // box (desk/skin `__call-dock`: fixed, and `> *` pins the window to fill it),
  // so the drag has to move the DOCK — writing left/top on the window there
  // would be overruled by that `!important` fill. With no desk (DMZ / share)
  // the window parks itself and is its own box. `_callTileBox` picks, and the
  // two differ in coordinate space as well as identity: the dock is
  // `position: fixed` (viewport), the parked window is absolute inside its
  // layer (offset parent), which is why the base coordinates are read
  // differently in `_bindCallTileDrag` and the bounds come from
  // `_callTileArea()` for the window but the viewport for the dock.

  /**
   * The element whose box the drag moves while the call is parked.
   * @returns {Element|null}
   */
  _callTileBox() {
    if (!this.el || this.el.dataset.callTile !== "1") return null;
    const dock = this._callDockEl();
    if (dock && this.el.parentNode === dock) return dock;
    return this.el;
  },

  /**
   * Travel limits for the tile, in the coordinate space its inline top/left are
   * written in, plus its current size. Measured once per drag (nothing resizes
   * it mid-drag) and again whenever a stored position is re-applied.
   * @param {Element} box
   */
  _callTileBounds(box) {
    // The dock is fixed to the viewport; the no-dock park is positioned inside
    // the window manager's work area, which is what _enterCallTile sized against.
    const area =
      box === this.el
        ? this._callTileArea()
        : { width: window.innerWidth, height: window.innerHeight };
    const r = box.getBoundingClientRect();
    const w = r.width || CALL_TILE_W;
    const h = r.height || CALL_TILE_H;
    const m =
      window.innerWidth <= CALL_TILE_SM_W ? CALL_TILE_INSET_SM : CALL_TILE_INSET;
    return {
      w,
      h,
      minX: m,
      minY: m,
      // max >= min even on a viewport too small to hold the tile with insets:
      // the clamp below must never invert, or the tile would jump off-screen.
      maxX: Math.max(m, (area.width || 0) - w - m),
      maxY: Math.max(m, (area.height || 0) - h - m),
    };
  },

  /**
   * The last dropped position, as {fx, fy} fractions of the free travel.
   * Cached on the instance so a quota-blocked or private-mode localStorage
   * still keeps the tile where it was put for the rest of the call.
   * @returns {{fx:Number, fy:Number}|null}
   */
  _readCallTilePos() {
    if (this._callTilePos !== undefined) return this._callTilePos;
    this._callTilePos = null;
    try {
      const raw = window.localStorage.getItem(CALL_TILE_POS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (p && _.isFinite(p.fx) && _.isFinite(p.fy)) {
        this._callTilePos = {
          fx: Math.min(1, Math.max(0, p.fx)),
          fy: Math.min(1, Math.max(0, p.fy)),
        };
      }
    } catch (e) { /* private mode, or someone else's value under the key */ }
    return this._callTilePos;
  },

  _saveCallTilePos(fx, fy) {
    this._callTilePos = {
      fx: Math.min(1, Math.max(0, fx)),
      fy: Math.min(1, Math.max(0, fy)),
    };
    try {
      window.localStorage.setItem(
        CALL_TILE_POS_KEY,
        JSON.stringify(this._callTilePos),
      );
    } catch (e) { /* quota / private mode — the instance cache still holds */ }
  },

  /**
   * Write the box out. `right`/`bottom` have to be cleared as well as `left`/
   * `top` set: the resting rules position the dock from the far edges, and a
   * box given all four would be stretched between them instead of moved.
   */
  _writeCallTileXY(box, x, y) {
    box.style.left = `${Math.round(x)}px`;
    box.style.top = `${Math.round(y)}px`;
    box.style.right = "auto";
    box.style.bottom = "auto";
  },

  /**
   * Put the tile back where it was last dropped.
   *
   * With no `fallback` this is deliberately a no-op until the user has dragged
   * it at least once: the docked tile's resting corner is the stylesheet's,
   * which is what lets it follow the phone breakpoint on its own. The no-dock
   * park has no stylesheet to fall back to and passes its corner in.
   * @param {{fx:Number, fy:Number}} [fallback] position to use when the user
   *        has never dragged the tile.
   */
  _applyCallTilePos(fallback) {
    const box = this._callTileBox();
    const pos = this._readCallTilePos() || fallback;
    if (!box || !pos) return;
    const b = this._callTileBounds(box);
    this._writeCallTileXY(
      box,
      b.minX + pos.fx * (b.maxX - b.minX),
      b.minY + pos.fy * (b.maxY - b.minY),
    );
  },

  _bindCallTileDrag() {
    if (this._callTileDown || !this.el) return;

    this._callTileDown = (e) => {
      if (!this.el || this.el.dataset.callTile !== "1") return;
      // A second finger landing on a tile already being dragged would re-base
      // the whole gesture on it and hand the drag over mid-flight. One pointer
      // owns the tile until it lets go.
      if (this._callTileDrag) return;
      // Left button / touch / pen only: a right-click is the context menu and
      // a middle-click is not a grab.
      if (e.button != null && e.button !== 0) return;
      const box = this._callTileBox();
      if (!box) return;
      const r = box.getBoundingClientRect();
      this._callTileDrag = {
        box,
        b: this._callTileBounds(box),
        // Where the box is NOW in the space its inline left/top are written in
        // — viewport for the fixed dock, offset parent for the parked window.
        // Read from the layout rather than from style: at rest the position
        // comes from `right`/`bottom` in the stylesheet, so there is no inline
        // left/top to read.
        x0: box === this.el ? box.offsetLeft : r.left,
        y0: box === this.el ? box.offsetTop : r.top,
        px: e.clientX,
        py: e.clientY,
        id: e.pointerId,
        moved: false,
      };
      // On window, not on the tile: the pointer routinely leaves a 300px box
      // mid-drag, and the release often lands on the page behind it. Capture
      // phase for the same reason the click handler uses it — every live
      // WebRTC widget inside stops propagation of its own accord.
      window.addEventListener("pointermove", this._callTileMove, true);
      window.addEventListener("pointerup", this._callTileUp, true);
      window.addEventListener("pointercancel", this._callTileUp, true);
    };

    this._callTileMove = (e) => {
      const d = this._callTileDrag;
      if (!d || (d.id != null && e.pointerId !== d.id)) return;
      // The button came back up without a pointerup reaching us — the release
      // happened over a native surface that swallowed it (a file dialog, the
      // browser chrome, a window that took focus mid-drag). Without this the
      // tile would keep following the pointer with nothing held down.
      if (e.buttons === 0 && e.pointerType === "mouse") return this._callTileUp();
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      if (!d.moved) {
        if (
          Math.abs(dx) < CALL_TILE_DRAG_SLOP &&
          Math.abs(dy) < CALL_TILE_DRAG_SLOP
        )
          return;
        d.moved = true;
        // Drives the grab cursor and drops the "Return to call" hover cover for
        // the duration — mid-drag the user is looking at where the tile is
        // going, not at an invitation to click it (skin rules on
        // [data-call-drag]).
        this.el.dataset.callDrag = "1";
        if (d.box !== this.el) d.box.dataset.callDrag = "1";
      }
      d.x = Math.min(d.b.maxX, Math.max(d.b.minX, d.x0 + dx));
      d.y = Math.min(d.b.maxY, Math.max(d.b.minY, d.y0 + dy));
      this._writeCallTileXY(d.box, d.x, d.y);
      // Stops the drag from turning into a text selection of the tile's own
      // labels, and from scrolling the page under a touch drag on browsers
      // where `touch-action: none` in the skin is not enough.
      e.preventDefault();
    };

    this._callTileUp = () => {
      const d = this._callTileDrag;
      this._callTileDrag = null;
      window.removeEventListener("pointermove", this._callTileMove, true);
      window.removeEventListener("pointerup", this._callTileUp, true);
      window.removeEventListener("pointercancel", this._callTileUp, true);
      if (!d) return;
      if (this.el) delete this.el.dataset.callDrag;
      if (d.box && d.box !== this.el) delete d.box.dataset.callDrag;
      // Never travelled: this was a click, and _callTileClick is about to take
      // it and bring the call back. Leave it alone.
      if (!d.moved) return;
      this._callTileDragAt = Date.now();
      this._swallowDragClick();

      const b = d.b;
      let x = d.x != null ? d.x : d.x0;
      let y = d.y != null ? d.y : d.y0;
      // Magnet to the edges, so a tile meant for a corner lands in it.
      if (x - b.minX < CALL_TILE_SNAP) x = b.minX;
      else if (b.maxX - x < CALL_TILE_SNAP) x = b.maxX;
      if (y - b.minY < CALL_TILE_SNAP) y = b.minY;
      else if (b.maxY - y < CALL_TILE_SNAP) y = b.maxY;
      this._writeCallTileXY(d.box, x, y);

      // As a fraction of the travel, not in pixels: the tile has to keep the
      // corner it was given when the browser is resized, the sidebar collapses
      // or the next session opens on another screen.
      this._saveCallTilePos(
        b.maxX > b.minX ? (x - b.minX) / (b.maxX - b.minX) : 1,
        b.maxY > b.minY ? (y - b.minY) / (b.maxY - b.minY) : 1,
      );
    };

    // The viewport changing under a parked tile is the same problem the drag
    // solves: a tile placed against the right edge of a wide window is off
    // screen on a narrow one. Re-derive from the stored fractions instead of
    // clamping pixels, so it keeps its corner rather than crawling inward.
    this._callTileReflow = _.debounce(() => {
      if (!this.el || this.el.dataset.callTile !== "1") return;
      this._applyCallTilePos();
    }, 120);
    window.addEventListener("resize", this._callTileReflow);

    this.el.addEventListener("pointerdown", this._callTileDown, true);
  },

  /**
   * Take the click that ends a drag, wherever the browser decides to fire it.
   *
   * A press and a release at different points still produce a click — on the
   * nearest common ancestor of the two, which for a drag that ends off the tile
   * is the desk itself, NOT this window. So the tile's own click handler never
   * sees it, and what the desk sees is a bare click that closes whatever menu,
   * popover or drawer was open behind the call. The user moved a video tile;
   * nothing else should happen.
   *
   * On `window` in the capture phase, so it runs before anything else can act
   * on it, and `once` so it can never outlive the gesture it belongs to. The
   * timestamp is re-checked inside because a release outside the browser
   * produces no click at all: the listener then waits for an unrelated one,
   * which it must let through untouched.
   */
  _swallowDragClick() {
    window.addEventListener(
      "click",
      (e) => {
        if (!this._callTileDragAt || Date.now() - this._callTileDragAt >= 400) return;
        this._callTileDragAt = 0;
        e.stopPropagation();
        e.preventDefault();
      },
      { capture: true, once: true },
    );
  },

  _unbindCallTileDrag() {
    if (this.el && this._callTileDown) {
      this.el.removeEventListener("pointerdown", this._callTileDown, true);
    }
    if (this._callTileMove) {
      window.removeEventListener("pointermove", this._callTileMove, true);
      window.removeEventListener("pointerup", this._callTileUp, true);
      window.removeEventListener("pointercancel", this._callTileUp, true);
    }
    if (this._callTileReflow) {
      window.removeEventListener("resize", this._callTileReflow);
      if (_.isFunction(this._callTileReflow.cancel)) this._callTileReflow.cancel();
    }
    // The dock outlives the call parked in it, so the drag state it was given
    // has to come off with the window — a dock left with data-call-drag would
    // keep the grabbing cursor for the next call parked in it.
    const d = this._callTileDrag;
    if (d && d.box && d.box !== this.el) delete d.box.dataset.callDrag;
    if (this.el) delete this.el.dataset.callDrag;
    this._callTileDrag = null;
    this._callTileDown = null;
    this._callTileMove = null;
    this._callTileUp = null;
    this._callTileReflow = null;
  },

  /**
   * Re-issue play() on the window's media elements after a DOM move. Moving an
   * attached node keeps playback in Chrome and Firefox; Safari has historically
   * paused it, and a paused self-view in a docked call looks like a dead call.
   */
  _resumeCallVideos() {
    if (!this.el) return;
    for (const v of this.el.querySelectorAll("video, audio")) {
      if (v.paused && (v.srcObject || v.src)) {
        const r = v.play();
        if (r && r.catch) r.catch(() => { });
      }
    }
  },
};
