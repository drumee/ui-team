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
      flag: this._filter,
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
        if (child.collection) {
          child.collection.comparator = item => -item.get(_a.ctime);
        }
        child.once(_e.eod, async () => {
          this.el.dataset.anim = "in";
          await Kind.waitFor('widget_chat')
          const peer = child.children.first()
          this.openChat(peer)
        })
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Opens the chat for the selected contact.
   * @param {View} contact - The selected chat_contact_item view
   */
  openChat(contact) {
    const peer_id = contact.mget(_a.drumate_id);
    this.ensurePart('chat-header').then(header => {
      header.feed(require('./skeleton/chat-header')(this, contact));
    });
    this.debug("AAA:69", contact.getAvatarHtml())
    if (this.chatWidget && !this.chatWidget.isDestroyed()) {
      this.chatWidget.reload(contact);
      return;
    }
    this.ensurePart('chat-panel').then(panel => {
      panel.feed({
        kind: 'widget_chat',
        area: _a.personal,
        hub_id: Visitor.id,
        peer_id,
      });
      this.chatWidget = panel.children.last()
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
        this.el.dataset.anim = "out";
        setTimeout(() => {
          this.suppres()
        }, 500)
        break;

      case 'filter-all':
        this._filter = _a.all;
        this.ensurePart('contact-list').then(list => list.refresh && list.refresh());
        break;

      case 'filter-unread':
        this._filter = 'unread';
        this.ensurePart('contact-list').then(list => list.refresh && list.refresh());
        break;

      case 'filter-mentions':
        this._filter = 'mentions';
        this.ensurePart('contact-list').then(list => list.refresh && list.refresh());
        break;

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    switch (service) {
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }
}

module.exports = __chat_p2p
