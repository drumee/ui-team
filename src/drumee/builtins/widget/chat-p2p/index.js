class __chat_p2p extends LetcBox {

  constructor(...args) {
    super(...args);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.getContactsApi = this.getContactsApi.bind(this);
    this.openChat = this.openChat.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
  }

  initialize(opt = {}) {
    require('./skin');
    opt.dataset = { ...opt.dataset, anim: "out" };
    super.initialize(opt);
    this.declareHandlers();
    this._radioId = `peer-${this.mget(_a.widgetId)}`;
    this._filter = _a.contact;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    document.removeEventListener("mousedown", this._onDocClick);
  }

  /**
   * Returns the API config for the contact list.
   */
  getCurrentApi() {
    return {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id)
    };
  }

  /**
   * Returns the API config for the compose popup's contact list.
   * Reuses chat_rooms so we get the same data shape as the inbox list,
   * which feeds straight into openChat().
   */
  getContactsApi() {
    return {
      service: SERVICE.chat.chat_rooms,
      flag: _a.contact,
      option: _a.active,
      hub_id: Visitor.get(_a.id),
    };
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'contact-list':
        this._contactList = child;
        if (child.collection) {
          child.collection.comparator = item => -item.get(_a.ctime);
        }
        child.once(_e.eod, async () => {
          this.el.dataset.anim = "in";
          this._applyFilter();
          await Kind.waitFor('widget_chat')
          const first = child.children && child.children.first && child.children.first();
          if (first && first.el && first.el.style.display !== 'none') this.openChat(first);
        })
        break;

      case 'compose-popup':
        this._composePopup = child;
        document.addEventListener("mousedown", this._onDocClick);
        break;

      case 'compose-list':
        this._composeList = child;
        if (child.collection) {
          child.collection.comparator = item => -item.get(_a.ctime);
        }
        break;

      case 'compose-search':
        this._composeSearch = child;
        break;

      case 'all-read-empty':
        this._allReadEmpty = child;
        if (child.el) child.el.dataset.state = 0;
        break;

      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  _toggleComposePopup(force) {
    if (!this._composePopup || !this._composePopup.el) return;
    const cur = this._composePopup.el.dataset.state === "1";
    const next = typeof force === "boolean" ? force : !cur;
    this._composePopup.el.dataset.state = next ? 1 : 0;
    if (next) {
      const inputEl = this._composeSearch && this._composeSearch.el && this._composeSearch.el.querySelector("input");
      if (inputEl) {
        inputEl.value = "";
        setTimeout(() => inputEl.focus(), 0);
      }
      if (this._composeList && _.isFunction(this._composeList.restart)) {
        this._composeList.restart();
      }
      this._filterComposeList("");
    }
  }

  _onDocClick(e) {
    if (!this._composePopup || !this._composePopup.el) return;
    if (this._composePopup.el.dataset.state !== "1") return;
    if (this._composePopup.el.contains(e.target)) return;
    if (this.el && this.el.querySelector(`.${this.fig.family}__compose-btn`)?.contains(e.target)) return;
    this._toggleComposePopup(false);
  }

  _filterComposeList(text) {
    if (!this._composeList || !this._composeList.children) return;
    const q = (text || "").trim().toLowerCase();
    this._composeList.children.forEach((item) => {
      if (!item.el) return;
      if (!q) {
        item.el.style.display = "";
        return;
      }
      const name = [
        item.mget && item.mget(_a.firstname),
        item.mget && item.mget(_a.lastname),
        item.mget && item.mget(_a.fullname),
        item.mget && item.mget(_a.email),
      ].filter(Boolean).join(" ").toLowerCase();
      item.el.style.display = name.includes(q) ? "" : "none";
    });
  }

  /**
   * Opens the chat for the selected contact/room.
   * Mirrors window_bigchat / chat-room behaviour: peer/share/support are all
   * rendered inside this panel using widget_chat with the matching type.
   * @param {View} contact - The selected chat_contact_item view
   */
  async openChat(contact) {
    if (!contact || !contact.mget) return;

    if (_.isFunction(contact.resetNotification)) {
      contact.resetNotification();
    }

    const filter = this._activeFilter || 'all';
    if (filter !== 'all' && contact.el) {
      contact.el.style.display = 'none';
    }

    this.ensurePart('contact-list').then(list => {
      if (list.children) {
        list.children.forEach(c => {
          if (c.el) c.el.dataset.radio = (c === contact) ? 'on' : 'off';
        });
      }
    });

    const peer = contact.toLETC ? contact.toLETC() : { ...contact.model.toJSON() };
    delete peer.kids;
    delete peer.uiHandler;

    // Ensure flag survives toLETC filtering — read directly from model
    const flag = (contact.mget && contact.mget(_a.flag)) || peer.flag;
    peer.flag = flag;

    const hub_id = peer.entity_id;
    if (!hub_id) return;

    let type;
    let home = null;
    let nid = null;
    switch (flag) {
      case _a.share:
        type = _a.share;
        try {
          home = await this.fetchService(SERVICE.media.home,
            { hub_id }, { async: 1 });
          peer.home = home;
          peer.nid = home && home.home_id;
          nid = peer.nid;
        } catch (e) {
          this.warn("Failed to fetch share home", e);
          return;
        }
        break;
      case _a.support:
        type = _a.supportTicket;
        break;
      case _a.contact:
      default:
        type = _a.privateRoom;
        try {
          home = await this.fetchService(SERVICE.media.home,
            { hub_id: Visitor.id }, { async: 1 });
          nid = home && home.home_id;
        } catch (e) {
          this.warn("Failed to fetch personal home", e);
        }
    }

    const widget_chat = {
      kind: 'widget_chat',
      className: 'share-room-widget__chat',
      type,
      area: type,
      view: 'bigChat',
      hub_id,
      peer_id: type === _a.privateRoom ? (peer.drumate_id || peer.entity_id) : '',
      peer,
      home,
      nid,
      widgetId: `chat-p2p-${type}-${hub_id}`,
    };

    if (type === _a.supportTicket && peer.ticket_id) {
      widget_chat.ticket_id = peer.ticket_id;
    }

    this.activePeer = peer;
    this.activePeerType = type;

    this.ensurePart('chat-header').then(header => {
      header.clear();
      header.feed(require('./skeleton/chat-header')(this, contact));
    });

    this.ensurePart('chat-panel').then(panel => {
      panel.clear();
      panel.feed(widget_chat);
      this.chatWidget = panel.children.last();
    });
  }

  /**
   * Start an audio or video call with the currently selected peer.
   * Routes 1:1 contacts to window_connect (ringing) and share rooms to window_meeting.
   * @param {Boolean} isVideo
   */
  _startCall(isVideo) {
    const peer = this.activePeer;
    if (!peer) return;

    const existing =
      Wm.getItemByKind('window_connect') || Wm.getItemByKind('window_meeting');
    if (existing) {
      Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
      return;
    }

    const name = peer.display
      || peer.fullname
      || `${peer.firstname || ''} ${peer.lastname || ''}`.trim();

    if (this.activePeerType === _a.share) {
      Wm.launch({
        kind: 'window_meeting',
        hub_id: peer.entity_id,
        nid: peer.nid,
        room_id: peer.nid,
        filename: name,
        display: name,
        video: isVideo ? 1 : 0,
        audio: 1,
      }, { explicit: 1, singleton: 1 });
      return;
    }

    // Contact items in chat-p2p often carry only `entity_id`; `drumate_id` is
    // null for users who chat with us but aren't saved as a contact yet.
    // window_connect uses callee.drumate_id verbatim as the server's
    // `guest_id`, so without this fallback the invite reaches the SQL proc
    // as guest_id=null → 0 active sockets → caller sees "is not currently
    // online" even when the peer is online. Mirror the same fallback used
    // for peer_id in openChat() above.
    const drumate_id = peer.drumate_id || peer.entity_id;
    Wm.launch({
      kind: 'window_connect',
      hub_id: Visitor.id,
      nid: (peer.home && peer.home.home_id) || peer.nid,
      filename: name,
      display: name,
      callee: { ...peer, drumate_id, uid: peer.uid || drumate_id },
      video: isVideo ? 1 : 0,
      audio: 1,
    }, { explicit: 1, singleton: 1 });
  }

  /**
   * Open the chat for a peer by drumate_id (used by external callers, e.g. mention click).
   * Waits for the contact list to load, then triggers the matching item.
   * @param {String} drumate_id
   */
  openChatByPeerId(drumate_id, message_id) {
    if (!drumate_id) return;
    const tryOpen = (retries = 20) => {
      this.ensurePart('contact-list').then(list => {
        const items = (list.children && list.children.toArray) ? list.children.toArray() : [];
        const match = items.find(it => it.mget && it.mget(_a.drumate_id) == drumate_id);
        if (match) {
          this.openChat(match);
          if (message_id) {
            setTimeout(() => {
              if (this.chatWidget && this.chatWidget.scrollToMessage) {
                this.chatWidget.scrollToMessage(message_id);
              }
            }, 800);
          }
          return;
        }
        if (retries > 0) setTimeout(() => tryOpen(retries - 1), 200);
      });
    };
    tryOpen();
  }

  /**
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    // trigger.service is the JS property set by widget_chat before calling
    // triggerHandlers — args.service is absent when widget_chat passes raw args.
    const service = args.service || trigger.get(_a.service) || trigger.service;
    switch (service) {
      case 'load-conversation':
        return this.openChat(trigger);

      case 'video-call':
        return this._startCall(true);

      case 'audio-call':
        return this._startCall(false);

      case 'close-chat':
        Desk.togglePanel('chat_p2p', 'chat-panel');
        break;

      case 'filter-all':
        this._activeFilter = 'all';
        this._applyFilter();
        break;

      case 'filter-unread':
        this._activeFilter = 'unread';
        this._applyFilter();
        break;

      case 'filter-mentions':
        this._activeFilter = 'mentions';
        this._applyFilter();
        break;

      case 'toggle-compose':
        this._toggleComposePopup();
        break;

      case 'compose-search': {
        const v = (args && (args.value || (args.target && args.target.value))) || (trigger.getValue && trigger.getValue()) || "";
        this._filterComposeList(v);
        break;
      }

      case 'compose-pick':
        this._toggleComposePopup(false);
        return this.openChat(trigger);

      case 'forward-message': {
        // In chat-p2p there is no intermediate chat_room widget, so `trigger`
        // is widget_chat itself (it holds _selectedMessages, hubId, peerId).
        // window_bigchat uses cmd.source because chat_room sets source=widget_chat
        // before bubbling up; here we skip that extra hop.
        const chatWidget = trigger;
        if (!chatWidget || !chatWidget._selectedMessages) return;
        this.ensurePart('overlay-wrapper').then(overlay => {
          overlay.el.dataset.mode = _a.open;
          this.ensurePart('wrapper-chat-overlay').then(chatOverlay => {
            chatOverlay.feed({
              kind: 'widget_chat_item_forward',
              source: trigger,
              messages: chatWidget._selectedMessages,
              msghubID: chatWidget.hubId,
              peer_id: chatWidget.peerId || '',
            });
          });
        });
        return;
      }

      case 'close-overlay': {
        this.ensurePart('overlay-wrapper').then(overlay => {
          overlay.el.dataset.mode = _a.closed;
          this.ensurePart('wrapper-chat-overlay').then(chatOverlay => {
            chatOverlay.clear();
            chatOverlay.el.dataset.state = _a.closed;
          });
        });
        return;
      }

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    switch (service) {
      case SERVICE.chat.post:
      case SERVICE.channel.post:
        this._updateContactItemOnPost(data);
        break;
      case SERVICE.chat.acknowledge:
      case SERVICE.channel.acknowledge:
        this._resetContactItemCount(data);
        break;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  _updateContactItemOnPost(data) {
    const list = this.getPart && this.getPart('contact-list');
    if (!list || !data) return;

    // Message payload now has peer_id, but contact items (from chat_rooms)
    // still carry entity_id. Match by value.
    let item = list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.peer_id);
    item = item && item[0];
    if (!item && data.hub_id) {
      item = list.getItemsByAttr && list.getItemsByAttr('hub_id', data.hub_id);
      item = item && item[0];
    }
    if (!item) return;

    let room_count = item.mget('room_count') || 0;
    if (item.mget(_a.state) === 1) {
      room_count = 0;
    } else if (data.author_id !== Visitor.id) {
      room_count += 1;
    }

    let msg = data.message;
    if (_.isEmpty(msg) && data.is_attachment === 1) {
      msg = LOCALE.ATTACHMENT;
    }

    item.mset('room_count', room_count);
    item.mset(_a.message, msg);
    item.mset(_a.ctime, data.ctime);

    // Track has_mention: increment if this message mentions current user.
    // mention_ids may arrive as a JSON string from the DB — normalise first.
    if (data.author_id !== Visitor.id) {
      let mentionIds = data.mention_ids || [];
      if (typeof mentionIds === 'string') {
        try { mentionIds = JSON.parse(mentionIds); } catch (e) { mentionIds = []; }
      }
      const isMentioned = Array.isArray(mentionIds)
        ? mentionIds.some(id => String(id) === String(Visitor.id))
        : false;
      if (isMentioned) {
        item.mset('has_mention', ~~(item.mget('has_mention') || 0) + 1);
        const senderName = (data.firstname || data.surname || '').trim();
        const msg = senderName
          ? `${senderName} ${LOCALE.MENTIONED_YOU}`
          : LOCALE.MENTIONS;
        Wm.alert(msg, 3000);
      }
    }

    if (item.__message) item.__message.set(_a.content, msg);
    if (item.__msgTime) {
      const t = Dayjs.unix(data.ctime).locale(Visitor.language()).format("HH:mm");
      item.__msgTime.set(_a.content, t);
    }
    if (_.isFunction(item.updateNotification)) item.updateNotification();

    if (list.collection && list.collection.sort) list.collection.sort();
    this._applyFilter();
  }

  _applyFilter() {
    const list = this._contactList;
    if (!list || !list.children) return;
    const filter = this._activeFilter || 'all';
    let visible = 0;
    list.children.forEach(item => {
      if (!item.el) return;
      if (filter === 'all') {
        item.el.style.display = '';
        visible += 1;
        return;
      }
      const count = ~~(item.mget('room_count') || 0);
      if (filter === 'unread') {
        const show = count > 0;
        item.el.style.display = show ? '' : 'none';
        if (show) visible += 1;
      } else if (filter === 'mentions') {
        const hasMention = ~~(item.mget('has_mention') || 0) > 0;
        item.el.style.display = hasMention ? '' : 'none';
        if (hasMention) visible += 1;
      }
    });
    // Show "All read" only when the user is on the Unread tab and nothing
    // matches (i.e. there ARE rooms, just none with unread messages).
    if (this._allReadEmpty && this._allReadEmpty.el) {
      const showAllRead = filter === 'unread' && visible === 0 && list.children.length > 0;
      this._allReadEmpty.el.dataset.state = showAllRead ? 1 : 0;
    }
  }

  _resetContactItemCount(data) {
    const list = this.getPart && this.getPart('contact-list');
    if (!list || !data) return;
    // Message payload has peer_id, contact items have entity_id.
    let item = list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.peer_id);
    item = item && item[0];
    if (!item) return;
    item.mset('room_count', 0);
    item.mset('has_mention', 0);
    if (_.isFunction(item.updateNotification)) item.updateNotification();
    this._applyFilter();
  }
}

module.exports = __chat_p2p
