class __chat_p2p extends LetcBox {

  constructor(...args) {
    super(...args);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.openChat = this.openChat.bind(this);
  }

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._radioId = `peer-${this.mget(_a.widgetId)}`;
    this._filter = _a.contact;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
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
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
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
   * Open the chat for a peer by drumate_id (used by external callers, e.g. mention click).
   * Waits for the contact list to load, then triggers the matching item.
   * @param {String} drumate_id
   */
  openChatByPeerId(drumate_id) {
    if (!drumate_id) return;
    const tryOpen = (retries = 20) => {
      this.ensurePart('contact-list').then(list => {
        const items = (list.children && list.children.toArray) ? list.children.toArray() : [];
        const match = items.find(it => it.mget && it.mget(_a.drumate_id) == drumate_id);
        if (match) {
          this.openChat(match);
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
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'load-conversation':
        return this.openChat(trigger);

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

    let item = list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.entity_id);
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

    if (item.__message) item.__message.set(_a.content, msg);
    if (item.__msgTime) {
      const t = Dayjs.unix(data.ctime).locale(Visitor.language()).format("HH:mm");
      item.__msgTime.set(_a.content, t);
    }
    if (_.isFunction(item.updateNotification)) item.updateNotification();

    if (list.collection && list.collection.sort) list.collection.sort();
  }

  _applyFilter() {
    const list = this._contactList;
    if (!list || !list.children) return;
    const filter = this._activeFilter || 'all';
    list.children.forEach(item => {
      if (!item.el) return;
      if (filter === 'all') {
        item.el.style.display = '';
        return;
      }
      const count = ~~(item.mget('room_count') || 0);
      if (filter === 'unread') {
        item.el.style.display = count > 0 ? '' : 'none';
      } else if (filter === 'mentions') {
        const msg = item.mget(_a.message) || '';
        const hasMention = /\[@[^\]]+\]\(user:[^)]+\)/.test(msg) && count > 0;
        item.el.style.display = hasMention ? '' : 'none';
      }
    });
  }

  _resetContactItemCount(data) {
    const list = this.getPart && this.getPart('contact-list');
    if (!list || !data) return;
    let item = list.getItemsByAttr && list.getItemsByAttr(_a.entity_id, data.entity_id);
    item = item && item[0];
    if (!item) return;
    item.mset('room_count', 0);
    if (_.isFunction(item.updateNotification)) item.updateNotification();
  }
}

module.exports = __chat_p2p
