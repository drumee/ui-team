
const { TweenLite } = require("@drumee/ui-core/vendor");
const { toggleState } = require("@drumee/ui-essentials");

// The row last right-clicked — the "current row" highlight (data-current).
// One for the whole app, as the old radio channel was.
let currentRow = null;
class __media_row extends DrumeeMediaInteract {
  constructor(...args) {
    super(...args);
    this.enablePreview = this.enablePreview.bind(this);
    this.initBounds = this.initBounds.bind(this);
    this.shift = this.shift.bind(this);
    this.resetMotion = this.resetMotion.bind(this);
    this._onStartShifting = this._onStartShifting.bind(this);
    this._onStopShifting = this._onStopShifting.bind(this);
  }

  static initClass() {
    this.prototype.isRow = 1;
    // NO bhv_radio. ui-core's radio behaviour (letc/addons/backbone/view/
    // behavior/radio.js) answers a right-click — letc.js runs
    // triggerMethod("toggle") before building the contextmenu — by
    // broadcasting on the row channel, and every other row's _on_message then
    // calls setState(0). setState writes `_a.state`, which IS the selection
    // (getLocalSelection / Wm.getGlobalSelection read it), but not
    // data-selected or the checkbox: the ticked rows stayed ticked on screen
    // while the model had dropped them, so every contextmenu action
    // (removeMediaSelection, move, link to task…) ran on the right-clicked
    // row alone. Grid tiles never had the behaviour, which is why only the
    // list view broke. The highlight it gave is kept below (onToggle), as a
    // DOM flag that never touches `state`.
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.mset({
      flow: _a.x,
    });
    this.innerContent = require('./template');
    this.cursorPosition = { left: 35, top: 35 };
    this.size = {
      width: 500,
      height: 32
    }
    this.initContainer()
  }

  /**
   * The paint the radio behaviour used to do on render: a row born selected
   * (a pasted item arrives with state 1) shows it.
   */
  onRender() {
    if (super.onRender) super.onRender();
    this.setState(toggleState(this.mget(_a.state)));
  }

  /**
   * Right-click, ahead of the contextmenu (ui-core letc.js
   * triggerMethod("toggle")).
   *
   * On a SELECTED row the selection is left alone, so the menu acts on all of
   * it. On any other row the menu must act on that row only — removeMediaSelection
   * would otherwise add it to whatever is still ticked — so the selection is
   * cleared first, through unselect(), which repaints the checkboxes too.
   * Wm.unselect covers the floating windows; the row's own window is cleared
   * as well because the docked workspace pane lives in headlessLayer, which
   * Wm.unselect does not walk.
   */
  onToggle() {
    if (!toggleState(this.mget(_a.state))) {
      if (window.Wm && _.isFunction(Wm.unselect)) Wm.unselect(2);
      const win = this.getLogicalParent && this.getLogicalParent();
      if (win && win !== window.Wm && _.isFunction(win.unselect)) win.unselect(0);
    }
    this._markCurrent();
  }

  /**
   * The "current row" highlight, on this row only.
   */
  _markCurrent() {
    if (currentRow && currentRow !== this && !currentRow.isDestroyed() && currentRow.el) {
      currentRow.el.dataset.current = "0";
    }
    currentRow = this;
    this.el.dataset.current = "1";
  }

  onDestroy() {
    if (super.onDestroy) super.onDestroy();
    if (currentRow === this) currentRow = null;
  }

  /**
   * 
   */
  initContainer() {
    let hub = 0;
    let filetype = this.mget(_a.filetype);
    let hubs = this.mget("hubs");
    let areas = this.mget("areas");
    this.containsHub = filetype == _a.hub;
    if (!_.isEmpty(hubs)) {
      hub = 1;
      this.containsHub = true;
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
  }

  /**
 * 
 */
  rowsCount(value) {
    return 1;
  }

  /**
   * Inline rename (pencil icon) in list mode.
   *
   * The shared editor (interact.js) is appended as the row's LAST child and
   * the row skin parks it with a fixed `left: 119px; top: 12%`. The Files tab
   * redefines the row's columns (44px checkbox + 44px icon, then a flexible
   * name column), so the box landed away from the name and at a width
   * unrelated to it. Lay it over the real filename cell instead, centred in
   * the row — right after the file icon, whatever the column template is.
   * (Focus + name preselection is interact.js _readyRenameField.)
   */
  async _createInput(value, opt) {
    await super._createInput(value, opt);
    const entry = this.children.last();
    if (!entry || entry.isDestroyed() || !entry.el) return;
    this._alignRenameInput(entry);
  }

  _alignRenameInput(entry) {
    const name = document.getElementById(`${this._id}-filename`);
    const cell =
      (name && name.closest(`.${this.fig.family}__field-filename`)) || name;
    const host = entry.el.offsetParent;
    if (!cell || !host) return;
    const h = host.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    if (!c.width) return;
    const st = entry.el.style;
    st.left = `${Math.round(c.left - h.left)}px`;
    st.width = `${Math.round(c.width)}px`;
    st.top = `${Math.round(c.top - h.top + c.height / 2)}px`;
    st.height = "auto";
    st.transform = "translateY(-50%)";
  }

  /**
   * 
   * @param {*} toggle 
   */
  enablePreview(toggle) {
    if (Visitor.inDmz) {
      this.$el.addClass(_a.dmz)
    }
    const f = (opt) => {
      const { url } = opt
      this.$preview = $(`#${this._id}-preview`);
      this.$preview.css({
        'background-image': `url(${url})`,
        'background-size': "cover",
        'background-repeat': "no-repeat",
        'background-position': _K.position.center
      });
    };
    switch (this.model.get(_a.filetype)) {
      case _a.image:
      case _a.video:
        this.waitElement(`${this._id}-preview`, () => {
          f(this.actualNode(_a.vignette))
        });
        break;
      case _a.vector:
        this.waitElement(`${this._id}-preview`, () => {
          f(this.actualNode(_a.orig))
        });
        break;


      default:
        this.iconType = _a.vector;
    }
    this.content.el.dataset.icontype = this.iconType;
  }




  // ===========================================================
  // shift
  // ===========================================================
  shift(side) {
    let y;
    switch (side) {
      // Enough of an opening to read as a gap without overrunning the rows
      // behind — only these two move. Was ±2px, which barely nudged them and
      // left nowhere to draw the dashed rule (media/skin/index.scss).
      case _a.left: case _a.top:
        y = -5;
        this.el.dataset.shift = _a.top;
        break;

      case _a.right: case _a.bottom:
        y = 5;
        this.el.dataset.shift = _a.bottom;
        break;

      default:
        this.el.dataset.shift = _a.none;
        y = 0;
    }
    this._shiftY = y;
    // The tween was commented out, so data-shift flipped but nothing ever
    // moved — there was no opening for an insertion seat to sit in. overwrite
    // kills a conflicting slide instead of letting both run (GSAP default),
    // which is what strands rows half-shifted.
    const instant =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Latched for snapToRest: from here on this element carries a GSAP
    // transform, even once it settles back to 0.
    this._transformTouched = true;
    TweenLite.to(this.$el, instant ? 0 : .2, {
      y,
      overwrite: "auto",
      onStart: this._onStartShifting,
      onComplete: this._onStopShifting
    });
  }

  // ===========================================================
  // shift
  // ===========================================================
  resetMotion() {
    this.el.dataset.over = _a.off;
    this.el.dataset.hover = _a.off;
    this.el.dataset.shift = _a.off;
    // A shift armed just before the drop must not land after this cleanup.
    this.cancelShift();
    this.shift();
  }

  /**
   * Drop any shift instantly — see the grid counterpart. The re-measure after
   * a re-render (window/interact syncContent) needs resting positions: mid-
   * tween $el.offset() still carries part of the slide, and caching that puts
   * the drag zones beside the rows they belong to.
   */
  snapToRest() {
    this.cancelShift();
    this.el.dataset.shift = _a.none;
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
    // The flag, not the shift value, is the condition: `_shiftY` records the
    // last TARGET, so a tile tweening 5 -> 0 already reads 0 while still sitting
    // part-way, and keying off it would let cancelShift() strand it there. Once
    // the flag is set it stays set, so every tile that has ever shifted keeps
    // the old behaviour exactly.
    this._shiftY = 0;
    if (this._transformTouched) TweenLite.set(this.$el, { y: 0 });
  }

  // ===========================================================
  //
  // ===========================================================
  _onStartShifting(e) {
    this._animIsActive = true;
  }

  // ===========================================================
  //
  // ===========================================================
  _onStopShifting(e) {
    this._animIsActive = false;
  }
}
__media_row.initClass();





module.exports = __media_row;
