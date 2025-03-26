const ANIM          = 'bhv_anim';
const _parent_ready = "parent:ready";
const _rendered     = "rendered";
const Rectangle = require('rectangle-node');

//####################################
// The magic box
// ===============
//####################################
class __box extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.initBounds = this.initBounds.bind(this);
    this.intersect = this.intersect.bind(this);
  }

  initBounds() {
    const f =()=> {
      return this.bbox = new Rectangle(
        this.$el.offset().left,
        this.$el.offset().top,
        this.$el.width(), //r.width, 
        this.$el.height() // r.height
      );
    };
    return this.waitElement(this.el, f);
  }

// ===========================================================
//
// ===========================================================
  intersect(item) {
    const mbox = item.bbox;
    if ((mbox == null)) {
      return 0;
    }
    const i = mbox.intersection(this.bbox);
    if ((i == null)) {
      return 0;
    }
    return (i.area() / this.bbox.area());
  }
}

module.exports = __box;
