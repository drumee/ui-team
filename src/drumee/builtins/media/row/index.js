
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
    if (this._animIsActive) {
      return;
    }
    switch (side) {
      case _a.left: case _a.top:
        y = -2;
        this.el.dataset.shift = _a.top;
        break;

      case _a.right: case _a.bottom:
        y = 2;
        this.el.dataset.shift = _a.bottom;
        break;

      default:
        this.el.dataset.shift = _a.none;
        y = 0;
    }
    this._shiftY = y;
    // TweenLite.to(this.$el, .2, {
    //   y,
    //   onStart    : this._onStartShifting,
    //   onComplete : this._onStopShifting
    // });
  }

  // ===========================================================
  // shift
  // ===========================================================
  resetMotion() {
    this.el.dataset.over = _a.off;
    this.el.dataset.hover = _a.off;
    this.el.dataset.shift = _a.off;
    this.shift();
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
