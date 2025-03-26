const { timestamp, toggleState, toBoolean, fitBoxes } = require("core/utils")

const {showAvatar, hideAvatar, changeSettings, getVideoTrack} = require('../../utils');
class __endpoint_lense extends LetcBox {

  static initClass() {
    this.prototype.showAvatar = showAvatar;
    this.prototype.hideAvatar = hideAvatar;
    this.prototype.changeSettings = changeSettings;
    this.prototype.getVideoTrack = getVideoTrack;
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.atLeast({ 
      offsetX : 0,
      offsetY : 0,
      mute    : 0
    });
    this._count = _.after(2, this._start.bind(this));
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onBeforeDestroy() {
    if(!this.stream) return
    for(var t of this.stream.getTracks()){
      t.stop();
    }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    let micro_state;
    const video_state = toggleState(this.mget(_a.video));
    const audio_state = toggleState(this.mget(_a.audio));
    if (this.mget(_a.mute) != null) {
      micro_state = toggleState(this.mget(_a.mute));
    } else { 
      micro_state = 1^audio_state;
    }
    switch (pn) {
      case _a.video:
        child.el.muted = toBoolean(this.mget(_a.mute));
        child.el.dataset.video = video_state;
        this._count();
        // this.triggerHandlers({service:'video-ready'});
        if (!this.stream) {
          return;
        }
        child.el.srcObject = this.stream;
      break;
      case _a.label: 
        child.el.dataset.video = video_state;
      break;
      case "micro": 
        child.el.dataset.muted = micro_state;
      break;
      case "avatar": 
        child.el.dataset.video = video_state;
      break;
      case "peer-wrapper":
        this._count();
      break;
    }
  }

  /**
   * 
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
    this.initialWidth = this.$el.width();
    this.initialHeight = this.$el.height();
    this.timestamp = timestamp();
  }

  /**
   * 
   */
  _start(){
    //this.debug(`PLUG START`, this);
    if(this.mget(_a.service)) this.triggerHandlers({video:this.__video.el});
  }

 


  /**
   * 
   */
  getSettings(opt) {
    this.stream.getVideoTracks()[0].getSettings();
  }

  /**
   * 
   * @param {*} opt 
   */
  responsive(opt) {
    if (!this.__video || !this.stream) {
      return;
    }
    const conf = opt || this.stream.getVideoTracks()[0].getSettings();
    const box = fitBoxes({
      width : this.$el.width()  - this.mget(_a.offsetX),
      height: this.$el.height() - this.mget(_a.offsetY)
    },{
      width : conf.width, 
      height: conf.height 
    });
    //@debug "OOOOOOOOXXXX box", box
    this.__video.$el.width(box.width);
    this.__video.$el.height(box.height);
    return box;
  }

// ===========================================================
// 
// ===========================================================
  setSize(size) {
    // size.width = size.width - @mget(_a.offsetX)
    // size.height = size.height - @mget(_a.offsetY)
    const box = fitBoxes(size, {
      width : this.$el.width(),
      height: this.$el.height()
    });
    //@debug "OOOOOOOOXXXX box", size, box
    this.$el.width(box.width);
    this.$el.height(box.height);
    return box;
  }

  /**
   * 
   */
  handleVideoElement(args) {
    this.hideAvatar(args);
    this.__peerWrapper.el.dataset.state = 0;
    this.__video.el.dataset.status = '';
    this.__video.el.dataset.state = 1;
    this.__video.el.onloadedmetadata =e=> {
      let inner = {width : e.target.videoWidth, height:e.target.videoHeight};
      let size = fitBoxes(inner, {width:window.outerWidth, height:window.innerHeight});
      const ratio = inner.width/inner.height;
      this.videoRatio = ratio;
      this.debug("PLUG::166", e, size);
      this.triggerHandlers({service: 'lense-size', ...size, video:1, ratio});
      this.videoBox = inner;
      this.__sound.plug(this.stream);
    };
    let v = this.stream.getVideoTracks()[0];
    // if(v){
    this.debug("PLUG::172",v.muted && v.enabled, v.muted, v.enabled);
    //   //v.enabled = true;
      _.delay(()=>{
        this.__video.el.srcObject = this.stream;
      }, 1000);
    // }    
    // this.__video.el.srcObject = this.stream;
  }

    /**
   * 
   */
  onlyAudio(args) {
    let v = this.stream.getVideoTracks()[0];
    this.debug("PLUG::187",v.muted && v.enabled, v.muted, v.enabled);
    if(v){
      this.debug("PLUG::189",v.muted && v.enabled, v.muted, v.enabled);
      if(!v.muted && v.enabled){
        this.debug("PLUG::191",this.__video.el.srcObject, this.stream, args);
        v.enabled = false;
      } 
      _.delay(()=>{
        this.__video.el.srcObject = this.stream;
      }, 1000);
    }
  }

  /**
   * 
   */
  handleAudiotrack(args) {
    if(args.audio == null || args.audio == undefined){
      this.warn("Couln not handle audio without value");
      return;
    }
    let m = this.__muted || this.__micro;
    if(m) m.el.dataset.state  =  args.audio^1;
  }

  /**
   * 
   */
  handleVideotrack(args) {
    let v = this.stream.getVideoTracks()[0];
    this.debug("PLUG::: 190", args, v.enabled);
    if(!v){
      this.showAvatar(args);
      return;
    }
    if(args.video || args.screen){
      v.enabled = true;
      this.handleVideoElement(args);
    }else {
      v.enabled = false;
      this.showAvatar(args);
    };
  }


  /**
   * 
   */
  handleTracks(args) {
    let v = this.stream.getVideoTracks()[0];
    //let a = this.stream.getAudioTracks()[0];
    this.debug("PLUG::238", args.phase, args.source_id);
    if(!v){
      this.warn("NO TRACK GIVEN!!!");
      return false;
    }

    this.debug("PLUG::244", args);
    if(args.phase == 'connecting-remote'){
      this.source_id = args.source_id;
      this.debug("PLUG::247", args);
      if(args.screen){
        args.name = _a.screen;
        this.handleVideotrack(args);
        return true;
      }
      this.debug("PLUG::253", args);
      if(args.video){
        args.name = _a.video;
        this.handleVideotrack(args)
        return true;        
      }
      this.debug("PLUG::259", args);
      this.onlyAudio(args);
      this.handleAudiotrack(args);
      this.showAvatar(args);
      // this.onlyAudio(args);
      // this.handleAudiotrack(args);
      return true;
    }

    if(!v || !v.enabled){
      args.name = _a.audio;
      args.video = 0;
      args.screen = 0;
      this.handleAudiotrack(args);
      return true;
    }

    if(v.enabled){
      args.name = _a.video;
      this.handleVideotrack(args);
      return true;
    }
    return false;
  }

  /**
   * 
   * @param {*} stream 
   * @param {*} args 
   */
  plug(args) {
    if(!args.label) args.label = `${args.firstname} ${args.lastname}`;
    if(!args.stream || !args.uid){
      this.showAvatar(args);
      return;
    }

    let audio = args.stream.getAudioTracks()[0] || {id:null};
    // Sound analyser trigger plug when speaking. Skip if same speaker.
    delete args.service;
    this.debug("AAA:299 PLUG", args, `name=${args.name}`, `source=${args.source_id}`, this.source_id, audio.source_id, this);
    if(args.source_id){
      if (this.source_id == args.source_id) return;
      this.source_id = args.source_id;
    }

    if(this.screenShared) return;

    this.audioId = audio.id;
    this.stream = args.stream;
    this.timestamp = timestamp();
    switch(args.name){
      case _a.video:
        this.handleVideotrack(args);
      break;
      case _a.audio:
        this.handleAudiotrack(args);
        this.showAvatar(args);
      break;
      case _a.screen:
        this.handleVideotrack(args);
        this.screenShared = args.state;
      break;
      default:
        if(!this.handleTracks(args)) this.warn('Failed ton handle stream', args);
    }
    this.mset(args);
    this.mset(args.name, args.state);
  }
}
__endpoint_lense.initClass();

module.exports = __endpoint_lense;
