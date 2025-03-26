/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class __custom_logo extends LetcBox {

  constructor(...args) {
    super(...args);
  }


  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    //this.debug("onPartReady:28", child, pn);
    switch (pn) {
      case "logo-block":
        let mascott = require("assets/logo.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;
        return;
      default:
      /** Delegate to parent if any **/
      //if(super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }



}

module.exports = __custom_logo