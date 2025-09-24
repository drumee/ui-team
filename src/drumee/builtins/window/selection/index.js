
// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : 
//   TYPE :
// ==================================================================== *
const Rectangle = require('rectangle-node');
const __rectangle = require('reader/rectangle');
// ------------------------------------------
class __desk_selection extends __rectangle {
  constructor(...args) {
    super(...args);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._pointerdown = this._pointerdown.bind(this);
    this._pointermove = this._pointermove.bind(this);
    this._pointerup = this._pointerup.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    RADIO_POINTER.on(_e.pointermove, this._pointermove.bind(this));
    RADIO_POINTER.on(_e.pointerdown, this._pointerdown.bind(this));
    RADIO_POINTER.on(_e.pointerup, this._pointerup.bind(this));

    this.enable();
    window.Selector = this;
    this._x_able = new RegExp(/ui-.+able/);
    this._target = null;
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
    RADIO_POINTER.off(_e.pointermove, this._pointermove.bind(this));
    RADIO_POINTER.off(_e.pointerdown, this._pointerdown.bind(this));
    RADIO_POINTER.off(_e.pointerup, this._pointerup.bind(this));
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
    this._idle = 1;
    let t = null;
    this._state = 1;
    this._bottomLimit = 0;
    if (Wm.el.contains(e.target)) {
      Wm.unselect(2);

    }
    for (let w of Array.from(Wm.windowsLayer.children.toArray())) {
      if (w.acceptMedia && w.el.contains(e.target)) {
        t = w;
        this._state = 2;
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
    this.$rectangle.css({
      left: e.pageX,
      top: e.pageY,
      width: 0,
      height: 0
    });

    this._targetRect = t.contentRectangle();
    this._maxHeight = this._offsetY - this._targetRect.top() + this._window.scrollTop();

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

    this.setState(1);

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
      this.$rectangle.css({
        left: draw_x
      });
      draw_w = Math.abs(draw_w);
    }

    let dy = 0;
    let rtop = this._targetRect.top();
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
        this.$rectangle.css({
          top,
        });
        this._window.scrollTo(0, dy);
        let scrollY = this._window.scrollTop();
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
      // reach the top border
      let scrollY = this._window.scrollTop();
      if (draw_y <= rtop) {
        dy = 2 * (rtop - draw_y);
        draw_h = this.$rectangle.height() + dy;

        if (scrollY > 0) {
          this._yScrolled = this._yScrolled + dy;
          this._window.scrollTo(0, scrollY - dy);
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
      this.$rectangle.css({
        top: draw_y
      });
    }
    this.$rectangle.css({
      width: draw_w,
      height: draw_h
    });
    const r = new Rectangle(draw_x, selection_y, draw_w, selection_h);
    for (let m of Array.from(this.media)) {
      if ((m.bbox == null)) {
        continue;
      }
      const i = r.intersection(m.bbox);
      if (i != null) {
        m.select({ select_mode: _e.drag });
        this._selectd[m.cid] = m;
      } else if (this._selectd[m.cid]) {
        m.unselect();
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
    this.setState(0);
    if (!this._idle) {
      this.status = _a.idle;
      window._pointerDragged = true;
      try {
        Desk.autoMenu();
      } catch (e) { }
    }
    this._idle = 1;
  }
}
__desk_selection.initClass();

module.exports = __desk_selection;
