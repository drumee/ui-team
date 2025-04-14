// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/mfs/pseudo-media
//   TYPE : 
// ==================================================================== *

const Rectangle = require('rectangle-node');

class __media_pseudo extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize();
    this.bbox = new Rectangle(0, 0, 99, 87);
    this.isPseudo = true;
    this.mset({
      kind: 'media_pseudo',
      filetype: _a.pseudo
    });
    this.model.atLeast({
      state: 0,
      aspect: _a.grid,
      bubble: 0,
      filename: LOCALE.PROCESSING
    });

    this.logicalParent = this;
  }

  /**
   * 
   * @returns 
   */
  index() {
    return 0;
  }

  /**
   * 
   * @returns 
   */
  dragEnter(e) {
    this._lastX = e.pageX - 50;
    this._lastY = e.pageY - 50;
  }

  /**
   * 
   * @returns 
   */
  dragOver(e) {
    const x = e.pageX - 50;
    const y = e.pageY - 50;
    if ((Math.abs(this._lastX - x) < 3) && (Math.abs(this._lastY - y) < 3)) {
      return null;
    }
    this.rectangle = new Rectangle(
      x, y, 63, 53
    );

    this.event = e;
    this._lastX = x;
    this._lastY = y;
    return this;
  }

  /**
   * 
   * @param {*} item 
   */
  intersect(item) {
    const mbox = item.bbox;
    if ((mbox == null)) {
      return 0;
    }
    let r = this.rectangle;
    const i = mbox.intersection(r);
    if ((i == null)) {
      return 0;
    }
    return (i.area() / r.area());
  }


  /**
   * 
   */
  overlaps() {
    this.warn("SHOUL NOT BE CALLED");
  }

  /**
  * 
  */
  wait() {
    /** DO NOT DELETE */
  }

}
__media_pseudo.initClass();


module.exports = __media_pseudo;    
