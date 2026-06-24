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
    // For a VIDEO call the local camera attaches concurrently. showAvatar()
    // above idles the local tile (sets __video data-state=0 -> CSS display:none),
    // which RACES the camera attach and leaves the caller's OWN self-view blank
    // until they toggle video off/on. When the call started with video, reveal
    // the local tile here so the camera shows as soon as it attaches.
    if (this.room && this.room.isVideo) {
      if (this.__video) this.__video.el.dataset.state = 1;
      this.toggleAvatarVideo(0, 1);
    }
  }

  onUiEvent(cmd) {
    const service = cmd.get && cmd.get(_a.service);
    switch (service) {
      case "pin-tile":
        // Local user pin — uid is the visitor, no jitsi participant_id
        // when we haven't joined yet, fall back to room.myUserId.
        this.triggerHandlers({
          service: "pin-tile",
          participant_id: this.room && this.room.myUserId && this.room.myUserId(),
          uid: Visitor.id,
          isLocal: 1,
        });
        return;
      case "togglefullscreen":
        this.triggerHandlers({ service, state: cmd.mget(_a.state) });
        return;
    }
  }

}

module.exports = __endpoint_local;
