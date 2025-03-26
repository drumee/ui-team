class ___chat_forward_list_item extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getUserState = this.getUserState.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.selectedRoomList = this.mget('selectedList') || [];
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
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
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`OnUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case _a.none:
        return this.debug("Created by kind builder");
      
      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        return this.service = '';
    }
  }

// ===========================================================
//
// ===========================================================
  getUserState() {
    let _state = 0;
    const roomId = this.mget(_a.id);
    if ((this.selectedRoomList.length > 0) && (this.selectedRoomList.includes(roomId))) {
      _state = 1;
    }
    
    return _state;
  }
}


module.exports = ___chat_forward_list_item;
