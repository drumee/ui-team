
const MOVING_CLASS    = 'moving';
require('./skin');
const {
  TweenLite
} = require("gsap/all");

const media_core = require('../interact');

//-------------------------------------
// __media_simple
//-------------------------------------
class __media_simple extends media_core {
  constructor(...args) {
    super(...args);
    this.helper = this.helper.bind(this);
    this.enablePreview = this.enablePreview.bind(this);
    this._updateNotification = this._updateNotification.bind(this);
    this.shift = this.shift.bind(this);
    this.resetMotion = this.resetMotion.bind(this);
    this._onStartShifting = this._onStartShifting.bind(this);
    this._onStopShifting = this._onStopShifting.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "media_simple";
    this.prototype.isSimple    = 1; 
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this.mset({ 
      flow : _a.x});
    //@debug "media simple index",opt,@
    this.innerContent = require('./template');
    this.cursorPosition = { left: 30, top: 30 };
    return this.size = {
      width:90.5, 
      height:75.5
    };
  }
    
// ===========================================================
//
// ===========================================================
  helper() {
    return require('./template/helper')(this);
  }

// ===========================================================
//
// ===========================================================
  enablePreview(toggle) {
    switch (this.model.get(_a.filetype)) {
      case _a.image: 
      case _a.video: 
      case _a.vector:
        this.iconType = _a.vignette;
        var f = ()=> {
          this.$preview = $(`#${this._id}-preview`);
          return this.$preview.css({ 
            'background-image'   : `url(${this.url()})`,
            'background-size'    : "cover",
            'background-repeat'  : "no-repeat",
            'background-position': _K.position.center
          });
        };
        this.waitElement(`${this._id}-preview`, f);
        break;

      default:
        this.iconType = _a.vector;
    }
    return this.content.el.dataset.icontype = this.iconType; 
  }


// # ==================
// #
// # ==================
//   loadVector: () =>
//     t = "#{@_id}-icon"
//     if @_vector?
//       this.waitElement "#{@_id}-icon", ()=>
//         @renderVector(@_vector, yes, t)
//       return 

//     f =(data) =>
//       @_vector = data
//       @renderVector(data, yes, t)
//     Utils.fetch @url(_a.orig), f

// ===========================================================
//
// ===========================================================
  _updateNotification(c) {}
    // Do not remove


// ===========================================================
// shift
// ===========================================================
  shift(side){
    let y;
    if (this._animIsActive) {
      return;
    }
    switch (side) {
      case _a.left:
        y = -15;
        break;

      case _a.right:
        y = 15;
        break;
      
      default: 
        y = 0; 
    }
    this._shiftY = y;
    return TweenLite.to(this.$el, .2, {
      y,
      onStart    : this._onStartShifting,
      onComplete : this._onStopShifting
    });
  }

// ===========================================================
// shift
// ===========================================================
  resetMotion(){
    this.el.dataset.over = _a.off;
    this.el.dataset.hover = _a.off;
    return this.shift();
  }

// ===========================================================
//
// ===========================================================
  _onStartShifting(e){
    return this._animIsActive = true;
  }

// ===========================================================
//
// ===========================================================
  _onStopShifting(e){
    return this._animIsActive = false;
  }
}
__media_simple.initClass();





module.exports = __media_simple;    
