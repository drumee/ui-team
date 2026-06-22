class ___chat_forward_list_item extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getUserState = this.getUserState.bind(this);
    this.getPresenceText = this.getPresenceText.bind(this);
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

// ===========================================================
// Presence subtitle (Figma 2307-52459) — the secondary line under a contact's
// name. Only for contacts (team rooms have no presence) and ONLY when the room
// record actually carries a status field; otherwise returns '' so the skeleton
// renders no subtitle (never fabricates a value).
// ===========================================================
  getPresenceText() {
    if (this.mget(_a.type) !== _a.privateRoom) {
      return '';
    }

    const online = this.mget(_a.online);
    // status uses the same scale as chatcontact-item: 1/2 (or truthy) = online.
    if (online === 1 || online === 2 || online === true || online === 'online') {
      return LOCALE.ONLINE;
    }
    if (online === 0 || online === false || online === 'offline') {
      return LOCALE.OFFLINE;
    }

    return '';
  }
}


module.exports = ___chat_forward_list_item;
