const ws = require('core/websocket');
class __websocket_channel extends ws {

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
  
  // ===========================================================
  // initialize
  //
  // @param [Object] opt
  //
  // ===========================================================
    this.prototype.behaviorSet =
      {socket   : 1};
  }
    
// ===========================================================
// 
//
// ===========================================================
  initialize(opt) {
    return super.initialize(opt);
  }


// ===========================================================
// 
//
// ===========================================================
  onDomRefresh(){
    this.declareHandlers(); //s {ui:@, part:@}, {fork: yes, recycle: yes}
    this._skeleton = this.model.get(_a.skeleton);
    if (this._skeleton != null) {
      this.feed(this._skeleton);
    } else {
      this.feed({ 
        kind : KIND.note, 
        content : "Socket test"
      });
    }
    return this.debug("I'm the WEBSOCKET TESTER", this);
  }



// ===========================================================
// 
//
// ===========================================================
  on_ws_data(service, data){
    this.debug("DATA EVENT RECEIVED", service, data);
    return this.trigger(service, data);
  }
}
__websocket_channel.initClass();
    
module.exports = __websocket_channel;
