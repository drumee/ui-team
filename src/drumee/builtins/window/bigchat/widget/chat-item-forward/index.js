class ___chat_item_forward extends LetcBox {
// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.forwardMessage = this.forwardMessage.bind(this);
    this.triggerItemList = this.triggerItemList.bind(this);
    this.filterData = this.filterData.bind(this);
    this.triggerRoomSelect = this.triggerRoomSelect.bind(this);
    this._buildForwardButton = this._buildForwardButton.bind(this);
    this._loadSearchResults = this._loadSearchResults.bind(this);
    this.triggerSearchRoomSelect = this.triggerSearchRoomSelect.bind(this);
    this.closeSearchResult = this.closeSearchResult.bind(this);
    this.closeOverlay = this.closeOverlay.bind(this);
    this.getContactList = this.getContactList.bind(this);
    this.getShareRoomList = this.getShareRoomList.bind(this);
    this.getRoomSearchApi = this.getRoomSearchApi.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    
    /* data from source - do not remove */
    this._seletecdMessages = this.mget('messages');
    this._msgHubID = this.mget('msghubID');
    

    this._seletecdContacts = [];
    this._selectedShareRooms = [];
    this._selectedRooms = [];
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
    const status = cmd.get(_a.status);

    if (pointerDragged) {
      return;
    }

    switch (service) {
      case 'forward-message':
        return this.forwardMessage(cmd);
      
      case 'trigger-list-item':
        return this.triggerItemList(cmd);
      
      case 'trigger-room-select':
        return this.triggerRoomSelect(cmd);

      case 'trigger-search-room-select':
        return this.triggerSearchRoomSelect(cmd);
      
      case _e.search:
        return this._loadSearchResults(cmd);
      
      case 'search-close-result':
        return this.closeSearchResult();

      case _e.close:
        return this.closeOverlay(cmd);
            
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  forwardMessage(cmd) {
    this._selectedRooms = this._seletecdContacts.concat(this._selectedShareRooms);
    const messageData = {
      hub_id    : this._msgHubID,
      messages  : this._seletecdMessages
    };

    const payload = {
      service   : SERVICE.chat.forward,
      entities  : this._selectedRooms,
      nodes     : messageData,
      hub_id    : Visitor.get(_a.id)
    };
    // P2P context: pass peer_id so server can fetch messages from peer's DB
    const peerId = this.mget(_a.peer_id);
    if (peerId) payload.peer_id = peerId;

    return this.postService(payload).then(() => {
      Wm.alert(LOCALE.FORWARD_DONE, 2000);
      this.closeOverlay(cmd);
    }).catch(() => {
      Wm.alert(LOCALE.TRY_AGAIN);
    });
  }

// ===========================================================
// 
// ===========================================================
  triggerItemList(cmd) {
    const type = cmd.mget(_a.type);
    const privateRoom = this.getPart('private-room-list');
    const shareRoom = this.getPart('share-room-list');

    if (type === _a.privateRoom) {
      privateRoom.el.dataset.mode = _a.open;
      return shareRoom.el.dataset.mode = _a.closed;
    
    } else if (type === _a.shareRoom) {
      shareRoom.el.dataset.mode = _a.open;
      return privateRoom.el.dataset.mode = _a.closed;
    }
  }

// ===========================================================
// 
// ===========================================================
  filterData(data) {
    let result;
    return result = data.filter(row => row.selector).map(row => row.selector);
  }

// ===========================================================
// 
// ===========================================================
  triggerRoomSelect(cmd) {
    const data = this.getData(_a.formItem);

    this._seletecdContacts    = this.filterData(data.privateRooms);
    this._selectedShareRooms  = this.filterData(data.shareRooms);

    const roomCount = this._seletecdContacts.length + this._selectedShareRooms.length;

    // The picked count lives on the CTA itself — "Forward(N)" — instead of a
    // separate "N selections" line. Always re-render so it resets to "Forward"
    // when the last recipient is unchecked.
    const wrap = this.getPart('forward-button-wrap');
    if (wrap) {
      wrap.feed(this._buildForwardButton(roomCount));
    }
  }

// ===========================================================
// Build the footer CTA. Count baked into the label ("Forward(N)"); plain
// "Forward" when nothing is picked. Re-fed by triggerRoomSelect as the
// selection changes.
// ===========================================================
  _buildForwardButton(count) {
    const fig = this.fig.family;
    const label = count > 0 ? `${LOCALE.FORWARD}(${count})` : LOCALE.FORWARD;
    return Skeletons.Note({
      className : `${fig}__button-confirm button clickable`,
      content   : label,
      service   : 'forward-message',
      uiHandler : this
    });
  }

// ===========================================================
// _loadSearchResults
// ===========================================================
  _loadSearchResults(cmd) {
    const searchResult = this.getPart('search-result');
    const val = cmd.getData(_a.formItem).value;
    this.mset({
      type    : cmd.mget(_a.type),
      search  : val
    });
    
    if (val.length < 2) {
      return;
    }
    
    searchResult.el.dataset.mode = _a.open;
    return searchResult.feed(require('./skeleton/search')(this));
  }

// ===========================================================
// 
// ===========================================================
  triggerSearchRoomSelect(cmd) {
    const data = this.getItemsByAttr(_a.id, cmd.source.mget(_a.value))[0];
    data.__roomItemCheckbox.el.click();
    return this.closeSearchResult();
  }

// ===========================================================
//
// ===========================================================
  closeSearchResult() {
    const searchResult = this.getPart('search-result');
    searchResult.feed('');
    searchResult.el.dataset.mode = _a.closed;
    return this.getPart(this.mget(_a.type) + '-search-input').setValue('');
  }

// ===========================================================
//
// ===========================================================
  closeOverlay(cmd) {
    // Hardened: missing source / kind-mismatch / disable hook absence
    // must not block the close — silently swallow and proceed to dismiss.
    try {
      const chatSource = this.mget('source');
      if (chatSource && _.isFunction(chatSource.getItemsByKind)) {
        const widgetChat = chatSource.getItemsByKind('widget_chat')[0];
        if (widgetChat && _.isFunction(widgetChat.disableMessageSelection)) {
          widgetChat.disableMessageSelection();
        }
      }
    } catch (e) { /* swallow */ }

    // Set service on the model so handlers that read via cmd.mget(_a.service)
    // see 'close-overlay' (folder window uses this path; bigchat reads
    // cmd.service JS property and worked accidentally).
    this.mset({ service: 'close-overlay' });
    this.source = cmd;
    this.service = 'close-overlay';
    return this.triggerHandlers();
  }

// ===========================================================
// 
// ===========================================================
  getContactList() {
    const api = {
      service : SERVICE.chat.contact_rooms,
      hub_id  : Visitor.get(_a.id)
    };
    
    return api;
  }

// ===========================================================
// 
// ===========================================================
  getShareRoomList() {
    const api = {
      service : SERVICE.chat.share_rooms,
      hub_id  : Visitor.get(_a.id)
    };
    
    return api;
  }

// ===========================================================
// 
// ===========================================================
  getRoomSearchApi() {
    let _service = SERVICE.chat.contact_rooms;
    if (this.mget(_a.type) === _a.shareRoom) {
      _service = SERVICE.chat.share_rooms;
    }
    
    const api = {
      service : _service,
      key     : this.mget(_a.search),
      order   : 'desc',
      hub_id  : Visitor.get(_a.id)
    };
    
    return api;
  }


// ===========================================================
// 
// ===========================================================
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.chat.forward:
        return this.closeOverlay(data);
    }
  }
}


module.exports = ___chat_item_forward;
