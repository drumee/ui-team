// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   
//   
// ==================================================================== *
class __endpoint extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    //require('./skin');
    super.initialize(opt);
    this._queue = [];
    this.logicalParent = opt.logicalParent;
    this.declareHandlers();
    //this.debug("XAAA:AAA:17", this, opt);
  }


  /**
  * 
  * @param {*} o 
 */
  showAvatar(uid) {
    if (this.__uname) {
      this.__uname.el.dataset.state = 1;
      this.__uname.set({
        content: this.mget('uname') || this.mget(_a.firstname)
      });
    }

    if (this.__video) {
      this.__video.el.dataset.status = _a.idle;
      this.__video.el.dataset.state = 0;
    }

    if (this.__ctrlStatus) {
      this.__ctrlStatus.el.show();
    }
  }


  /**
* 
* @param {*} avatarStatus 
* @param {*} videoStatus 
*/
  toggleAvatarVideo(avatarStatus, videoStatus) {
    this.ensurePart('avatar').then((s)=>{
      s.el.style.visibility = avatarStatus == 1 ? "visible" : "hidden";
    });
    this.ensurePart(_a.video).then((s)=>{
      s.el.style.display = videoStatus == 1 ? "block" : "none";
    });
  }

  /**
   * 
   */
  attachSound(stream) {
    this.ensurePart('sound').then((s) => {
      s.plug(stream);
    })
  }



}


module.exports = __endpoint;
