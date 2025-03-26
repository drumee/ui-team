const _defaultAnim = {
   init : {
     rotationX:-180
   },
   enter : {
     rotationX:180
   },
   leave : {
     rotationX:0
   },
   start : {
     rotationX:-180
   }
 };
//-------------------------------------
//
// Skelton.Card
//-------------------------------------
class __card extends LetcBox {
  constructor(...args) {
    super(...args);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
  }

  static initClass() {
  //   templateName: _T.wrapper.raw
  //   className : "#{_a.box} card-reader"
  // 
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = `${_a.box} card-reader`;
  }
// ========================
//
// ========================

// ===========================================================
// _childCreated
//
// @param [Object] child
//
// ===========================================================
  _childCreated(child) {
    //_dbg "childCreated", child,@
    this._node = child.$el;
    return child.children.each(c=> {
      if (c.model.get(_a.type) === _a.back) {
        return this._back = c;
      } else {
        return this._front = c;
      }
    });
  }
// ========================
//
// ========================

// ===========================================================
// _parseAnimOpt
//
// ===========================================================
  _parseAnimOpt() {
    //_dbg "_animXXX",@model
    const width  = parseInt(this.$el.css(_a.width));
    const height = parseInt(this.$el.css(_a.height));
    const ease = eval(this.model.get(_a.ease)) || Back.easeOut;
    if (_.isFinite(this.model.get(_a.duration))) {
      this._duration = this.model.get(_a.duration);
    } else {
      this._duration = 1.2;
    }
    this._overflow = _a.visible;
    switch (this.model.get(_a.mode)) {
      case _a.horizontal:
        this._overflow = _a.visible;
        this._anim = _.clone(_defaultAnim);
        break;
      case _a.vertical:
        this._overflow = _a.visible;
        this._anim = {
          init : {
            rotationY:-180
          },
          enter : {
            rotationY:180
          },
          leave : {
            rotationY:0
          },
          start : {
            rotationY:-180
          }
        };
        break;
      case _a.right:
        this._overflow = _a.hidden;
        this._back.$el.css({
          left: Utils.px(width, -1)});
        this._anim = {
          init : {
            x:0
          },
          start : {
            x:width
          },
          enter : {
            x:width
          },
          leave : {
            x:0
          }
        };
        break;
      case _a.left:
        _dbg("left ", this._back);
        this._overflow = _a.hidden;
        this._back.$el.css({
          left: Utils.px(width)});
        this._anim = {
          init: {
            x :0
          },
          start : {
            x:-width
          },
          enter : {
            x:-width
          },
          leave : {
            x:0
          }
        };
        break;
      case _a.top:
        this._overflow = _a.hidden;
        this._back.$el.css({
          top: Utils.px(height)});
        this._anim = {
          init : {
            y:0
          },
          start : {
            y:-height
          },
          enter : {
            y:-height
          },
          leave : {
            y:0
          }
        };
        break;
      case _a.bottom:
        this._overflow = _a.hidden;
        this._back.$el.css({
          top: Utils.px(height, -1)});
        this._anim = {
          init : {
            y:0
          },
          start : {
            y:height
          },
          enter : {
            y:height
          },
          leave : {
            y:0
          }
        };
        break;
      default:
        this._overflow = _a.visible;
        this._anim = _.clone(_defaultAnim);
    }
    this._anim.enter.ease = ease;
    this._anim.leave.ease = ease;
    this.$el.css({
      overflow : this._overflow});
    return _.extend(this._anim.start, {repeat:1, yoyo:true});
  }
    //_dbg "_animYYYY ", @_anim, @_overflow, @_node
// ============================
//
// ============================

// ===========================================================
// _mouseenter
//
// ===========================================================
  _mouseenter(){
    return TweenMax.to(this._node, this._duration, this._anim.enter);
  }
// ============================
//
// ============================

// ===========================================================
// _mouseleave
//
// ===========================================================
  _mouseleave(){
    return TweenMax.to(this._node, this._duration, this._anim.leave);
  }
// ========================
//
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    let e, width;
    try {
      ({
        width
      } = this._front.model.get(_a.styleOpt));
    } catch (error) {
      e = error;
      width = _K.size.full;
    }
    TweenMax.set([this._front.$el], {width});
    try {
      ({
        width
      } = this._back.model.get(_a.styleOpt));
    } catch (error1) {
      e = error1;
      width = _K.size.full;
    }
    TweenMax.set([this._back.$el], {width});
    this._parseAnimOpt();
    _dbg(">>ZEZ cxc cc>> >>hhSLIDE >>QQ _ready", this._node, this, this._anim);
    TweenMax.set(this.$el, {perspective:800});
    TweenMax.set(this._node, {transformStyle:"preserve-3d"});
    TweenMax.set(this._back.$el, this._anim.init);
    TweenMax.set([this._back.$el, this._front.$el], {backfaceVisibility:_a.hidden});
    $(this.$el).hover(this._mouseenter, this._mouseleave);
    const attr = this.model.get(_a.userAttributes);
    if (this.model.get(_a.start)) { //attr?['data-auto-play']
      return TweenMax.staggerTo(this._node, 1, this._anim.start, 0.1);
    }
  }
}
__card.initClass();
module.exports = __card;
