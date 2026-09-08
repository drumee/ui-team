class ___chat_forward_list_item extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getUserState = this.getUserState.bind(this);
    this.getPresenceText = this.getPresenceText.bind(this);
    this.isChatDisabled = this.isChatDisabled.bind(this);
    this.disabledReason = this.disabledReason.bind(this);
    this.refreshChatEligibility = this.refreshChatEligibility.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.selectedRoomList = this.mget('selectedList') || [];
    const owner = this.mget('eligibilityOwner');
    if (owner && owner._registerShareRoom) owner._registerShareRoom(this);
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
    if (this.isChatDisabled()) return;
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
    if (this.isChatDisabled()) return 0;
    let _state = 0;
    const roomId = this.mget(_a.id);
    if ((this.selectedRoomList.length > 0) && (this.selectedRoomList.includes(roomId))) {
      _state = 1;
    }

    return _state;
  }

// ===========================================================
// A row is gated only when the list passed it an eligibility map. The list
// decides that (see the picker's _needsEligibility): a workspace message scopes
// BOTH tabs to that workspace's chat members, while a P2P chat scopes only its
// share rooms and leaves contacts selectable.
//
// Absent verdict = disabled: the map is filled in by a batched response, so an
// unresolved row must not be selectable in the meantime.
// ===========================================================
  isChatDisabled() {
    const eligibility = this.eligibilityMap();
    if (!eligibility) return false;
    return Number(eligibility[this.mget(_a.id)]) !== 1;
  }

// ===========================================================
// The live verdict map, read from the OWNER rather than from this row's model.
//
// `shareEligibility` is handed down through itemsOpt, so it lands in a Backbone
// model — which copies the attributes it is given. The row therefore holds a
// SNAPSHOT taken before any verdict arrived (an empty object), while the picker
// keeps filling its own map. Verified live on stage: the owner's map held
// {id: 1} for every recipient while each row's copy still had zero keys, so
// every row read "no verdict" and stayed disabled.
//
// Reading through the owner keeps one source of truth. The model value is still
// the flag for WHETHER this row is gated at all (the picker only passes it when
// the tab needs scoring), so an ungated row keeps returning false above.
// ===========================================================
  eligibilityMap() {
    const gated = this.mget('shareEligibility');
    if (!gated) return null;
    const owner = this.mget('eligibilityOwner');
    return (owner && owner._shareEligibility) || gated;
  }

// ===========================================================
//
// ===========================================================
  disabledReason() {
    if (!this.isChatDisabled()) return '';
    return this.mget(_a.type) === _a.shareRoom
      ? LOCALE.NO_CHAT_PERMISSION
      : LOCALE.NOT_WORKSPACE_MEMBER;
  }

// ===========================================================
// Rebuild only this row after its batched eligibility response arrives.
// ===========================================================
  refreshChatEligibility() {
    if (this.isDestroyed && this.isDestroyed()) return;
    if (this.el) this.feed(require('./skeleton')(this));
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
