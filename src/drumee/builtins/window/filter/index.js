const mfsInteract = require('../interact');

class __window_filter extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
  }

  static initClass() { //WPP.Box.Reader
    this.prototype.isFolder  = 1;
    this.prototype.fig   = 1;
  }

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize();
    //@_currentPid = @model.get(_a.nodeId) || 0
    this._path = [];

    this._flow = _a.horizontal;
    this.model.atLeast({
      value  : _a.normal,
      hub_id : Visitor.id
    }); 
    
    if ((this.style.get(_a.left) == null)) {
      this.style.set({
        left   : (window.innerWidth/2) - (this.size.width/2)});
    }
    if ((this.style.get(_a.top) == null)) {
      this.style.set({
        top    : (window.innerHeight/2) - (this.size.height/2)});
    }
              
    this.style.set({
      width  : this.size.width,
      height : this.size.height
    });

    this.debug("aaaa 33", this); 
    return this.skeleton = require("./skeleton/main")(this);
  }


// ===========================================================
// onChildBubble
//
// ===========================================================
  onChildBubble() {
    super.onChildBubble();
    if (_.isEmpty(Wm.clipboard)) {
      return this.unselect();
    } else {
      return this.debug("#e", Wm.clipboard.command);
    }
  }

// ********************************************
// User interaction
// *********************************************

// ===========================================================
// onUiEvent
//
// @param [Object] cmd
//
// @return [Object]
//
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.model.get(_a.service);
    // try 
    //   service = @mget(_a.itemsOpt).service
    this.debug(`388388 menuEvents -->2222 service=${service}`, cmd, this);
    switch (service) {
      case _e.select: case "change-avatar":
        this.service = service;
        this.source = cmd;
        return this.triggerHandlers();

      case _e.close:
        return this.suppress();
    }
  }
        
      //   super cmd


// ===========================================================
// getCurrentApi
//
// @return [Object] 
//
// ===========================================================
  getCurrentApi(type){
    const api = { 
      service : SERVICE.media.get_by_type,
      page    : 1,
      type    : this.mget(_a.type) || _a.image,
      hub_id  : Visitor.id 
    };
    if(this.mget('showAll')) { 
      api.showAll = 1;
    }
    return api;
  }
}
__window_filter.initClass();

module.exports = __window_filter;

// -------------------------- END OF MODULE -----------------------
