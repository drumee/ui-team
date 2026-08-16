const WORKSPACE_MEMBER_ID_RE = /^[0-9a-zA-Z_-]{1,32}$/;

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
    this._registerShareRoom = this._registerShareRoom.bind(this);
    this._flushShareEligibility = this._flushShareEligibility.bind(this);
    this._isShareRoomEligible = this._isShareRoomEligible.bind(this);
    this._usesWorkspaceMembers = this._usesWorkspaceMembers.bind(this);
    this._cacheWorkspaceMembers = this._cacheWorkspaceMembers.bind(this);
    this._cacheEmptyWorkspaceMembers = this._cacheEmptyWorkspaceMembers.bind(this);
    this.memberSearchRows = this.memberSearchRows.bind(this);
    this._svcPayload = this._svcPayload.bind(this);
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
    this._shareEligibility = Object.create(null);
    this._pendingEligibility = new Set();
    this._eligibilityRows = new Map();
    this._eligibilityTimer = null;
    this._eligibilityInFlight = null;
    // Rows of the workspace-member tab, cached so its search filters them
    // locally. null until the first page lands (see _cacheWorkspaceMembers).
    this._workspaceMembers = null;
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case 'forward-room-list': {
        // Only the workspace-member tab caches its rows; the paged room lists
        // are searched by the server and need nothing here. SmartList keeps
        // row options on its own model, then emits the raw rows before prepare.
        const itemsOpt = child && child.mget && child.mget(_a.itemsOpt);
        if (child && child.on
          && this._usesWorkspaceMembers(itemsOpt && itemsOpt[_a.type])) {
          child.on(_e.data, this._cacheWorkspaceMembers);
          child.on(_e.eod, this._cacheEmptyWorkspaceMembers);
        }
        return;
      }

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
  onBeforeDestroy() {
    if (this._eligibilityTimer) clearTimeout(this._eligibilityTimer);
    this._eligibilityTimer = null;
    this._pendingEligibility.clear();
    this._eligibilityRows.clear();
    if (super.onBeforeDestroy) return super.onBeforeDestroy();
  }

// ===========================================================
// A message read out of a workspace conversation may only be relayed to that
// workspace's chat members, so BOTH tabs are scored when there is a source
// workspace. A P2P conversation belongs to no workspace: only share rooms are
// scored there, and contacts stay selectable.
//
// Mirrors the server's own discriminator (chat.js: nodes.hub_id === this.uid):
// the caller passes its own user ID as msghubID for a P2P chat.
// ===========================================================
  _sourceHubId() {
    const hubId = this._msgHubID;
    if (!_.isString(hubId) || !hubId) return null;
    return hubId === Visitor.get(_a.id) ? null : hubId;
  }

// ===========================================================
// Which rows need a verdict before they can be selected.
// ===========================================================
  _needsEligibility(type) {
    return this._sourceHubId() ? true : type === _a.shareRoom;
  }

// ===========================================================
// Is this tab listing the source workspace's members rather than chat rooms?
// True only for the people tab of a workspace forward — the one place the row
// source is hub.get_members_by_type, which behaves differently from the paged
// room lists (see getContactList and the max_page note in skeleton/content).
// ===========================================================
  _usesWorkspaceMembers(type) {
    return type === _a.privateRoom && !!this._sourceHubId();
  }

// ===========================================================
// Strip an async acknowledgement envelope if the promise resolved with one.
//
// An {async:1} postService can resolve with the FULL body
// ({__ack__, __status__, data:{...}}) instead of the bare payload — observed
// live on stage, where chat.forward_eligibility answered {"id":1,...} inside
// `data` while every row still read disabled: apply() indexed the envelope,
// got undefined for every recipient id, and fail-closed to 0. A real payload
// never carries `__ack__`, so the discriminator cannot strip a genuine map.
// ===========================================================
  _svcPayload(response) {
    if (response && response.__ack__ && response.data != null
      && typeof response.data === "object" && !_.isArray(response.data)) {
      return response.data;
    }
    return response;
  }

// ===========================================================
// SmartList loads each page (and search result) independently. Rows register
// their IDs here and are resolved in one batch per emitted page, never one
// request per row. This covers all three callers through their shared picker.
// ===========================================================
  _registerShareRoom(row) {
    const hubId = row && row.mget(_a.id);
    if (!_.isString(hubId)) return;
    if (Object.prototype.hasOwnProperty.call(this._shareEligibility, hubId)) return;
    this._pendingEligibility.add(hubId);
    if (!this._eligibilityRows.has(hubId)) this._eligibilityRows.set(hubId, new Set());
    this._eligibilityRows.get(hubId).add(row);
    if (!this._eligibilityTimer) {
      this._eligibilityTimer = setTimeout(this._flushShareEligibility, 0);
    }
  }

// ===========================================================
//
// ===========================================================
  _flushShareEligibility() {
    this._eligibilityTimer = null;
    if (this._eligibilityInFlight || !this._pendingEligibility.size) return;
    const hubIds = [...this._pendingEligibility].slice(0, 50);
    for (const hubId of hubIds) this._pendingEligibility.delete(hubId);
    const service = (SERVICE.chat && SERVICE.chat.forward_eligibility)
      || 'chat.forward_eligibility';
    const apply = (response) => {
      const result = this._svcPayload(response);
      for (const hubId of hubIds) {
        this._shareEligibility[hubId] = Number(result && result[hubId]) === 1 ? 1 : 0;
        const rows = this._eligibilityRows.get(hubId) || [];
        for (const row of rows) {
          if (row && !(row.isDestroyed && row.isDestroyed())) row.refreshChatEligibility();
        }
        this._eligibilityRows.delete(hubId);
      }
    };
    const sourceHubId = this._sourceHubId();
    this._eligibilityInFlight = this.postService({
      service,
      hub_ids: hubIds,
      ...(sourceHubId ? { source_hub_id: sourceHubId } : {}),
      hub_id: Visitor.get(_a.id)
    }, { async: 1 })
      .then(apply)
      .catch(() => apply({}))
      .finally(() => {
        this._eligibilityInFlight = null;
        if (this._pendingEligibility.size && !this._eligibilityTimer) {
          this._eligibilityTimer = setTimeout(this._flushShareEligibility, 0);
        }
      });
  }

// ===========================================================
// The map is keyed by recipient ID — a hub ID for a share room, a user ID for a
// contact. Contacts only appear in it when a source workspace scopes the
// forward; from a P2P chat they are eligible by definition and never queried.
// ===========================================================
  _isShareRoomEligible(hubId) {
    return Number(this._shareEligibility[hubId]) === 1;
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
    // Last filter before the payload. Contacts are filtered too when a source
    // workspace scopes the forward, since a contact outside it is not a valid
    // recipient there.
    this._selectedShareRooms = this._selectedShareRooms.filter(
      (hubId) => this._isShareRoomEligible(hubId)
    );
    if (this._sourceHubId()) {
      this._seletecdContacts = this._seletecdContacts.filter(
        (id) => this._isShareRoomEligible(id)
      );
    }
    this._selectedRooms = this._seletecdContacts.concat(this._selectedShareRooms);
    if (!this._selectedRooms.length) return;
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

    return this.postService(payload).then((response) => {
      const data = this._svcPayload(response);
      if (data && (data.status === 'INVALID_RECIPIENT'
        || data.status === 'INVALID_SOURCE')) {
        Wm.alert(LOCALE.FORWARD_REJECTED || LOCALE.TRY_AGAIN);
        return;
      }
      if (data && data.status) {
        Wm.alert(LOCALE.TRY_AGAIN);
        return;
      }
      if (_.isArray(data) && data[0] && !_.isEmpty(data[0].rejected)) {
        Wm.alert(LOCALE.FORWARD_REJECTED || LOCALE.TRY_AGAIN);
        this.closeOverlay(cmd);
        return;
      }
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
  filterData(data, type) {
    const rows = _.isArray(data) ? data : [];
    const gated = this._needsEligibility(type);
    return rows
      .filter((row) => row.selector)
      .map((row) => row.selector)
      .filter((id) => !gated || this._isShareRoomEligible(id));
  }

// ===========================================================
// 
// ===========================================================
  triggerRoomSelect(cmd) {
    const data = this.getData(_a.formItem);

    this._seletecdContacts    = this.filterData(data.privateRooms, _a.privateRoom);
    this._selectedShareRooms  = this.filterData(data.shareRooms, _a.shareRoom);

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
    const enabled = count > 0;
    const label = enabled ? `${LOCALE.FORWARD}(${count})` : LOCALE.FORWARD;
    return Skeletons.Note({
      className : `${fig}__button-confirm button${enabled ? ' clickable' : ''}`,
      content   : label,
      service   : enabled ? 'forward-message' : null,
      dataset   : { disabled: enabled ? 0 : 1 },
      uiHandler : enabled ? [this] : []
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
    const source = cmd.source || cmd;
    const id = source.mget(_a.value) || source.mget(_a.id);
    const data = this.getItemsByAttr(_a.id, id)[0];
    if (!data || (data.isChatDisabled && data.isChatDisabled())) return;
    if (!data.__roomItemCheckbox) return;
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
// The people a forward may reach, which is NOT the same list in both contexts.
//
// From a workspace conversation the recipients are that workspace's MEMBERS.
// The personal contact book is the wrong source there: joining a workspace does
// not create a contact for anyone (drumate/hubs/join_hub.sql only files the hub
// as a media node), so colleagues the server would happily accept never even
// appeared in the picker — every row was greyed out.
//
// A P2P chat belongs to no workspace, so it keeps the contact book.
// ===========================================================
  getContactList() {
    const sourceHubId = this._sourceHubId();
    if (sourceHubId) {
      return {
        service : SERVICE.hub.get_members_by_type,
        hub_id  : sourceHubId,
        type    : _a.all
      };
    }

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
// The search list mirrors whatever the tab underneath it is listing, so the
// people tab of a workspace forward searches that workspace's MEMBERS.
//
// hub_get_members_by_type takes no search key, so the filtering happens on the
// rendered rows instead (see filterSearchRows) — the same approach the mention
// popup uses for its member list.
// ===========================================================
  getRoomSearchApi() {
    const type = this.mget(_a.type);
    if (this._usesWorkspaceMembers(type)) {
      return {};
    }

    let _service = SERVICE.chat.contact_rooms;
    if (type === _a.shareRoom) {
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
// Search rows for the member tab.
//
// hub_get_members_by_type takes no search key and the list's own `skip` filter
// tests one field at a time, so neither can express "name OR email contains X".
// The member set is unpaged and small, so it is fetched once and filtered here
// on the fields the row actually displays — the same approach the mention popup
// takes for its member list.
//
// Returns rows ready to be rendered as list kids, or null while the fetch is
// still in flight (the caller then renders safe empty kids until cache arrival).
// ===========================================================
  memberSearchRows() {
    const rows = this._workspaceMembers;
    if (!_.isArray(rows)) return null;
    const key = `${this.mget(_a.search) || ''}`.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter((row) => [
      row.fullname, row.firstname, row.lastname, row.surname, row.email
    ].some((value) => `${value || ''}`.toLowerCase().includes(key)));
  }

// ===========================================================
// Pick the same canonical identity used by the other hub-member views. The
// service normally aliases all three fields to the same user id, but older/raw
// responses may omit aliases. Populated aliases must be non-empty strings and
// must agree; a malformed or conflicting row is unsafe to select.
// ===========================================================
  _workspaceMemberId(row) {
    if (!row || typeof row !== 'object') return null;
    const ids = [];
    for (const key of [_a.entity_id, _a.drumate_id, _a.id]) {
      const value = row[key];
      if (value == null) continue;
      if (!_.isString(value)) return null;
      const id = value.trim();
      if (id && !WORKSPACE_MEMBER_ID_RE.test(id)) return null;
      if (id) ids.push(id);
    }
    if (!ids.length || ids.some((id) => id !== ids[0])) return null;
    return ids[0];
  }

// ===========================================================
// Keep the member rows the tab already loaded, so the search filters them
// without a second round trip. SmartList emits this same array before prepare,
// so replacing that array in place also gives the rendered rows canonical ids.
// Invalid identities are removed before the list can render or select them.
// ===========================================================
  _cacheWorkspaceMembers(rows) {
    if (!_.isArray(rows)) return;
    const normalized = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || _.isArray(row)) continue;
      const id = this._workspaceMemberId(row);
      if (!id) continue;
      normalized.push({ ...row, [_a.id]: id });
    }
    rows.splice(0, rows.length, ...normalized);
    this._workspaceMembers = rows;
    this._refreshWorkspaceMemberSearch();
  }

// ===========================================================
// Empty SmartList responses skip the data event and report only end-of-data.
// Cache [] only before any member payload; short nonempty pages emit data and
// then eod, so their normalized rows must not be erased here.
// ===========================================================
  _cacheEmptyWorkspaceMembers() {
    if (this._workspaceMembers !== null) return;
    this._workspaceMembers = [];
    this._refreshWorkspaceMemberSearch();
  }

// ===========================================================
// A search may open before the underlying member request settles. It is first
// rendered with safe empty kids; when the member cache arrives, rebuild only an
// active workspace-member search so its local filter can show the real matches.
// ===========================================================
  _refreshWorkspaceMemberSearch() {
    if (!this._usesWorkspaceMembers(this.mget(_a.type))) return;
    const key = `${this.mget(_a.search) || ''}`.trim();
    if (key.length < 2) return;
    const result = this.getPart && this.getPart('search-result');
    if (!result || typeof result.feed !== 'function') return;
    if (result.el && result.el.dataset
      && result.el.dataset.mode !== _a.open) return;
    result.feed(require('./skeleton/search')(this));
  }


// ===========================================================
// 
// ===========================================================
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.chat.forward:
        // handleResponse dispatches before postService's promise resolves. Let
        // forwardMessage inspect INVALID_RECIPIENT before deciding to close.
        return data;
      case SERVICE.chat.forward_eligibility:
        // Same reasoning as chat.forward: hand back the payload so a dispatch
        // consumer sees the map, not an ack envelope.
        return data;
    }
  }
}


module.exports = ___chat_item_forward;
