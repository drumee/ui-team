// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : 
//   TYPE : 
// ==================================================================== *
const __stream = require('builtins/webrtc/endpoint');
class __endpoint_local extends __stream {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }


  /**
 * 
 */
  onBeforeDestroy() {
    this.__video.el.srcObject = null;
    this.stream = null;
  }

  /**
   * 
   */
  async onDomRefresh() {
    //super.onDomRefresh();
    this.feed(require('./skeleton')(this));
    await this.ensurePart('sound');
    await this.ensurePart('avatar');
    await this.ensurePart(_a.video);
    this.showAvatar();
  }

}

module.exports = __endpoint_local;
