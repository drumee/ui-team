// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/widget/player/video
//   TYPE : 
// ==================================================================== *

// const __webrtc_session = require('../session');
//const __core = require('../endpoint/local/devices');

class __webrtc_debug extends LetcBox {
  constructor(...args) {
    super(...args);
  }

  static initClass() {
    this.prototype.fig         = 1;
    this.prototype.behaviorSet = {
      bhv_socket: 1
    };
  }


  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.bindEvent('signaling');
    this.declareHandlers();
  }

  // ===========================================================
  //
  // ===========================================================
  onDomRefresh() {
    this.debug("OOOOOOOOOYYYYYYYYYY! DEBUG", this);
    this.ratio = this.$el.width() / this.$el.height(); 
  }

  // ===========================================================
  // onPartReady
  //
  // ===========================================================
  onPartReady(child, pn){
    // switch(pn){
    //   case "endpoints-container": 
    //     child.collection.on(_e.add, (c)=>{
    //       if(child.collection.length){
    //         child.setState(1);
    //         this.triggerHandlers({service: "new-peer"});
    //       }
    //     });
    //     child.collection.on(_e.remove, (c)=>{
    //       if(!child.collection.length){
    //         child.setState(0);
    //       }
    //     });
    //   break;
    // }
  }


  // ===========================================================
  //
  // ===========================================================
  changeFlow(f) {
    // let g = f;
    // if(f == _a.x){
    //   g = _a.y;
    // }else{
    //   g = _a.x;
    // }
    // this._flow = f;
    // this.__main.el.dataset.flow = f;
    // this.__streamRemote.changeFlow(g);
  }

  // ===========================================================
  //
  // ===========================================================
  responsive(w) {
  }

  // ===========================================================
  //
  // ===========================================================
  onUiEvent(cmd, args={}) {
    let service = args.service || cmd.mget(_a.service);
    let state   = cmd.mget(_a.state)
    this.debug("ZZZZZZZZZ", this, cmd, args);
    switch(service){
      case "devices-list":
        this.localStream = args.stream;
        this.localEndpoint = cmd;
        this.triggerHandlers({
          service: "devices-list", 
          devices:args.devices,
        });
        break;
      case "new-endpoint":
        break;
      case _a.video: case _a.audio:
        if(!this.localEndpoint) return;
        this.localEndpoint.setupTracks(service, state);
    }
  }

  // ===========================================================
  //
  // ===========================================================
  getLocalStream(){
  }

  // ===========================================================
  //
  // ===========================================================
  addRemoteEndpoint(stream, socket_id){
    const opt = {
      kind        : 'webrtc_endpoint_remote',  
      label       : LOCALE.CONNECTING,
      logicalParent : this,
      audio       : this.mget(_a.audio),
      video       : this.mget(_a.video),
      uiHandler   : this,
      api:{
        hub_id      : Visitor.id,
        target      : _a.socket,
        socket_id   : socket_id,
      },
      localStream : stream,
    }
    this.append.append(opt);
  }

  // ===========================================================
  // Websocket messages arrive here
  // ===========================================================
  __dispatchPush(service, data){
    if(service != SERVICE.signaling.message) return;
    this.debug("HHHHHHHHHHHHHHH PUSH ", service, data.type, data);
    let stream;
    switch(data.type){
      case _e.hello:
        if(!this._started){
          stream = this.localStream;
        }else{
          stream = this.localStream.clone();
        }
        if(data.target == _a.hub){
          // this.addRemoteEndpoint({
          //   api:{
          //     hub_id      : Visitor.id,
          //     target      : _a.socket,
          //     socket_id   : data.caller.key,
          //   },
          //   caller: data.caller
          // })
          this._callees.push({
            api:{
              hub_id      : Visitor.id,
              target      : _a.socket,
              socket_id   : data.caller.key,
            },
            caller: data.caller,
            localStream : stream,
          })
        }else{
          if(data.socket_id == Visitor.get(_a.socket_id)){
            // this.addRemoteEndpoint({
            //   api:{
            //     hub_id      : Visitor.id,
            //     target      : _a.socket,
            //     socket_id   : data.caller.key,
            //   },
            //   callee: data.caller
            // });  
            this._callers.push({
              api:{
                hub_id      : Visitor.id,
                target      : _a.socket,
                socket_id   : data.caller.key,
              },
              callee: data.caller,
              localStream : stream,
            });  
          }
        };
      break;
          // if(['*', null, undefined, ''].includes(data.socket_id)){

        // }
      // case _e.callback:
      //   this.addRemoteEndpoint({
      //     hub_id      : Visitor.id,
      //     target      : _a.socket,
      //     socket_id   : data.caller.key,
      //   }, data.caller)
      //   //this.update(data);
      //   break;
    }
    this.debug("ZZZZZ PUSH ", this._callers, this._callees);
  }
  //===========================================================
  //
  //===========================================================
  __dispatchRest(service, data){
    this.debug("HHHHHHHHHHHHHHH  REST ", this, service, data);
    // switch(service){
    //   case SERVICE.signaling.message:
    //     if(data.type == _e.callback){
    //       let c= this.__endpointRemote.children.last();
    //       c.addLocalStream();
    //     }    
    //     break;
    //  }
  }
  
}

__webrtc_debug.initClass();
module.exports = __webrtc_debug;
