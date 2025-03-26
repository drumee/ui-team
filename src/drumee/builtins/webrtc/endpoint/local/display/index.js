//const __webinar_socket = require('./socket');
const __stream = require('builtins/webrtc/endpoint/stream');
class __webrtc_local_display extends __stream {
  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    this.service_class = _a.screen;
    super.initialize(opt);
    this.model.atLeast({
      mute: true,
      widgetId: this._id,
    });
    this._configs = {};
    this.origin_name = opt.firstname || opt.lastname || opt.email;
    //this.debug(`AAA:17`, this, opt);
    this.isShower = opt.isShower;
    this.model.set({
      video: 0,
      audio: 0,
    })
    this.screenStream = opt.uiHandler[0].screenStream;
    this.declareHandlers();
    this.startEvent = 'meeting.screenshare';
    this.skeleton = require('./skeleton');
  }

  /**
 * 
 */
  getMediaConstraints() {
    return {
      audio: false,
      cursor: true,
      video: {
        width: {
          min: 760,
          ideal: 1280,
          max: 1472,
        },
        height: {
          min: 386,
          ideal: 760,
          max: 960
        }
      }
    }
  }

  /**
 * 
 */
  onBeforeDestroy() {
    if (this.screenStream) {
      this.screenStream.getTracks().map((t) => {
        t.stop();
      })
    }
    // if (this.webRtcPeer) {
    //   for (var s of this.webRtcPeer.peerConnection.getSenders()) {
    //     if (s.track) s.track.stop();
    //   }
    //   this.webRtcPeer.dispose();
    // }
  }

  /**
    * 
    */
  async onDomRefresh() {
    await this.createUpstream();
    this.feed(require('./skeleton')(this));
  }

  /**
 * 
 */
  handleError() {
    this._connectionError = 1;
    RADIO_NETWORK.once(_e.online, () => {
      this._connectionError = 0;
      RADIO_NETWORK.once(_e.offline, this.handleError.bind(this));
    });
    _.delay(() => {
      if (!this._connectionError) return;
      this.suppress();
    }, 2000);
  }

  /**
   * 
   */
  onUpstreamResponse(message) {
    if (message.response == 'accepted') {
      RADIO_NETWORK.once(_e.offline, this.handleError.bind(this));
      // this.webRtcPeer.processAnswer(message.sdpAnswer, async () => {
      //   if (!this.screenStream) {
      //     await this.startDisplayMedia({
      //       audio: false,
      //       cursor: true,
      //       video: false
      //     });
      //   } else {
      //     for (var s of this.webRtcPeer.peerConnection.getSenders()) {
      //       if (s.track.kind == _a.video) {
      //         await s.replaceTrack(this.screenTrack, this.screenStream);
      //       }
      //     }
      //   }
      //   this.debug("AAA:66 SEND SCREEN", this.mget(_a.room_id));
      //   // Ensure that the others won't get the presenter role
      //   _.delay(() => {
      //     this.triggerHandlers({
      //       service: 'upstream-start-screenshare',
      //       screen: 1,
      //       screen_id: this.mget(_a.room_id)
      //     });
      //   }, 1500);

      // });
    } else {
      this.failed(message, __filename);
    }
  }


  /**
   * 
   */
  async startDisplayMedia() {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always"
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    if (!this.stream) {
      this.warning("Failed to get display media");
      this.triggerHandlers({
        service: 'webrtc-error',
        error: "(Failed get to permission to access your display)"
      });
      return;
    }
    let track = this.stream.getTracks()[0];
    //this.debug("AAA:89 startDisplayMedia TRACK ", track);
    track.onended = (t) => {
      this.triggerHandlers({ service: 'screenshare-stopped' });
      track.stop();
      this.stopDisplayMedia();
      //this.goodbye();
    }
    // for (var s of this.webRtcPeer.peerConnection.getSenders()) {
    //   if (s.track.kind == _a.video) {
    //     s.replaceTrack(track, this.stream);
    //   }
    // }
    this.screenTrack = track;
  }

  /**
   * 
   */
  async stopDisplayMedia() {
    this.goodbye();
    // if (!this.isShower) return;
    // this.send({
    //   service: 'upstream-stop-screenshare',
    //   screen_id: this.mget(_a.room_id)
    // });
  }

  /**
* @param {*} service
* @param {*} data 
*/
  __dispatchPush(service, data) {
    let svc = this.serviceName(service);
    // if (svc != "downstream-icecandidate") this.debug(`W::RTC __dispatchPush svc=${svc}`, data);
    switch (svc) {
      case 'upstream-response':
        this.onUpstreamResponse(data);
        break;

      case 'downstream-peer-leave':
        this.debug("LEAVE", data);
        break;

      default:
        super.__dispatchPush(service, data);
    }
  }

}

// __webrtc_local_display.initClass();

module.exports = __webrtc_local_display;

