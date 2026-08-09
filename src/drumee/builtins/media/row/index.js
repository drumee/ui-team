
const { TweenLite } = require("@drumee/ui-core/vendor");

const MEDIA_TOGGLE = "madia-toggle";
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
    this.prototype.behaviorSet = {
      bhv_radio: 1
    };
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
      radio: MEDIA_TOGGLE
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
    this._shiftY = 0;
    TweenLite.set(this.$el, { y: 0 });
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
