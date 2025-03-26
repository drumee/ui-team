// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/image-tag/index.js
//   TYPE : Component
// ==================================================================== *

require('./skin');

class __drumee_api_image_tag extends LetcBox {

  /**
   * @param {*} opt
  */
  initialize(opt) {
    //require('./skin');
    this.mset({
      flow: _a.y,
      tagName: 'img'
    });
    super.initialize(opt);
    this.declareHandlers();
    this.debug("STARTING", this.fig.family);
  }

  /**
   * 
  */
  onDomRefresh() {
    return this.feed(require("./skeleton").default(this));
  }

  /**
   * @param {*} cmd 
   * @param {*} args
  */
  onUiEvent(cmd, args) {return null;}

}



module.exports = __drumee_api_image_tag;