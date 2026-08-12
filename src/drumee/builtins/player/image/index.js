const { fitBoxes } = require("@drumee/ui-essentials")

require('../skin');
require('./skin');

const { TweenMax, Cubic } = require("@drumee/ui-core/vendor");
const snap = require('builtins/window/snap');
const details = require('builtins/player/widget/details');
const share = require('builtins/player/widget/share');
const renameInline = require('builtins/player/widget/topbar/rename');
const __core = require('player/interact');

// Gear-menu rows that act on the node rather than on the player. The MFS
// view the player was opened from implements all of them, so they are
// forwarded verbatim (see `_delegate`). Kept as an explicit allow-list:
// a catch-all would also swallow the player's own chrome events (raise,
// close, minimize) on their way to the base class.
const DELEGATED_SERVICES = [
  _e.copy,
  _e.remove,
  _a.chat,
  'chat-threads',
  'download-file-chat',
  'secure-share',
  'designation-link',
  'direct-url',
];

class __player_image extends __core {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.style.set(_K.imagePlayer);
    // While invisible (opacity:0 until display() reveals it) the player
    // must not hit-test: a stuck hidden player parked over the folder grid
    // swallows every click on the tiles beneath it. Scoped to the image
    // player — its display() and load-failsafe are the only reveal paths;
    // other players (e.g. props_viewer) reveal without calling display().
    this.style.set({ pointerEvents: "none" });
    this.contentKind = "image_smart";
    const { url } = this.actualNode();
    this._play = this._play.bind(this);
    this.mset({ url: url })
    this.info = null
    this.information = require('../skeleton/file-info');
    this._interval = Visitor.timeout(4000);
    this._duration = 0.5;
    this._currentSlide = 0;
    this._keyup_bind = this._keyUp.bind(this);
    RADIO_KBD.on(_e.keyup, this._keyup_bind);
    this.el.dataset.fullscreen = _a.off;
    this.siblingsData = [];
  }


  /**
 * 
 * @param {*} child 
 * @param {*} pn 
 */
  onPartReady(child, pn) {
    // Raise only while the window is being brought up — a late async
    // re-feed (rotate, WS refresh) must not steal the top spot from
    // whatever window the user is focused on.
    if (!this._raisedOnDisplay) this.raise();
    switch (pn) {
      case "slider-content":
        if (child._loaded) {
          this.display(child)
        }
        child.on(_e.loaded, (image) => {
          this.display(image)
        });
        this._armLoadFailsafe(child);
        break;
      case _a.content:
        /** DO NOT REMOVE */
        break;
      // `_syncRotationPending` flips `data-pending` on this button, but it
      // had nothing to flip it on — the part was never captured, so the
      // save-rotation button stayed hidden however much you rotated. Bind
      // it here, and sync straight away so a re-feed mid-rotation (the
      // rotate path re-feeds the skeleton) comes back showing the button.
      case "save-rotation-button":
        this.__saveRotationButton = child;
        this._syncRotationPending();
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * The gear menu, as data for the shared topbar widget.
   *
   * Figma order (3228:280002):
   *
   *   copy · download · print · rotate ▸ | rename · chat threads ▸ |
   *   share · get info · designation link | delete
   *
   * Rows that act on the node itself are only offered when we still have a
   * handle on the source MFS view (`this.media`) to forward them to — a
   * player opened straight from a share link has none.
   *
   * Every label and service is the one the shared contextmenu catalog uses
   * (builtins/contextmenu/skeleton/items.js), so the `onUiEvent` switch
   * below and the `DELEGATED_SERVICES` forwarding keep working unchanged.
   *
   * Called while the skeleton is built. `this.media` and the model are set
   * in `initialize` (player/interact.js), well ahead of the first feed, and
   * `restart()` rebuilds the skeleton — so the menu tracks permissions the
   * same way the old click-time builder did.
   */
  fileMenu() {
    const media = this.media;
    const editable = !!media && !Visitor.inDmz && !!this.canUpload();
    const sections = [];

    const first = [];
    if (media && !Visitor.inDmz) {
      first.push({ id: 'copy', label: LOCALE.COPY, icon: 'apps-copy', service: _e.copy });
    }
    if (Visitor.inDmz || this.canDownload()) {
      first.push(
        { id: 'download', label: LOCALE.DOWNLOAD, icon: 'app-download', service: _e.download },
        { id: 'print', label: LOCALE.PRINT, icon: 'app-print', service: 'print' },
      );
    }
    if (editable && media.imgCapable && media.imgCapable()) {
      first.push({
        id: 'rotate',
        label: LOCALE.ROTATE,
        icon: 'app-rotate',
        // A parent row: the submenu opens on hover, the row itself is a
        // no-op (`case "rotate-menu"` below).
        service: 'rotate-menu',
        children: [
          {
            id: 'rotate-left',
            label: LOCALE.ROTATE_LEFT,
            icon: 'app-rotate-left',
            className: 'rotate-left',
            service: _e.rotate,
            value: -90,
          },
          {
            id: 'rotate-right',
            label: LOCALE.ROTATE_RIGHT,
            icon: 'app-rotate-right',
            className: 'rotate-right',
            service: _e.rotate,
            value: 90,
          },
        ],
      });
    }
    if (first.length) sections.push(first);

    const naming = [];
    if (editable) {
      naming.push({ id: 'rename', label: LOCALE.RENAME, icon: 'app-edit', service: 'direct-rename' });
    }
    if (media && !Visitor.inDmz) {
      naming.push({
        id: 'chat-threads',
        label: LOCALE.CHAT_THREADS,
        icon: 'file-thread',
        service: 'chat-threads',
        children: [
          { id: 'view-chat-threads', label: LOCALE.VIEW_CHAT_THREADS, service: _a.chat },
          { id: 'download-file-chat', label: LOCALE.DOWNLOAD_CHAT_THREADS, service: 'download-file-chat' },
        ],
      });
    }
    if (naming.length) sections.push(naming);

    const details = [];
    if (editable) {
      switch (this.mget(_a.area)) {
        case _a.share:
          details.push({ id: 'secure-share', label: LOCALE.SHARE, icon: 'ctxmenu-share', service: 'secure-share' });
          break;
        case _a.private:
          details.push({ id: 'designation-link', label: LOCALE.DESIGNATION_LINK, icon: 'app-share', service: 'designation-link' });
          break;
        case _a.public:
          // No icon was specified for this row; `apps-link-simple` is the
          // closest match in the same family as the rest.
          details.push({ id: 'direct-url', label: LOCALE.URL_ADDRESS, icon: 'apps-link-simple', service: 'direct-url' });
          break;
      }
    }
    // "info" rather than `_e.settings`: this row is handled by the player
    // itself now (widget/details), not forwarded to the MFS view.
    details.push({ id: 'info', label: LOCALE.GET_INFO, icon: 'ctxmenu-info', service: 'info' });
    sections.push(details);

    if (media && media.canRemove && media.canRemove()) {
      sections.push([
        { id: 'trash', label: LOCALE.MOVE_TO_TRASH, icon: 'chat-action-trash', service: _e.remove, className: 'trash' },
      ]);
    }

    const items = [];
    sections.forEach((s, i) => {
      if (i) items.push({ separator: true });
      items.push(...s);
    });
    return items;
  }

  /**
   * Forward a menu row this player doesn't own to the source MFS view,
   * which implements the whole file-action vocabulary already. Returns
   * false when there's nothing to forward to, so the caller can fall
   * through to the base class rather than swallow the event.
   */
  _delegate(cmd, args) {
    const media = this.media;
    if (!media || media.isDestroyed() || !_.isFunction(media.onUiEvent)) {
      return false;
    }
    media.onUiEvent(cmd, args);
    return true;
  }

  /**
   * Print the image currently on screen. The inherited `case "print"` calls
   * `printPdf()`, which exists nowhere in the tree — for an image the
   * browser's own print of the full-resolution slide is both simpler and
   * correct. The frame is detached once the dialog is dismissed.
   */
  _printImage() {
    const { high } = this.getImageUrls();
    if (!high) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    let torn = 0;
    const done = () => {
      if (torn) return;
      torn = 1;
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    };

    document.body.appendChild(frame);
    const win = frame.contentWindow;
    const doc = win && win.document;
    if (!doc) return done();

    // Write the document ourselves rather than waiting on frame.onload —
    // that fires for the initial about:blank, before this content exists.
    doc.open();
    doc.write(
      '<!doctype html><html><head><style>' +
      'html,body{margin:0;padding:0}' +
      'img{max-width:100%;max-height:100vh;display:block;margin:0 auto}' +
      '@page{margin:10mm}' +
      '</style></head><body></body></html>'
    );
    doc.close();

    let fired = 0;
    const fire = () => {
      // A cached image can be `complete` before onload is wired, so both
      // paths race to call this — print exactly once.
      if (fired) return;
      fired = 1;
      try {
        win.focus();
        win.print();
      } catch (e) {
        this.warn('[print] failed', e);
      }
      // No reliable cross-browser "print dialog closed" event; a delayed
      // teardown is the conventional compromise.
      setTimeout(done, 1000);
    };

    const img = doc.createElement('img');
    img.onload = fire;
    img.onerror = () => {
      this.warn(`[print] image failed to load: ${high}`);
      done();
    };
    img.src = high;
    doc.body.appendChild(img);
    // Cached images can complete before the handler is attached.
    if (img.complete && img.naturalWidth) fire();
    // Nothing came back at all — don't leave the frame parked in the DOM.
    setTimeout(done, 20000);
  }

  /**
   * Geometry the "center" preset restores to — the centered canvas
   * `display()` computed for this image. Falls back to the current box if
   * the player was never sized that way (mobile, pinned window).
   */
  _defaultBounds() {
    return this._naturalBounds || snap.snapshotBounds(this);
  }

  /**
   * Show or hide the header's save-rotation button. Figma has no such
   * button, so it stays out of the resting header and only appears while
   * a client-side rotation is waiting to be pushed to the server.
   */
  _syncRotationPending() {
    const btn = this.__saveRotationButton;
    if (!btn || btn.isDestroyed()) return;
    btn.el.dataset.pending = this._hasPendingRotation() ? 1 : 0;
  }

  /**
   *
   * @returns
   */
  loadSiblings() {
    return this.fetchService(SERVICE.media.get_by_type, {
      page: 1,
      type: _a.image,
      nid: this.mget(_a.parentId),
      hub_id: this.mget(_a.hub_id)
    })
  }


  /**
   * 
   */
  onDomRefresh() {
    this.restart();
  }

  /**
   * Player skeleton rebuild. We gate this against the rotation window
   * because `restart()` gets invoked through several paths we don't
   * control — most notably a parent widget's base-class `updateContent`
   * iterating its children via `getItemsByAttr(nid)` and calling
   * `player.restart()` directly. During/just-after a rotate, the CSS
   * transform already shows the new orientation; rebuilding the skeleton
   * tears down and reloads the <img>, which is the user-visible glitch.
   */
  restart() {
    const recentMs = this._lastRotateAt
      ? performance.now() - this._lastRotateAt
      : Infinity;
    if (this._rotateInflight || recentMs < 3000) return;
    this.feed(require('./skeleton')(this));
    this.loadSiblings().then((r) => {
      this.siblingsData = r;
      // Re-feed if server-fresh data disagrees with our cached fields —
      // a previous rotate may have left a stale md5Hash on this model.
      const currentNid = this.mget(_a.nid);
      const fresh = Array.isArray(r) ? r.find((it) => it && it.nid == currentNid) : null;
      if (fresh) {
        const localHash = this.mget('md5Hash');
        const localMtime = this.mget(_a.mtime);
        if (
          (fresh.md5Hash && fresh.md5Hash !== localHash) ||
          (fresh.mtime != null && fresh.mtime !== localMtime)
        ) {
          if (fresh.mtime != null && fresh.ptime == null) fresh.ptime = fresh.mtime;
          this.mset(fresh);
          this._mergeMd5IntoMetadata(this, fresh.md5Hash);
          this.feed(require('./skeleton')(this));
        }
      }
      if (this.siblingsData.length > 1) {
        this.ensurePart("slider-buttons").then((p) => {
          p.el.dataset.state = 1;
        })
      }
    })
  }

  /**
   * 
  */
  onDestroy() {
    RADIO_KBD.off(_e.keyup, this._keyup_bind);
    this._disarmLoadFailsafe();
  }


  /**
   * Override the base-class `updateContent` so a WS-broadcast rotate
   * doesn't rebuild this player's <img>. Sibling items still get
   * refreshed via the child path; both paths apply the md5Hash patch
   * (see `_mergeMd5IntoMetadata`) so cache-bust URLs reflect the new
   * content without losing the rest of each item's metadata blob.
   */
  updateContent(args = {}) {
    const ourNid = this.mget(_a.nid);
    const isOurNode = ourNid != null && ourNid == args.nid;
    this.getItemsByAttr(_a.nid, args.nid).filter((c) => {
      if (!c || c === this) return false;
      c.mset(args);
      this._mergeMd5IntoMetadata(c, args && args.md5Hash);
      if (c.restart) c.restart();
    });
    if (isOurNode) {
      this.mset(args);
      this._mergeMd5IntoMetadata(this, args && args.md5Hash);
    }
  }

  /**
   * Merge a new md5Hash into a view's existing metadata blob (preserving
   * any other fields it held). After a rotate/replace, `restart()` calls
   * `metadata()` which re-reads md5Hash from this blob and overwrites
   * the top-level value — so without merging, the stale hash from the
   * pre-rotate metadata clobbers the new one and the cache-bust URL
   * never changes.
   */
  _mergeMd5IntoMetadata(view, md5Hash) {
    if (!view || !md5Hash || typeof view.mget !== 'function') return;
    let md = view.mget(_a.metadata);
    let wasString = false;
    if (md == null) {
      md = {};
    } else if (typeof md === 'string') {
      wasString = true;
      try { md = JSON.parse(md); } catch (e) { md = {}; }
    }
    if (md.md5Hash === md5Hash) return;
    md.md5Hash = md5Hash;
    view.mset({ metadata: wasString ? JSON.stringify(md) : md });
  }

  /**
   * 
   * @param {*} cmd 
   */

  /**
   * The Details card is a separate WM window, so closing this player would
   * otherwise leave it orphaned over the desk.
   */
  onBeforeDestroy() {
    details.close(this);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(cmd) {
    const service = cmd.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.play:
        this._loop = 1;
        return this.play();

      case _a.prev: return this.prev();
      case "pause": return this.pause();
      case _a.next: return this.next();

      case _a.fullscreen:
        return this.__sliderWrapper.el.requestFullscreen();

      case _e.rotate: {
        // Buttons set `value: 90` or `value: -90` in the skeleton. Fall
        // back to the className (`rotate-left` / `rotate-right`) if the
        // value didn't make it onto the model for any reason.
        const className = (cmd.el && cmd.el.className) || '';
        const fromClass = /rotate-left/.test(className) ? -90
          : /rotate-right/.test(className) ? 90 : null;
        const resolved = cmd.mget(_a.value) ?? cmd.mget('angle') ?? fromClass ?? 90;
        return this._rotate(resolved);
      }

      // Parent row of the Rotate submenu — hover opens the children, the
      // row itself does nothing.
      case "rotate-menu":
        return;

      case "save-rotation":
        return this._saveRotation();

      case 'info':

        return details.open(this);

      // "Get info" — the contextmenu row emits `_e.settings`, not "info".
      // Prefer the file's own properties panel (what the row means
      // everywhere else); fall back to the player's inline overlay when
      // the player has no source view to ask.
      case _e.settings:
        if (this._delegate(cmd)) return;
        return this._showInfo();

      case 'close-player':
        return this.goodbye();

      case 'print':
        if (this._dmzGateDownload()) return;
        return this._printImage();

      case 'window-zoom':
        snap.toggleZoom(this, this._snapOpt());
        // toggleZoom is a toggle: a second click restores, which is the
        // "center" preset visually.
        return this._markSnapPreset(this._zoomed ? 'full' : 'center');

      case 'window-tile-left':
        snap.tileToSide(this, 'left', this._snapOpt());
        return this._markSnapPreset('left');

      case 'window-tile-right':
        snap.tileToSide(this, 'right', this._snapOpt());
        return this._markSnapPreset('right');

      case 'window-reframe':
        snap.reframe(this, this._defaultBounds(), this._snapOpt());
        return this._markSnapPreset('center');

      // Rename edits the title in place instead of being forwarded: the
      // MFS view opens its editor on the tile in the folder grid, behind
      // this player, where nobody can see it.
      case 'direct-rename':
        return renameInline(this);

      // Share: only an external workspace can share a file out; from an
      // internal one the user is shown what to do instead.
      case 'secure-share':
        return share.click(this, cmd);

      default:
        // Gear-menu rows that act on the node itself go to the source MFS
        // view; everything else is player chrome and belongs to the base.
        if (DELEGATED_SERVICES.includes(service) && this._delegate(cmd)) return;
        return super.onUiEvent(cmd);
    }
  }

  /**
   * Snap minimums for this window. The player's skeleton floors at 250px,
   * far below the folder window's 760×480 default, so a half-tile is free
   * to be genuinely half.
   */
  _snapOpt() {
    return { minWidth: 250, minHeight: 250 };
  }

  /**
   * Light up the Move & Resize preset the window now sits in. Dragging or
   * resizing by hand doesn't clear it — the folder window's zoom menu has
   * the same characteristic, and tracking every geometry change to undo a
   * highlight is not worth the listener.
   */
  _markSnapPreset(preset) {
    for (const name of ['full', 'left', 'right', 'center']) {
      const part = this[`__snap${name.charAt(0).toUpperCase()}${name.slice(1)}`];
      if (part && !part.isDestroyed()) {
        part.el.dataset.active = name === preset ? 1 : 0;
      }
    }
  }

  /**
   * 
  */
  _keyUp(e) {
    if (Wm.getActivePlayer() != this) return;
    // RADIO_KBD is global, so arrow keys typed into the title's rename
    // editor would page through siblings underneath it.
    if (this._titleRenaming) return;

    switch (e.key) {
      case 'ArrowRight':
        return this.next();

      case 'ArrowLeft':
        return this.prev();
    }
  }

  /**
   * Rotate purely client-side for instant feedback, then persist to the
   * server in the background. The visible image is never re-fetched —
   * a CSS rotate (plus a scale-to-fit so the rotated bbox stays inside
   * the player container) is enough. Server response only updates
   * metadata and refreshes sidebar thumbnails; the next time the player
   * opens this image fresh, it will load already correctly oriented.
   */
  _rotate(angle) {
    angle = parseInt(angle, 10) || 90;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    // Dedup framework/touch double-fires that arrive within a few ms.
    if (this._lastRotateAt && angle === this._lastRotateAngle && (now - this._lastRotateAt) < 250) {
      return;
    }
    this._lastRotateAt = now;
    this._lastRotateAngle = angle;

    this._displayRotation = (this._displayRotation || 0) + angle;
    this._pendingRotation = (this._pendingRotation || 0) + angle;
    this._animateRotation(this._displayRotation);
    this._syncRotationPending();
  }

  /**
   * Persist the accumulated rotation server-side. No-op if nothing
   * actually changed (e.g., four 90° clicks brought us back to 0°).
   */
  _saveRotation() {
    if (!this._hasPendingRotation()) return;
    this._flushRotate();
  }

  /**
   * Has the user rotated since the last save? Normalize cumulative angle
   * to a 0/90/180/270 bucket; 0 means nothing to save.
   */
  _hasPendingRotation() {
    const norm = ((this._pendingRotation || 0) % 360 + 360) % 360;
    return norm !== 0;
  }

  /**
   * rAF-driven rotation animation. Each frame we recompute both the
   * angle (eased from `_animFromDeg` to `targetDeg`) AND the scale that
   * keeps the rotated bbox inside the parent box. Doing it per-frame
   * matters because the correct scale-to-fit value is non-linear in the
   * angle (peaks at 45°), so the alternative — a CSS `transition: transform`
   * linearly interpolating between two scale values — clips the image
   * mid-rotation and looks like a separate second motion. If a new click
   * arrives mid-animation, we retarget seamlessly from the current angle.
   */
  _animateRotation(targetDeg) {
    if (this._rotAnimId) cancelAnimationFrame(this._rotAnimId);
    const slider = this.__sliderContent;
    if (!slider || !slider.el) return;

    const fromDeg = this._currentAnimatedRotation || 0;
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const duration = 320;
    // Cubic ease-out — same shape as cubic-bezier(0.22, 1, 0.36, 1).
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const deg = fromDeg + (targetDeg - fromDeg) * ease(t);
      this._currentAnimatedRotation = deg;
      this._writeRotationStyles(deg);
      if (t < 1) {
        this._rotAnimId = requestAnimationFrame(tick);
      } else {
        this._rotAnimId = null;
      }
    };
    this._rotAnimId = requestAnimationFrame(tick);
  }

  /**
   * Write transform + scale-to-fit for a given angle. Called every frame
   * by `_animateRotation` and directly by `_resetRotationStyles`.
   */
  _writeRotationStyles(deg) {
    const slider = this.__sliderContent;
    if (!slider || !slider.el) return;
    const target = slider.el;

    let scale = 1;
    if (deg) {
      // clientWidth/Height ignore transforms — that's what we want here.
      const w = target.clientWidth;
      const h = target.clientHeight;
      const parent = target.parentElement;
      const pw = parent ? parent.clientWidth : w;
      const ph = parent ? parent.clientHeight : h;
      if (w && h && pw && ph) {
        const rad = (deg * Math.PI) / 180;
        const c = Math.abs(Math.cos(rad));
        const s = Math.abs(Math.sin(rad));
        const rotW = w * c + h * s;
        const rotH = w * s + h * c;
        scale = Math.min(pw / rotW, ph / rotH, 1);
      }
    }

    target.style.transformOrigin = 'center center';
    target.style.willChange = 'transform';
    target.style.transition = 'none'; // we drive every frame ourselves
    target.style.transform = deg ? `rotate(${deg}deg) scale(${scale})` : '';
  }

  /**
   * Strip rotation-only inline styles when navigating to a new slide so
   * the next image starts from a clean transform state.
   */
  _resetRotationStyles() {
    if (this._rotAnimId) {
      cancelAnimationFrame(this._rotAnimId);
      this._rotAnimId = null;
    }
    this._currentAnimatedRotation = 0;
    const slider = this.__sliderContent;
    if (!slider || !slider.el) return;
    const s = slider.el.style;
    s.transformOrigin = '';
    s.willChange = '';
    s.transition = '';
    s.transform = '';
  }

  /**
   * Persist the accumulated rotation server-side. We never reload the
   * slider image — the CSS rotation already represents the new
   * orientation. Sidebar items get a deferred refresh so their
   * thumbnails reflect the new orientation without blocking the player.
   */
  _flushRotate() {
    // Normalize the cumulative angle to a positive 0..360 range. The
    // server expects a non-negative angle (sending -90 was being
    // silently rejected, which is why the rotation didn't persist).
    // 0 means "back to original" — skip the request entirely.
    const angle = ((this._pendingRotation || 0) % 360 + 360) % 360;
    if (angle === 0) {
      this._pendingRotation = 0;
      this._syncRotationPending();
      return;
    }
    this._pendingRotation = 0;
    this._syncRotationPending();
    this._rotateInflight = true;
    const { nid, hub_id } = this.actualNode();
    this.postService({
      service: SERVICE.media.rotate,
      nid,
      hub_id,
      angle,
      echoId: this.mget('echoId'),
    }).then((data) => {
      if (data && data.mtime != null && data.ptime == null) data.ptime = data.mtime;
      this.mset(data);
      this._mergeMd5IntoMetadata(this, data && data.md5Hash);
      if (this.siblingsData[this._currentSlide]) {
        this.siblingsData[this._currentSlide] = data;
      }
      requestAnimationFrame(() => {
        // Refresh every visible widget pointing at this nid. Home-grid
        // tiles don't subscribe to WS_EVENT (only __window_mfs widgets
        // do), so without this loop a reopen from the home grid would
        // read a stale md5Hash off the still-cached tile. Skip self —
        // the CSS rotation already shows the new orientation.
        const matches = (Wm.getItemsByAttr ? Wm.getItemsByAttr(_a.nid, data.nid) : []) || [];
        for (const item of matches) {
          if (!item || item === this) continue;
          if (!(item.isMfs || item.isFolder)) continue;
          item.mset(data);
          // Same md5Hash → metadata patch we apply to ourselves;
          // without it, restart() will re-read md5Hash from the stale
          // metadata blob and clobber the new top-level value.
          this._mergeMd5IntoMetadata(item, data && data.md5Hash);
          if (item.isRegularFile && item.isRegularFile()) item.restart();
        }
      });
      this._rotateInflight = false;
      if (this._pendingRotation) this._flushRotate();
    }).catch((err) => {
      console.warn('[rotate] server request failed, rolling back', err);
      this._displayRotation = (this._displayRotation || 0) - angle;
      this._pendingRotation = (this._pendingRotation || 0) + angle;
      this._animateRotation(this._displayRotation);
      this._syncRotationPending();
      this._rotateInflight = false;
    });
  }

  /**
   * 
  */
  _showInfo() {
    const wrapperInfo = this.__wrapperInfo;
    if (wrapperInfo.el.dataset.state === _a.closed) {
      wrapperInfo.feed(this.information(this));
    } else {
      wrapperInfo.clear();
    }
  }


  /**
   * 
   */
  prev() {
    if (this.timer) {
      clearTimeout(this.timer);
      if (this._isPlaying) {
        this.timer = setTimeout(this.play.bind(this), this._interval);
      }
    }
    this._currentSlide--;
    this._loop = 1;
    this._play();
  }

  /**
   * 
   */
  pause() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this._loop = 0;
    this.__ctrlPlay.setIcon('desktop_musicplay');
    this.__ctrlPlay.mset({ service: _e.play });
    this._isPlaying = 0;
  }

  /**
   * 
   */
  next() {
    if (this.timer) {
      clearTimeout(this.timer);
      if (this._isPlaying) {
        this.timer = setTimeout(this.play.bind(this), this._interval);
      }
    }

    this._currentSlide++;
    this._loop = 1;
    this._play();
  }

  /**
   * 
   * @param {*} cmd 
   */
  onExitFullscreen(cmd) {
    clearTimeout(this.timer);
    document.removeEventListener('fullscreenchange',
      this.onExitFullscreen.bind(this), false
    );

    if (document.fullscreenElement) {
      this.__actionButtons.el.dataset.mode = _a.open;
      this.el.dataset.fullscreen = _a.on;
    } else {
      this.__actionButtons.el.dataset.mode = _a.closed;
      this.el.dataset.fullscreen = _a.off;
    }

  }

  /**
   * 
   * @param {*} cmd 
   */
  max_size() {
    let size;
    if (this.ratio > 1) {
      size = fitBoxes(
        { width: window.innerWidth, height: window.innerHeight },
        { width: this.$el.width(), height: this.$el.height() }
      );
      size.height = size.height - this.topbarHeight;
    } else {
      size = fitBoxes(
        { width: window.innerWidth - 20, height: window.innerHeight },
        { width: this.$el.width(), height: this.$el.height() }
      );
      if (size.height > window.innerHeight) {
        size.width = size.width * window.innerHeight / size.height;
        size.height = window.innerHeight;
      }
    }
    return {
      top: (((window.innerHeight - size.height) / 2) - Wm.$el.offset().top),
      left: (((window.innerWidth - size.width) / 2) - Wm.$el.offset().left),
      ...size
    }
  }

  /**
   * The open file moved to another workspace and came back with a new node id
   * (window/utils followMovedNode already re-pointed the model). Every image URL
   * is built from that id, so the ones on screen now address a node that no
   * longer exists — repaint from the model instead of waiting for a reload.
   *
   * @param {string} nid the node id the file now has
   * @param {*} dest the destination attributes from the move event
   */
  onMovedNodeFollowed(nid, dest = {}) {
    // The slide the carousel is showing is a copy of the old attributes; leaving
    // it stale would make the next prev/next step jump back to the dead id.
    const current = this.siblingsData[this._currentSlide];
    if (current && `${current.nid || ""}` !== `${nid}`) {
      this.siblingsData[this._currentSlide] = {
        ...current,
        ...dest,
        nid,
        hub_id: dest.actual_hub_id || dest.hub_id || current.hub_id,
      };
    }
    if (!this.__sliderContent) return;
    const urls = this.getImageUrls(this.siblingsData[this._currentSlide]);
    this.__sliderContent.reload(urls);
  }

  /**
   *
   *
   */
  _play(init) {
    // Commit any unsaved rotation BEFORE the model moves to the next slide.
    // `_flushRotate` reads nid/hub_id off `actualNode()`, so flushing after
    // the switch would persist this image's angle against its neighbour.
    if (this._hasPendingRotation()) this._flushRotate();
    if (this._isPlaying == null) {
      this._currentSlide++;
    }
    if (this._currentSlide >= this.siblingsData.length) this._currentSlide = 0;
    if (this._currentSlide < 0) this._currentSlide = this.siblingsData.length - 1;
    let data = this.siblingsData[this._currentSlide]
    let { filename } = data;
    this.model.set(data);
    this.__playerTitle.set({ content: filename })
    let urls = this.getImageUrls(data);
    this._isPlaying = 1;
    // Switching slides — drop any leftover rotation state from the previous image.
    this._displayRotation = 0;
    this._pendingRotation = 0;
    this._consumeRotationOnNextLoad = 0;
    this._resetRotationStyles();
    this._syncRotationPending();
    this.__sliderContent.reload(urls);
  }

  /**
   * 
   *  
   */
  play() {
    if (!this._loop) return;
    this._currentSlide++;
    this._play();
    this.__ctrlPlay.setIcon('desktop_musicpause');
    this.__ctrlPlay.mset({ service: "pause" });

    this.timer = setTimeout(this.play.bind(this), this._interval);

    if (!this._isPlaying) {
      document.addEventListener('fullscreenchange',
        this.onExitFullscreen.bind(this), false
      );
      this._isPlaying = 1;

      setTimeout(() => {
        this.__ctrlPrev.el.dataset.state = 0;
        this.__ctrlNext.el.dataset.state = 0;
      }, this._interval);
    }
  }

  /**
   * 
   * @param {*} e 
   */
  gotoSlide(e) {
    return this._currentSlide = e.index;
  }

  /**
   * 
   * @param {*} service 
   */
  slider(img, url) {
    this.__slider.$el.css({
      'background-image': `url(${url})`,
      opacity: 0
    });
    let f = () => {
      this.__prevSlider.$el.css({
        'background-image': `url(${url})`,
        opacity: 1
      });
      this._hasPrev = 1;
    }
    if (this._hasPrev) {
      this.__prevSlider.$el.css({
        opacity: 1
      });
      TweenMax.to(this.__prevSlider.$el, this._duration, { opacity: 0, onComplete: f, ease: Cubic.easeIn });
    } else {
      f();
    }
    TweenMax.to(this.__slider.$el, this._duration, { opacity: 1, ease: Cubic.easeIn });
  }


  /**
   * 
   * @param {*} data 
   */
  getImageUrls(data) {
    if (!data) {
      data = this.siblingsData[this._currentSlide];
    }
    let { keysel, mfsRootUrl } = bootstrap();
    let { nid, hub_id, ptime, changed } = data;
    let v = ptime || changed;
    let high = `${mfsRootUrl}/file/slide/${nid}/${hub_id}?v=${v}&keysel=${keysel}`;
    let low = `${mfsRootUrl}/file/preview/${nid}/${hub_id}?v=${v}&keysel=${keysel}`;
    return { low, high }
  }

  /**
   * 
   */
  // async preLoad() {
  //   this.siblingsUrls = [];
  //   for (let item of this.siblingsData) {
  //     this.siblingsUrls.push(this.getImageUrls(item));
  //   }
  //   this.siblingsData
  //   this.siblingsUrls.unshift(this.getImageUrls());
  // }


  /**
   * 
   * @param {*} list 
   */
  load(list) {
    // ===============
    //  DO NOT DELETE
    // ===============
  }

  /**
   * Size the player window as a stable square canvas big enough to
   * contain the image at any rotation. The canvas side is the image's
   * longest natural dimension, capped to the viewport. The image fills
   * this canvas with `object-fit: contain` (see player-image skin),
   * so landscape and portrait orientations both fit naturally and
   * rotation needs no window resize — only a transform on the <img>.
   */
  display(image) {
    const el = image.el;
    const naturalW = el.naturalWidth;
    const naturalH = el.naturalHeight;
    if (!naturalW || !naturalH) return;

    // The image made it: disarm the load failsafe and make the (until now
    // opacity-0, non-interactive) window real. The base display() does this
    // for other players; this override must mirror it, otherwise the player
    // stays an invisible click-trap over the folder grid.
    this._disarmLoadFailsafe();
    this.el.dataset.ready = 1;
    this.el.style.pointerEvents = "";

    // Reserve vertical space for the player chrome (topbar + bottom controls).
    const CHROME_H = 132;
    const max_w = window.innerWidth - 100;
    const max_h = window.innerHeight - 100 - CHROME_H;

    let width, height, top, left;

    if (Visitor.isMobile()) {
      width = window.innerWidth;
      height = window.innerHeight;
      top = 0;
      left = 0;
    } else {
      // Square canvas keyed to the longest dim — both orientations fit.
      const naturalMax = Math.max(naturalW, naturalH);
      const canvasSide = Math.min(naturalMax, max_w, max_h);
      width = canvasSide;
      height = canvasSide + CHROME_H;
      const shift = this._stackShift || 0;
      left = Math.max(20, (window.innerWidth - width) / 2) + shift;
      top = Math.max(20, (window.innerHeight - height) / 2) + shift;
    }

    this.size = { width, height };
    this._pos = { top, left };
    this.anti_overlap(this._pos);
    // The geometry the "center" Move & Resize preset restores to.
    this._naturalBounds = {
      left: Math.round(this._pos.left),
      top: Math.round(this._pos.top),
      width: Math.round(width),
      height: Math.round(height),
    };

    if (this._isPlaying) {
      // Keep `alpha: 1` here too: `_play()` can flip `_isPlaying` before the
      // first image finishes loading, and this branch used to leave the
      // window permanently invisible in that race.
      TweenMax.to(this.$el, 1.5, { width, height, alpha: 1 });
    } else {
      this.$el.css({ width, height, ...this._pos });
      TweenMax.to(this.$el, 0.5, { alpha: 1 });
    }
  }

  /**
   * The window is revealed only by display(), which fires only when the
   * <img> actually loads — ui-core's image_smart installs no onerror and
   * its high-quality poll never resolves on a 404. If the preview/slide
   * asset fails, the player would otherwise stay a permanent invisible
   * overlay and the source tile would keep its wait-latch. Watch for load
   * errors (capture phase — error events don't bubble) plus a generous
   * stall timeout, and tear the player down cleanly via failedToStart()
   * (suppress + media.wait(0) + network alert).
   */
  _armLoadFailsafe(child) {
    this._disarmLoadFailsafe();
    const fail = (reason) => {
      if (this.isDestroyed() || this.el.dataset.ready == 1) return;
      this.failedToStart(reason);
    };
    this._loadErrorHandler = (e) => {
      const img = e.target;
      if (!img || img.tagName !== "IMG") return;
      // Only fatal while nothing has been displayed yet.
      if (this.el.dataset.ready != 1) fail(`image failed to load: ${img.src}`);
    };
    this._loadErrorTarget = child.el;
    child.el.addEventListener(_e.error, this._loadErrorHandler, true);
    // Stall watchdog: only kill genuinely dead loads. An image whose bytes
    // already arrived (naturalWidth > 0) but whose 'loaded' signal was
    // missed (image_smart's 200ms poll race) gets revealed instead of
    // killed; an <img> still transferring on a slow network gets one more
    // grace period instead of a misleading network-error teardown.
    const onWatchdog = (attempt) => {
      if (this.isDestroyed() || this.el.dataset.ready == 1) return;
      const el = child.el;
      if (el && el.naturalWidth > 0) {
        this.display(child);
        return;
      }
      if (el && !el.complete && attempt < 2) {
        this._loadWatchdog = setTimeout(() => onWatchdog(attempt + 1), 30000);
        return;
      }
      fail("image load stalled");
    };
    this._loadWatchdog = setTimeout(() => onWatchdog(1), 30000);
  }

  /**
   *
   */
  _disarmLoadFailsafe() {
    if (this._loadWatchdog) {
      clearTimeout(this._loadWatchdog);
      this._loadWatchdog = null;
    }
    if (this._loadErrorTarget && this._loadErrorHandler) {
      this._loadErrorTarget.removeEventListener(
        _e.error,
        this._loadErrorHandler,
        true
      );
      this._loadErrorTarget = null;
      this._loadErrorHandler = null;
    }
  }

  /**
 * 
 * @param {*} data 
 */
  async parseInfo(data) {
    super.parseInfo(data);
    if (data.Image) {
      let geometry = data.Image["Page geometry"];
      if (geometry) {
        geometry = geometry.replace(/\+.+$/, "");
        let [w, h] = geometry.split(/x/i);
        this.width = w;
        this.height = h;
      }
    }
    this.width = this.width || this.$el.width();
    this.height = this.height || this.$el.height();

    let max_w = window.innerWidth - 120;
    let max_h = window.innerHeight - 120;
    if (this.width > max_w || this.height > max_h) {
      this.size = fitBoxes(
        { width: window.innerWidth, height: window.innerHeight },
        { width: this.width, height: this.height },
      );
      this.width = this.size.width;
      this.height = this.size.height;
    } else {
      this.size = {
        width: this.width,
        height: this.height
      };
    }
    let left = 0;
    let top = 0;
    if (!Visitor.isMobile()) {
      left = (window.innerWidth - this.width) / 2;
      top = (window.innerHeight - this.height) / 2;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    return true;
  }

}

module.exports = __player_image;
