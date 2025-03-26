class ___notification_file extends LetcBox {

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
  wait(){}

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {}
    // switch pn
    //   when _a.none
    //     @debug "Created by kind builder"
    //   else
    //     @debug "Created by kind builder"

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
    this.status = _a.idle; // tell to Wm skip bubble
    const args = { 
      service : "new-media",
      nid     : this.mget(_a.nid),
      hub_id  : this.mget(_a.hub_id),
      filename : this.mget(_a.filename),
      media   : this
    };
    return this.triggerHandlers(args);
  }
}
    //@bubbleService("new-media", args)


module.exports = ___notification_file;
