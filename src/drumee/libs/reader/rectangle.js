
const Rectangle = require('rectangle-node');
class rectangle extends LetcBox {


  constructor(...args) {
    super(...args);
    this.initBounds = this.initBounds.bind(this);
    this.intersect = this.intersect.bind(this);
  }

  /**
   * 
   * @returns 
   */
  initBounds() {
    const f = () => {
      return this.bbox = new Rectangle(
        this.$el.offset().left,
        this.$el.offset().top,
        this.$el.width(),
        this.$el.height()
      );
    };
    return this.waitElement(this.el, f);
  }

  /**
   * 
   * @param {*} item 
   * @returns 
   */
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

module.exports = rectangle;
