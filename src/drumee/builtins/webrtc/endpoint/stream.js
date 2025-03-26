const { toggleState } = require("core/utils")
class __webrtc_stream extends LetcBox {

  /***
   * 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize(opt);
    this.declareHandlers();
    if (opt.logicalParent) this.viewerLink = opt.logicalParent.bind(opt.logicalParent);
    this.service_class = opt.service_class || opt.logicalParent.service_class;
    //this.debug("AAA:21 BINDING", this.service_class, opt);
    this.bindEvent(this.service_class);
  }

  /**
   * 
   */
  onBeforeDestroy() {
    this.unbindEvent(this.service_class);
  }

  /**
  * 
  * @param {*} video 
  */
  async createUpstream(video) {
    // if (this.webRtcPeer) {
    //   this.warn("webRtcPeer is already connected");
    //   return;
    // }
    // let self = this;

    // let options = {
    //   onicecandidate: self.sendIceCandidate.bind(self),// onIceCandidate
    //   configuration: configuration,
    // }
    if (video) {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audio = devices.filter(e => e.kind === 'audioinput' && e.deviceId === 'communications').pop();
      if (audio && this.mget(_a.audio)) {
        options.mediaConstraints = {
          audio: { deviceId: { exact: audio.deviceId } },
          video: true
        }
      } else {
        options.mediaConstraints = {
          audio: true,
          video: true
        }
      }
      options.localVideo = video;
    } else {
      this.startShareStream(this.screenStream);
      if (!this.screenStream) return;
      options.videoStream = this.screenStream;
      options.mediaConstraints = {
        audio: false,
        video: true
      };
      options.sendSource = _a.screen;
    }
    //this.debug("AAA:351 createUpstream", video, options, this);
    // this.webRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options,
    //   function (e) {
    //     if (e) {
    //       if (self.warning) {
    //         self.warning(e.message);
    //       } else {
    //         // self.warn("GOT ERROR", e); // CHROME ERROR
    //         // const stream = video.srcObject;
    //         // const tracks = stream.getTracks();
    //         // tracks.forEach((track) => {
    //         //   track.stop();
    //         // });
    //         // video.srcObject = null;
    //         self.warn('AAA:1111 --- webrtc-error', e);
    //         self.triggerHandlers({ service: 'webrtc-error', error: LOCALE.VIDEO_SOURCE_BUSY });
    //       }
    //       return;
    //     }
    //     //self.mset({ peer_id: this.id });
    //     this.onsignalingstatechange = self.onSignalingStateChange.bind(self);
    //     self.outbound_id = this.id;
    //     self.peer_id = this.id;
    //     self.inbound_id = null;
    //     this.generateOffer(self.sendUpstreamOffer.bind(self));
    //   }
    // );
  }

  /**
  * 
  */
  startShareStream() {
    try {
      if (!this.screenStream) {
        this.warning("Failed to get display media");
        return;
      }
      let track = this.screenStream.getTracks()[0];
      // track.stop();
      //this.debug("AAA:89 startDisplayMedia TRACK ", track);
      track.onended = (t) => {
        this.triggerHandlers({ service: 'screenshare-stopped' });
        track.stop();
        this.goodbye();
      }
      this.screenTrack = track;
      return this.screenStream;
    } catch (e) {
      this.goodbye();
    }
    return null;
  }

  // /**
  // * 
  // */
  // sendUpstreamHello() {
  //   if (this._helloSent) return;
  //   this.send({ service: 'upstream-peer-enter' });
  //   this._helloSent = 1;
  // }

  // /**
  //  * 
  //  * @param {*} error 
  //  * @param {*} offerSdp 
  //  */
  // sendUpstreamOffer(error, offerSdp) {
  //   //this.debug("AAA:106 sendUpstreamOffer 273", this);
  //   if (error) throw error;
  //   //this.debug("AAA:108 sendUpstreamOffer 275", this);
  //   var message = {
  //     service: 'upstream-offer',
  //     //peer_id: this.webRtcPeer.id,
  //     video: this.mget(_a.video),
  //     audio: this.mget(_a.audio),
  //     sdpOffer: offerSdp,
  //   };
  //   if (_.isObject(this.mget('peers'))) {
  //     message.peers = this.mget('peers');
  //   }
  //   this.send(message);
  // }

  /**
  * 
  * @param {*} video 
  */
  // createDownstream(video, force=0) {
  //   // ssid is required to know to whom downstream we offer to connect to

  //   this.warn("AAA:163 createDownstream 117 -- DEPRECATED ???", this.mget(_a.ssid));
  //   if (!this.mget(_a.ssid) || this.mget(_a.ssid) == Visitor.get(_a.socket_id)) {
  //     this.warn("WRONG SSID", this.mget(_a.ssid))
  //     return;
  //   }

  //   this.debug("XAAA:168 createDownstream 122", this, video, video.muted);
  //   let self = this;
  //   if (!this.webRtcPeer || force) {
  //     let options = {
  //       onicecandidate: self.sendIceCandidate.bind(self),// onIceCandidate
  //       configuration: configuration,
  //       mediaConstraints:{
  //         audio: true,
  //         video: true
  //       },
  //       remoteVideo: video
  //     }

  //     this.webRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options,
  //       function (e) {
  //         if (e) {
  //           if (self.warning) {
  //             self.warning(e.message);
  //           } else {
  //             this.warn("GOT ERROR", e);
  //             self.triggerHandlers({ service: 'webrtc-error', error: e.message });
  //           }
  //           return;
  //         }
  //         //self.mset({ peer_id: this.id });
  //         self.inbound_id = this.id;
  //         self.peer_id = this.id;
  //         self.outbound_id = null
  //         this.generateOffer(self.sendDownstreamOffer.bind(self));
  //       });
  //     this.webRtcPeer.onsignalingstatechange = this.onSignalingStateChange.bind(this);
  //   }
  //   return;
  // }

  // /**
  // * 
  // * @param {*} error 
  // * @param {*} offerSdp 
  // */
  // sendDownstreamOffer(error, offerSdp) {
  //   //this.debug("W::RTC sendDownstreamOffer", this.get(_a.ssid), this);
  //   if (!this.get(_a.ssid)) {
  //     this.warn('ssid is required to make make downstream offer');
  //     this.triggerHandlers({ service: 'webrtc-error', error: LOCALE.ERROR_SERVER });
  //     return;
  //   }
  //   if (error) throw error
  //   var data = {
  //     service: 'downstream-offer',
  //     // peer_id: this.mget(_a.peer_id),
  //     //peer_id: this.webRtcPeer.id,
  //     sdpOffer: offerSdp
  //   };
  //   data.ssid = this.get(_a.ssid);
  //   // this.debug("W::RTC sendDownstreamOffer", data);
  //   this.send(data);
  // }



  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    //this.debug("AAA:220 onPartReady", pn);
    let micro_state;
    const video_state = toggleState(this.mget(_a.video));
    const audio_state = toggleState(this.mget(_a.audio));
    if (this.mget(_a.mute) != null) {
      micro_state = toggleState(this.mget(_a.mute));
    } else {
      micro_state = 1 ^ audio_state;
    }
    switch (pn) {
      case _a.label:
        child.el.dataset.video = video_state;
        break;
      case "micro":
        child.el.dataset.muted = micro_state;
        break;
      case "avatar":
        child.el.dataset.video = video_state;
        break;
    }
  }


  /**
   * 
   * @param {*} msg 
   * @param {*} file 
   */
  failed(e, file) {
    this.warn("GOT ERROR ", e, file)
    this.triggerHandlers({ service: 'webrtc-error', error: e.message });

    // this.mget('logicalParent').failed(msg, file);
  }


 


  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */

  /**
  * @param {*} service
  * @param {*} data 
  */
  __dispatchPush(service, data) {
    let svc = this.serviceName(service);
    this.warn(WARNING.method.unprocessed.format(svc))

    // if (svc != "downstream-icecandidate") this.debug(`AAA:312 __dispatchPush svc=${svc}`, data);
    // switch (svc) {
    //   case 'downstream-icecandidate':
    //     this.processIceCandidate(data);
    //     break;

    //   default:
    //     this.warn(WARNING.method.unprocessed.format(svc))
    // }
  }

}
//__webrtc_stream.initClass();
module.exports = __webrtc_stream;
