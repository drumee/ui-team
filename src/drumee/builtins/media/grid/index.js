const { TweenLite, TimelineMax } = require("@drumee/ui-core/vendor");

const Rectangle = require('rectangle-node');

// Half the opening a drop slot leaves between two tiles. Only the two tiles
// flanking the slot move — the rest of the row stays put — so this has to
// stay well under a tile width or the opening overruns the neighbours behind
// it. A tile-sized (120px) opening did exactly that: it visually clipped the
// tiles further along the row. Keep in sync with the [data-insert] offsets in
// skin/index.scss.
const SLOT_SHIFT = 24;

class __media_grid extends DrumeeMediaInteract {
  constructor(...args) {
    super(...args);
    this.enablePreview = this.enablePreview.bind(this);
    this.initBounds = this.initBounds.bind(this);
    this.setupInteract = this.setupInteract.bind(this);
    this.allowedAction = this.allowedAction.bind(this);
    this.shift = this.shift.bind(this);
    this.resetMotion = this.resetMotion.bind(this);
    this._onStartShifting = this._onStartShifting.bind(this);
    this._onStopShifting = this._onStopShifting.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.type = opt.type || _a.media;
    this.isGrid = 1;
    this.model.atLeast({
      aspect: _a.grid,
      area: _a.personal
    });

    this.cursorPosition = { left: 30, top: 30 };

    this.size = {
      width: 121,
      height: 120
    }
    this.initContainer()
    switch (opt.mode) {
      case _a.vignette:
        return this.innerContent = require('./template/vignette')
      default:
        this.innerContent = require('./template');
    }

  }


  /**
   * 
   */
  initContainer() {
    let filetype = this.mget(_a.filetype);
    let hubs = this.mget("hubs");
    let areas = this.mget("areas");
    let hub = 0;
    this.containsHub = filetype == _a.hub;
    if (!_.isEmpty(hubs)) {
      hub = 1;
      this.containsHub = true;
      this.isHub = 1;
    }

    this.container = [
      Skeletons.Box.X({
        className: `${this.fig.family}__container ${this.mget(_a.filetype)}`,
        sys_pn: _a.content,
        active: 0,
        dataset: {
          hub,
        },
      })
    ]

    if (areas && filetype == _a.folder) {
      this.container.push(
        Skeletons.Element({
          className: `${this.fig.family}__areas`,
          flow: _a.x,
          content: require('./template/folder/areas')(this)
        })
      )
    }

  }

  /**
   * Kebab → unified popup. Invokes the same SDK-bound handler that runs on
   * a real right-click (`el.oncontextmenu`, set by `@drumee/ui-core/letc/
   * addons/letc.js#__handleContextmenu`) so kebab and right-click produce
   * an identical `.drumee-contextmenu` popup. Calling the bound handler as
   * a function bypasses `dispatchEvent('contextmenu')` quirks where
   * synthetic events do not reach property-style handlers.
   *
   * @param {Event} e
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e);
    if (service === 'context-menu') {
      e.stopPropagation();
      e.preventDefault();
      // Trigger is active (its menu is up): this click closes it. ui-core's
      // own outside-pointerdown close (volatility 4) only fires 300ms later,
      // so without this the click would open a second menu instead.
      if (this._closeMenu) {
        this._closeMenu();
        return;
      }
      const trigger = this.el.querySelector('.media-context-menu__trigger')
        || this.el.querySelector('.media-context-menu__folder-trigger');
      const rect = trigger
        ? trigger.getBoundingClientRect()
        : { right: e.clientX, bottom: e.clientY };
      const handler = this.el && this.el.oncontextmenu;
      if (typeof handler === 'function') {
        // Plain object provides every field the SDK's __handleContextmenu
        // reads (`@drumee/ui-core letc/addons/letc.js:355`): pageX/pageY for
        // popup positioning, the three stop* / preventDefault methods, plus
        // shiftKey / ctrlKey for the debug short-circuit.
        handler({
          pageX: rect.right + (window.scrollX || 0),
          pageY: rect.bottom + (window.scrollY || 0),
          clientX: rect.right,
          clientY: rect.bottom,
          target: this.el,
          shiftKey: false,
          ctrlKey: false,
          preventDefault() {},
          stopPropagation() {},
          stopImmediatePropagation() {},
        });
        if (trigger) this._stickMenuToTrigger(trigger);
      }
      return;
    }
    super.dispatchUiEvent(e);
  }

  /**
   * Keep the kebab's popup attached to its trigger while the grid scrolls.
   *
   * ui-core places the menu once, at the trigger's rect at open time, inside
   * `window.drumeeDialog` — a fixed 0×0 layer at the viewport origin
   * (router/skin/index.scss `&__dialog`), so the menu's left/top ARE viewport
   * coordinates. Nothing moved it afterwards, so scrolling the grid left the
   * menu floating over other tiles. Re-anchor on every scroll (capture phase:
   * the scroller is a folder-window body, not the document) and on resize:
   * below the trigger when it fits, flipped above it when it doesn't, clamped
   * into the viewport. Listeners drop themselves once the menu is gone.
   *
   * @param {HTMLElement} trigger
   */
  _stickMenuToTrigger(trigger) {
    const dialog = window.drumeeDialog;
    const last = dialog && !dialog.isDestroyed() && dialog.children.last();
    const menu = last && last.el;
    if (!menu || !menu.classList.contains('drumee-contextmenu')) return;

    if (this._unstickMenu) this._unstickMenu();

    // Active state for as long as the menu is up (skin/context-menu.scss).
    trigger.dataset.active = '1';

    // The visible grid pane. Once the trigger scrolls out of it the menu would
    // point at a tile nobody can see, so close it instead of following.
    const pane = trigger.closest('.window__icons-list, [class*="__icons-list"]');

    let frame = 0;
    let scrolled = false;
    const place = () => {
      frame = 0;
      if (!menu.isConnected || !trigger.isConnected) return unstick();
      const r = trigger.getBoundingClientRect();
      if (pane && scrolled) {
        const b = pane.getBoundingClientRect();
        if (r.top < b.top || r.bottom > b.bottom) {
          close();
          return;
        }
      }
      const w = menu.offsetWidth;
      const h = menu.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = r.bottom;
      if (top + h > vh && r.top - h >= 0) top = r.top - h;
      top = Math.max(0, Math.min(top, vh - h));
      const left = Math.max(0, Math.min(r.right, vw - w));
      menu.style.top = `${Math.round(top)}px`;
      menu.style.left = `${Math.round(left)}px`;
    };
    const schedule = (ev) => {
      // Only a scroll may close the menu; the open-time placement and resizes
      // must not, or a tile half-clipped at the pane's edge could never open one.
      if (ev && ev.type === 'scroll') scrolled = true;
      if (!frame) frame = requestAnimationFrame(place);
    };
    // However the menu goes away — this trigger, an item click, an outside
    // click, the pane-overflow close above — drop the listeners and the
    // active state with it.
    const gone = new MutationObserver(() => {
      if (!menu.isConnected) unstick();
    });
    const unstick = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      gone.disconnect();
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      delete trigger.dataset.active;
      if (this._unstickMenu === unstick) {
        this._unstickMenu = null;
        this._closeMenu = null;
      }
    };
    const close = () => {
      unstick();
      if (!last.isDestroyed()) last.suppress();
    };

    if (menu.parentNode) gone.observe(menu.parentNode, { childList: true });
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    this._unstickMenu = unstick;
    this._closeMenu = close;
    place();
  }

  onBeforeDestroy() {
    if (this._unstickMenu) this._unstickMenu();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   *
   */
  rowsCount(value) {
    let l = 1;
    if (value && value.length) {
      l = Math.ceil((value.length + 1) / 11);
    } else {
      l = Math.ceil((this.mget(_a.filename).length + 1) / 11);
    }
    if (l > 5) l = 5;
    return l;
  }


  /**
   * 
   * @param {*} toggle 
   */
  enablePreview(toggle) {
    this.$preview = this.$el.find(`#${this._id}-preview`);
    switch (this.model.get(_a.filetype)) {
      case _a.hub:
        if (this.mget(_a.area) === _a.private) {
          this.iconType = _a.vector;
        } else if (this.mget(_a.area) === _a.public) {
          this.iconType = _a.vignette;
        } else if (toggle) {
          this.iconType = _a.vignette;
        }
        break;

      case _a.image:
      case _a.video:
      case _a.vector:
        this.iconType = _a.vignette;
        break;

      default:
        // Image-capable documents (PDF) show a real poster, so treat them like
        // vignettes (hides the icon pseudo-overlay); other docs keep the icon.
        this.iconType = this.imgCapable() ? _a.vignette : _a.vector;
    }
    this.trigger('media:loaded');
    this.content.el.dataset.icontype = this.iconType;
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
      ui.offset.left, ui.offset.top, ui.helper.width() * 0.7, ui.helper.height() * 0.7
    );
    this.selfOverlapped = this.bbox.intersection(this.rectangle);
    Wm.capture(this);
  }

  /**
   * Slide the tile aside to open an insertion slot (or back to rest).
   * ±24px on both slot neighbors plus the 16px --grid-gap ≈ a 64px opening —
   * wide enough to read as "drop here", unlike the old ±15px nudge. No
   * _animIsActive early-return anymore: dropping a reset request while the
   * open-tween was still running is exactly how tiles got stuck aside.
   * overwrite kills the conflicting tween (GSAP defaults to letting both
   * run, and the stale one's onComplete would re-measure bounds mid-flight).
   * @param {*} side
   * @param {*} bar 1 to anchor the insertion indicator on this tile
   */
  shift(side, bar) {
    let x;
    switch (side) {
      case _a.left:
        x = -SLOT_SHIFT;
        break;

      case _a.right:
        x = SLOT_SHIFT;
        break;

      default:
        x = 0;
    }
    if (bar && side) {
      this.el.dataset.insert = side;
    } else {
      this.el.removeAttribute("data-insert");
    }
    if (this._shiftX === x) {
      return this;
    }
    this._shiftX = x;
    const instant =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Latched for snapToRest: from here on this element carries a GSAP
    // transform, even once it settles back to 0.
    this._transformTouched = true;
    TweenLite.to(this.$el, instant ? 0 : .2, {
      x,
      overwrite: "auto",
      onStart: this._onStartShifting,
      onComplete: this._onStopShifting
    });
    return this;
  }

  /**
   *
   */
  resetMotion() {
    this.el.dataset.over = _a.off;
    this.el.dataset.hover = _a.off;
    // A shift armed just before the drop must not land after this cleanup.
    this.cancelShift();
    this.shift();
  }

  /**
   * Drop any shift instantly — no tween, no pending request. The re-measure
   * after a re-render needs the tile at its resting seat RIGHT NOW: mid-tween
   * $el.offset() still carries part of the ±24px slide, and caching that put
   * the drag zones beside their tiles (grid re-drags then worked only when
   * the tween happened to have finished).
   */
  snapToRest() {
    this.cancelShift();
    this.el.removeAttribute("data-insert");
    // ONLY IF GSAP HAS EVER TOUCHED THIS TILE'S TRANSFORM. A tile that was never
    // part of a drag has no GSAP transform to drop, so this call would write the
    // value the element already has.
    //
    // It is not free. GSAP must READ the computed transform matrix before it can
    // write one (_renderZeroDurationTween -> _parseTransform -> _getMatrix ->
    // _getComputedProperty), and that read FLUSHES PENDING STYLE for the whole
    // document. snapToRest runs per tile on every re-measure, so on a populated
    // workspace it fired for hundreds of tiles that had never moved. Production
    // trace 2026-09-15: _renderZeroDurationTween sat behind 184 forced recalcs
    // costing 20,160ms — the largest single entry, ~8,300 elements each.
    //
    // The flag, not the shift value, is the condition: `_shiftX` records the
    // last TARGET, so a tile tweening 5 -> 0 already reads 0 while still sitting
    // part-way, and keying off it would let cancelShift() strand it there. Once
    // the flag is set it stays set, so every tile that has ever shifted keeps
    // the old behaviour exactly.
    this._shiftX = 0;
    if (this._transformTouched) TweenLite.set(this.$el, { x: 0 });
  }

  /**
   * 
   * @param {*} e 
   */
  _onStartShifting(e) {
    this._animIsActive = true;
  }

  /**
   *
   * @param {*} e
   */
  _onStopShifting(e) {
    this._animIsActive = false;
    // Re-measure only at rest. $el.offset() reads the TRANSFORMED position,
    // so re-initing while pushed aside would bake the ±24px offset into the
    // cached bbox — the insertion zones (seek_insertion computes them from
    // bbox) would drift under the cursor and flip sides on their own.
    if (!this._shiftX) this.initBounds();
  }

  /**
   * 
   */
  dispatchNotifications(data) {
    if (data && data.zipid) {
      this.handleDownload(data);
      return;
    }
    if (data && data.hub_id != this.mget(_a.hub_id)) return;
    let reset_icon = (d) => {
      if (d && d.hub_id == this.mget(_a.hub_id)) {
        this.setupInteract();
      };
    }
    let change_icon = (icon, name) => {
      let el = document.createElement(_K.tag.div);
      el.innerHTML = require('../template/icon')(this, name, _a.href);
      el.className = `${this.fig.family}__pulse`;
      el.setAttribute(_a.url, data.url);
      icon.replaceWith(el);
      RADIO_BROADCAST.once('room-shutdown', reset_icon);
    }
    switch (data.type) {
      case 'meeting.start':
        let icon = document.getElementById(this._id + '-icon');
        if (icon) {
          change_icon(icon, "drumee_teamroom_enter");
        }
        break;
      case 'meeting.stop':
        reset_icon(data);
        break;
    }
  }

}


module.exports = __media_grid;    
