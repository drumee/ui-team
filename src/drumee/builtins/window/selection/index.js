

const Rectangle = require("@drumee/ui-core/letc/widgets/rectangle");

// ------------------------------------------
class desk_selection extends Rectangle {
  constructor(...args) {
    super(...args);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    // NB: the pointer handlers are bound in initialize(), NOT here —
    // Backbone runs initialize() inside super() BEFORE this constructor
    // body, so bindings made here would come too late for the .on()
    // registrations (and a second bind would break off() matching again).
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    // Bind ONCE onto the instance, then register the same refs — inline
    // `.bind()` calls in on()/off() create wrappers Backbone's off() can
    // never match, permanently leaking 3 global pointer listeners on every
    // Wm.reload() cycle. (Binding must happen HERE: initialize runs inside
    // super() before the constructor body.)
    this._pointermove = this._pointermove.bind(this);
    this._pointerdown = this._pointerdown.bind(this);
    this._pointerup = this._pointerup.bind(this);
    RADIO_POINTER.on(_e.pointermove, this._pointermove);
    RADIO_POINTER.on(_e.pointerdown, this._pointerdown);
    RADIO_POINTER.on(_e.pointerup, this._pointerup);

    this.enable();
    window.Selector = this;
    this._x_able = new RegExp(/ui-.+able/);
    this._target = null;
    this._inband = {};
    this._drawn = 0;
    this._idle = 1;
    require('./skin');
    if (!("path" in Event.prototype)) {
      Object.defineProperty(Event.prototype, "path", {
        get: function () {
          var path = [];
          var currentElem = this.target;
          while (currentElem) {
            path.push(currentElem);
            currentElem = currentElem.parentElement;
          }
          if (path.indexOf(window) === -1 && path.indexOf(document) === -1)
            path.push(document);
          if (path.indexOf(window) === -1)
            path.push(window);
          return path;
        }
      });
    }
  }

  /**
   * 
   */
  onDestroy() {
    RADIO_POINTER.off(_e.pointermove, this._pointermove);
    RADIO_POINTER.off(_e.pointerdown, this._pointerdown);
    RADIO_POINTER.off(_e.pointerup, this._pointerup);
  }

  /**
   * 
   * @returns 
   */
  enable() {
    return this._enabled = true;
  }

  /**
   * 
   * @returns 
   */
  disable() {
    return this._enabled = false;
  }

  /**
   * 
   */
  onRender() {
    super.onRender();
    this.$el.prepend(`<div id=\"${this._id}-bbox\" class=\"${this.fig.family}__bbox\">`);
    // this.$el.append(`<div id=\"${this._id}-debug\" class=\"${this.fig.family}__bbox\">`);
    this._selectedSections = [];
  }

  /**
   * 
   * @param {*} s 
   * @returns 
   */
  setState(s) {
    this.$rectangle.attr(_a.data.state, s);
    if (s > 0) {
      return this.$el.attr(_a.data.state, this._state);
    } else {
      return this.$el.attr(_a.data.state, s);
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _accept(e) {
    const r = false;
    const re = /ui-.+able/;
    if (!e.path) return;
    for (let p of Array.from(e.path)) { //.forEach (p)->
      try {
        if (p.dataset.role === _a.container) {
          return true;
        }
      } catch (error) { }
      try {
        if (p.className != null ? p.className.match(re) : undefined) {
          return false;
        }
      } catch (error1) { }
      try {
        if (p.dataset.role === _a.root) {
          return false;
        }
      } catch (error2) { }
    }
    return true;
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.initBounds();
    this.waitElement(this.el, () => {
      this.$rectangle = this.$el.find(`#${this._id}-bbox`);
      if (Visitor.parseModuleArgs().devel) {
        this.$debug = this.$el.find(`#${this._id}-debug`);
        this.$debug.css({
          border: '2px solid red'
        })
      }
      this.setState(0);
    });
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _pointerdown(e) {
    if (!this._accept(e) || !this.$rectangle) {
      this._target = null;
      return;
    }
    this._offsetX = e.pageX;
    this._offsetY = e.pageY;
    this._selectd = {};
    // Which tiles the band currently holds, so _pointermove only has to touch
    // the ones crossing its edge.
    this._inband = {};
    this._drawn = 0;
    this._idle = 1;
    let t = null;
    this._state = 1;
    this._bottomLimit = 0;
    RADIO_POINTER.trigger("desk:selection", _a.down)
    if (Wm.el.contains(e.target)) {
      Wm.unselect(2);
    }
    // EVERY layer is walked, not windowsLayer alone. Wm.getWindowsPool()
    // answers headlessLayer as soon as a workspace pane is open, so the docked
    // pane — the surface that draws `.window__icons-list`, and the one a user
    // is looking at most of the time — lives there, and so does every window
    // opened on top of it. Scanning windowsLayer left `t` null on all of them,
    // the fallback below handed the marquee to Wm, and it was then measured
    // against the desk home grid hidden behind the pane: the rectangle drew
    // and not one file in the folder was ever selected. Same layer list, and
    // the same reason for it, as manager.js clampWindows().
    for (let layer of [Wm.windowsLayer, Wm.headlessLayer, Wm.callLayer]) {
      if (!layer || (layer.isDestroyed && layer.isDestroyed())) continue;
      if (!layer.children) continue;
      for (let w of Array.from(layer.children.toArray())) {
        if (w.acceptMedia && w.el.contains(e.target)) {
          t = w;
          this._state = 2;
        }
      }
    }
    if ((t == null)) {
      t = Wm;
    }
    if ((t.iconsList == null)) {
      this.media = [];
      return;
    }
    this._window = t;
    this.media = t.iconsList.children.toArray();
    // MEASURE FIRST, THEN WRITE. These two lines used to sit AFTER the
    // `$rectangle.css(...)` below, which is the write/read order that forces a
    // synchronous style+layout flush: the css() call dirties style, then
    // contentRectangle() -> `$el.offset()` has to flush the whole document
    // before it can answer. On this DOM that flush restyles ~8,000 elements.
    // Production trace 2026-09-15 attributed 106 forced recalcs / 8,488ms to
    // this read path, the largest remaining entry.
    //
    // Nothing here depends on the rectangle's new position — it is being reset
    // to a zero-size box at the pointer — so the order is free to swap.
    this._targetRect = t.contentRectangle();
    this._maxHeight = this._offsetY - this._targetRect.top() + this._window.scrollTop();

    this.$rectangle.css({
      left: e.pageX,
      top: e.pageY,
      width: 0,
      height: 0
    });

    this._xScrolled = 0;
    this._yScrolled = 0;

    try {
      this._selectd = t.getLocalSelection();
      return this._target = t;
    } catch (error) { }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _pointermove(e) {
    let draw_x, draw_y;
    if (!e.buttons || !this._target) {
      return false;
    }
    let draw_w = e.pageX - this._offsetX;
    let draw_h = e.pageY - this._offsetY;
    let selection_h = draw_h;
    let selection_y = e.pageY;

    if ((Math.abs(draw_w) < 5) && (Math.abs(draw_h) < 5)) {
      return;
    }

    this._idle = 0;

    // Was re-asserted on every move. Two jQuery attr writes per pointer sample
    // that only ever change on the first one.
    if (this._drawn !== 1) {
      this.setState(1);
      this._drawn = 1;
    }

    let rtop = this._targetRect.top();

    // EVERY MEASUREMENT THIS HANDLER TAKES HAPPENS HERE, BEFORE THE FIRST
    // STYLE WRITE, and every style write is batched into the single css()
    // call at the bottom.
    //
    // It used to interleave them: write `left`, read scrollTop, read
    // $rectangle.height(), write `top`, write `width`/`height`. Each read
    // landing after a write forces the browser to flush style and layout
    // synchronously, and the production trace of 2026-09-10 caught what that
    // costs on a real desk — `scrollTop < scrollTop < _pointerdown` at 6.2s
    // over 23 calls, `offset < contentRectangle < _pointerdown` at 5.4s over
    // 21, i.e. a quarter of a second of blocked main thread per call on a DOM
    // that had grown to 428,000 nodes. That is the marquee lagging behind the
    // cursor.
    //
    // Both reads stay conditional: `$rectangle.height()` goes through jQuery's
    // curCSS/getComputedStyle, which the same trace put at 13.1s, so it must
    // not run on moves that never consult it. Both conditions are known from
    // the pointer position alone, before anything is written.
    const draggingUp = draw_h <= 0;
    let scrollY = draggingUp ? this._window.scrollTop() : 0;
    const prevH = draggingUp && e.pageY <= rtop ? this.$rectangle.height() : 0;

    // Deferred to the batched write at the bottom. `left`/`top` used to be
    // written from inside the branches; the values they carried when a branch
    // did NOT write them are the ones _pointerdown already put on the element,
    // which is what these defaults reproduce.
    let css_left = this._offsetX;
    let css_top = this._offsetY;

    if (draw_w > 0) {
      draw_x = this._offsetX;
      const maxX = this._targetRect.right() - draw_x;
      if (draw_w > maxX) {
        draw_w = maxX;
      }
    } else {
      draw_x = this._offsetX + draw_w;
      if (draw_x < this._targetRect.left()) {
        draw_x = this._targetRect.left();
        draw_w = this._offsetX - draw_x;
      }
      css_left = draw_x;
      draw_w = Math.abs(draw_w);
    }

    let dy = 0;
    // selecting from the top border
    if (draw_h > 0) {
      draw_y = this._offsetY;
      selection_y = draw_y;
      const maxY = this._targetRect.bottom() - draw_y;
      // reach bottom border 
      if (draw_h >= maxY) {
        if (e.pageY < window.innerHeight - 40) {
          dy = 2 * (draw_h - maxY);
        } else {
          dy = this._window.scrollHeight();
        }
        let top = draw_y - dy;

        if (top > rtop) {
          draw_h = maxY + dy;
        } else {
          top = rtop;
          draw_h = this._targetRect.h;
        }
        css_top = top;
        // Only when it actually moves. The marquee sat on the bottom edge for
        // the rest of the gesture and re-issued the same scrollTo on every
        // pointer sample; each one fires a `scroll` on the list, and every
        // tile answers it by re-measuring itself (see media/interact.js).
        if (dy !== scrollY) this._window.scrollTo(0, dy);
        scrollY = this._window.scrollTop();
        if (dy <= scrollY) {
          selection_y = this._offsetY - dy;
          selection_h = selection_h + dy;
        } else {
          selection_y = this._offsetY - scrollY;
          selection_h = this._targetRect.h + scrollY;
        }
      }
    } else { // selecting from the bottom border
      draw_y = e.pageY; //this._offsetY + draw_h;
      selection_y = draw_y;
      draw_h = Math.abs(draw_h);
      selection_h = draw_h;
      // reach the top border  (scrollY / prevH were read at the top of the
      // handler, before any write — see the note there)
      if (draw_y <= rtop) {
        dy = 2 * (rtop - draw_y);
        draw_h = prevH + dy;

        if (scrollY > 0) {
          this._yScrolled = this._yScrolled + dy;
          if (scrollY - dy !== scrollY) this._window.scrollTo(0, scrollY - dy);
          selection_h = draw_h;
        } else {
          if (draw_h > this._maxHeight) {
            draw_h = this._maxHeight;
          }
          selection_h = draw_h;
        }
        draw_y = rtop;
        selection_y = rtop;
        if (draw_h > this._targetRect.h) {
          draw_h = this._targetRect.h;
        }
      } else if (this._yScrolled) {
        draw_h = draw_h + this._yScrolled;
        if (draw_h + draw_y > this._targetRect.bottom()) {
          draw_h = this._targetRect.bottom() - draw_y;
        }
        selection_h = draw_h;
      }
      css_top = draw_y;
    }

    // The handler's ONE style write.
    this.$rectangle.css({
      left: css_left,
      top: css_top,
      width: draw_w,
      height: draw_h
    });

    // Only the tiles whose membership in the band CHANGED are touched.
    //
    // This used to call select() on every covered tile on every move — four
    // DOM attribute writes and two Backbone model.set()s each, re-asserting a
    // state the tile was already in, and dirtying that many subtrees for style
    // recalc every frame. Sweeping 300 tiles re-applied ~1,800 attribute
    // writes per pointer sample to say nothing had changed.
    //
    // Same end state: select() on an already-selected tile is a no-op, and
    // unselect() returns early when the tile is already clear, so the only
    // calls dropped are the ones that did nothing.
    //
    // `_selectd` is still maintained — it carries the pre-existing selection
    // that _pointerdown seeded from getLocalSelection(), which is why
    // membership is tracked separately in `_inband` rather than read back off
    // it.
    const rx = draw_x;
    const ry = selection_y;
    const rr = draw_x + draw_w;
    const rb = selection_y + selection_h;
    const media = this.media;
    for (let k = 0; k < media.length; k++) {
      const m = media[k];
      const b = m.bbox;
      if (b == null) {
        continue;
      }
      // Same test as Rectangle.intersection() returning non-null, without
      // allocating a Rectangle per tile per frame. It treats a shared edge as
      // a hit, exactly as intersection() does (it rejects on dx/dy < 0 only).
      const hit = rr >= b.x && b.x + b.w >= rx && rb >= b.y && b.y + b.h >= ry;
      if (hit === !!this._inband[m.cid]) {
        continue;
      }
      if (hit) {
        m.select({ select_mode: _e.drag });
        this._selectd[m.cid] = m;
        this._inband[m.cid] = 1;
      } else {
        m.unselect();
        delete this._inband[m.cid];
      }
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _pointerup(e) {
    this.media = [];
    this._target = null;
    this._inband = {};
    this._drawn = 0;
    this.setState(0);
    if (!this._idle) {
      this.status = _a.idle;
      window.pointerDragged = true;
      RADIO_POINTER.trigger("desk:selection", _a.up)
    }
    this._idle = 1;
  }
}
desk_selection.initClass();

module.exports = desk_selection;
