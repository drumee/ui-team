// Native fullscreen for a whole call WINDOW — the header CornersOut button on
// the 1:1 "Drumee connect" window and the meeting topbar's Full screen entry.
// Mixed into both classes with Object.assign, the same pattern webrtc/reactions
// and webrtc/screenshare already use.
//
// NOT the same thing as screenshare's _toggleScreenShareFullscreen, which
// fullscreens the shared-screen <video> only and leaves the window alone.
//
// Why the geometry snapshot is not optional: entering fullscreen fires a window
// `resize`, which window/manager.js debounces into Wm.responsive(). That walks
// every open window and calls syncGeometry() (window/interact/index.js), which
// re-measures the element — fullscreen-sized at that moment — and writes the
// result back into this.style AND, for anything that is not the Wm itself, into
// the inline style. Nothing puts the original geometry back, so on exit the
// window stays maximized, and its resize handles end up on/past the edge of the
// visible work area, which is what also makes it look unresizable.
// window/core.js's own "fullscreen" service documents and solves exactly this;
// a bare requestFullscreen() does not.
// Chrome enters and instantly drops fullscreen for a <div> under a transformed
// Wm ancestor (see screenshare._toggleScreenShareFullscreen). An exit this soon
// after the request is that drop, not the user.
const DROPPED_WITHIN_MS = 300;

module.exports = {
  _toggleWindowFullscreen() {
    if (this._maximiseRestore) return this._toggleWindowMaximise();
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
      return;
    }
    const el = this.el;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    // Measure BEFORE the request: once fullscreen is live every measurement
    // reads the screen instead of the window.
    this._fullscreenRestore = {
      width: this.$el.width(),
      height: this.$el.height(),
      ...this.$el.position(),
    };
    // Fires for the header button, for ESC, and for anything else that drops us
    // out of fullscreen.
    const askedAt = Date.now();
    el.onfullscreenchange = () => {
      const isFull = document.fullscreenElement === el;
      this._syncFullscreenButton(isFull);
      if (isFull) return;
      el.onfullscreenchange = null;
      if (Date.now() - askedAt < DROPPED_WITHIN_MS && this._canMaximise()) {
        this._toggleWindowMaximise();
        return;
      }
      const restore = this._fullscreenRestore;
      // Superseded — the user picked another geometry (Tile left/right,
      // Reframe) on the way out, so their choice wins over the old snapshot.
      if (!restore) return;
      this._fullscreenRestore = null;
      // The 50 ms delay mirrors window/core.js: let the UA finish unwinding the
      // top layer before animating, or the tween starts from a stale box.
      setTimeout(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        // change_size_to mutates its argument, so hand it a copy.
        this.change_size_to({ ...restore }, () => {
          // Wm.responsive() ran while we were fullscreen and left this.style /
          // this.size holding the maximized values. Re-read from the DOM now
          // that the restore has landed, so the model matches the screen.
          if (this.isDestroyed && this.isDestroyed()) return;
          if (typeof this.syncGeometry === "function") this.syncGeometry();
        });
      }, 50);
    };
    const p = req.call(el);
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // The request never took (no user gesture, blocked by policy): drop the
        // handler and the snapshot so neither can fire later out of context.
        el.onfullscreenchange = null;
        this._fullscreenRestore = null;
        this._syncFullscreenButton(false);
      });
    }
    // Dropped without even a change event: nothing is fullscreen and the
    // snapshot is still pending.
    setTimeout(() => {
      if (document.fullscreenElement === el || !this._fullscreenRestore) return;
      if (!this._canMaximise()) return;
      el.onfullscreenchange = null;
      this._toggleWindowMaximise();
    }, DROPPED_WITHIN_MS);
  },

  // Mirror the fullscreen state on the header button (icon swap via its
  // `icons` pair) and on the root (for CSS). Called on EVERY change — the
  // button, Esc and a refused request all land here.
  _syncFullscreenButton(isFull) {
    const on = isFull ? 1 : 0;
    if (this.el) this.el.dataset.fullscreen = String(on);
    const btn = typeof this.getPart === "function" ? this.getPart("call-expand") : null;
    if (btn && typeof btn.setState === "function") btn.setState(on);
  },

  // Only a floating window that knows its work area (window/connect) can be
  // maximised in place; the meeting is already full-frame.
  _canMaximise() {
    return typeof this._workAreaBox === "function";
  },

  // In-window maximise: fill the WM work area; the same button puts back the
  // pre-fullscreen snapshot.
  _toggleWindowMaximise() {
    const done = () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      if (typeof this.syncGeometry === "function") this.syncGeometry();
    };
    if (this._maximiseRestore) {
      const r = this._maximiseRestore;
      this._maximiseRestore = null;
      this.change_size_to({ ...r }, done);
      this._syncFullscreenButton(false);
      return;
    }
    const area = this._workAreaBox();
    this._maximiseRestore = this._fullscreenRestore || {
      width: this.$el.width(),
      height: this.$el.height(),
      ...this.$el.position(),
    };
    this._fullscreenRestore = null;
    this.change_size_to(
      { left: 0, top: 0, width: area.width, height: area.height },
      done
    );
    this._syncFullscreenButton(true);
  },

  // Drop a pending restore. Call this from any path that deliberately gives the
  // window a NEW geometry while leaving fullscreen (the meeting's Tile left /
  // Tile right / Reframe), otherwise the queued restore would animate the
  // window straight back to its pre-fullscreen box and undo the user's pick.
  _cancelWindowFullscreenRestore() {
    this._fullscreenRestore = null;
    if (this.el) this.el.onfullscreenchange = null;
  },
};
