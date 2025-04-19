/// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/widget/player/video
//   TYPE : 
// ==================================================================== *
const __core = require('.');
class __player_video extends __core {

  /** 
   * 
  */
  initialize(opt) {
    super.initialize(opt);
    this.playerConfigs = {
      xhrSetup: this.xhrSetup
    }
    this.cdnHost = Platform.get('cdnHost') || (this.media ? this.media.mget(_a.vhost) : null);
  }


  /**
   * 
   */
  xhrSetup(xhr, url) {
    xhr.withCredentials = true;
    xhr.setRequestHeader("x-param-auth", localStorage.getItem(_a.session));
    //console.log("AAA:27", xhr);
  }

}

module.exports = __player_video;
