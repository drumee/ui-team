class ___notification_message extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    return this.declareHandlers();
  }


// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    // @status = _a.idle # tell to Wm skip bubble
    // args = 
    //   type   : _a.channel
    //   nid    : "0"
    //   hub_id : @mget(_a.hub_id)
    this.debug("HHHHHHHHHHH", this);
    //@bubbleService("new-messages", args)
    const args = { 
      service : "new-messages",
      type    : _a.channel,
      nid     : this.mget(_a.nid),
      hub_id  : this.mget(_a.hub_id)
    };
    return this.triggerHandlers(args);
  }
}
 

module.exports = ___notification_message;
