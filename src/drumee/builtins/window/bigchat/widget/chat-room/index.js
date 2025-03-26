
// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : ./src/drumee/builtins/window/bigchat/widget/chat-room/index
//   TYPE : Component
// ==================================================================== *

//########################################
const MAX_CONTENT = 'max-content';

class ___chat_room extends LetcBox {
  constructor(...args) {
    super(...args);
    this.routeContent = this.routeContent.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    //this._fetchHomeData = this._fetchHomeData.bind(this);
    this._openWindowConnect = this._openWindowConnect.bind(this);
    this.openContactManager = this.openContactManager.bind(this);
    this._openOverlayWrapper = this._openOverlayWrapper.bind(this);
    this._feedOverlayWrapper = this._feedOverlayWrapper.bind(this);
    this._archiveChat = this._archiveChat.bind(this);
    this._unArchiveChat = this._unArchiveChat.bind(this);
    this._toggleArchiveChat = this._toggleArchiveChat.bind(this);
    this._toggleArchiveAcknowledgement = this._toggleArchiveAcknowledgement.bind(this);
    this._updateTicketStatus = this._updateTicketStatus.bind(this);
    this._closeOverlay = this._closeOverlay.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.mset({ className: 'share-room__chat' });
    this.tagsSelected = [];
    this.declareHandlers();

  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case 'load_chat_header':
        return this.waitElement(child.el, child.feed(require('./skeleton/common/header')(this)));

      case 'load_chat_content':
        return this.waitElement(child.el, this.routeContent(this.mget(_a.type)));

      case 'load_chat_footer':
        if (this.mget(_a.type) === 'share-room-detail') {
          return this.waitElement(child.el, child.feed(require('./skeleton/common/shareroom-detail-footer')(this)));
        }
        break;
    }
  }


  /**
   * 
   * @param {*} type 
   * @returns 
   */
  async routeContent(type) {
    let widget_chat;
    this.mset(_a.type, type);
    const content = await this.ensurePart('load_chat_content');

    switch (type) {
      case _a.privateRoom:
        widget_chat = {
          kind: 'widget_chat',
          className: 'share-room-widget__chat',
          type: _a.private,
          view: 'bigChat',
          hub_id: this.hubID,
          peer: this.peer
        };
        break;

      case _a.shareRoom:
        widget_chat = {
          kind: 'widget_chat',
          className: 'share-room-widget__chat',
          type: _a.share,
          view: 'bigChat',
          hub_id: this.hubID
        };

        if (this.getPart('load_chat_footer')) {
          this.getPart('load_chat_footer').feed('');
        }
        break;

      case _a.ticketRoom:
        widget_chat = {
          kind: 'widget_chat',
          className: 'ticket-room-widget__chat',
          type: _a.ticket,
          view: 'bigChat',
          hub_id: this.hubID,
          ticket_id: this.peer.ticket_id,
          peer: this.peer
        };
        break;

      case 'share-room-detail':
        widget_chat = {
          kind: 'widget_shareroom_detail',
          hub_id: this.hubID
        };

        this.getPart('load_chat_footer').feed(require('./skeleton/common/shareroom-detail-footer')(this));
        break;

      case _a.supportTicket:
        widget_chat = {
          kind: 'widget_chat',
          className: 'create-ticket-room-widget__chat',
          type: _a.supportTicket,
          view: 'bigChat',
          hub_id: this.hubID
        };
        break;

      default:
        this.debug('invalid type loaded');
        return
    }
    //this.debug("AAA:148", widget_chat, this.peer);
    content.feed(widget_chat);
  }

  /**
   * 
   * @returns 
   */
  async prepare() {
    if (this.mget(_a.source)) {
      this.peer = this.mget(_a.source).toLETC();
      delete this.peer.kids;
      delete this.peer.uiHandler;
      this.hubID = this.peer.entity_id;
      this.entityId = this.peer.contact_id || this.peer.entity_id;
      if (this.peer.flag == 'share') {
        let home = await this.fetchService(SERVICE.media.home,
          { hub_id: this.hubID }, { async: 1 });
        this.peer.home = home;
        this.peer.nid = home.home_id;
      }
    } else {
      let rooms = await this.fetchService(SERVICE.chat.chat_rooms, {
        hub_id: Visitor.id,
        flag: this.mget('flag') || 'all',
        option: _a.active
      })
      //this.debug("AAAA:AAA:2229", rooms);
      if (rooms && !rooms[0]) {
        this.peer = {}
      } else {
        this.peer = rooms[0];
      }
      this.hubID = this.peer.entity_id;
      this.entityId = this.peer.contact_id || this.hubID;
      if(!this.entityId){
        this.mset(_a.type, _a.privateRoom);
        return;
      }
      this.triggerHandlers({ ...this.peer, service : 'select-contact' });
    }

    switch (this.peer.flag) {
      case _a.contact:
        return this.mset(_a.type, _a.privateRoom);
      case _a.share:
        return this.mset(_a.type, _a.shareRoom);
      case _a.support:
        return this.mset(_a.type, _a.supportTicket);
    }

  }

  /**
   * 
   */
  onDomRefresh() {
    this._parent = this.getParentByKind('window_bigchat');
    this.prepare().then(() => {
      this.feed(require('./skeleton')(this));
    }).catch((e) => {
      this.warn("Caught error", e);
    })
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = cmd.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'trigger-tag-select':
        return;

      case 'save-tag':
        this.saveTag();
        return;

      case undefined:
        // for closing the emoji popup when clicked outside
        var messgengerPopup = this.getItemsByKind('messenger')[0];
        if (messgengerPopup && !messgengerPopup.__wrapperPopup.isEmpty()) {
          messgengerPopup.__wrapperPopup.clear();
        }

        return;

      case 'copy-contact':
        return this.debug("Coming soon !!!");

      case 'load-shareroom-detail':
        return this.routeContent('share-room-detail');

      case 'back-to-sharerooom-chat':
        return this.routeContent('share-room');

      case 'open-contact':
        return this.openContactManager(cmd);

      case 'open-shareroom':
        var o = this.mget(_a.source).model.toJSON();
        Wm.launch({
          hub_id: o.entity_id,
          filename: o.display,
          type: 'folder',
          outbound: o,
          api: {
            service: SERVICE.media.attributes,
            hub_id: o.entity_id
          }
        });
        return true;

      case 'connect':
        return this._openWindowConnect(cmd);

      case _a.archived:
        return this._archiveChat();

      case 'unarchive':
        return this._unArchiveChat();

      case 'toggle-archive-chat':
        return this._toggleArchiveChat(cmd);

      case 'update-ticket-status':
        return this._updateTicketStatus(cmd);

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers({ service });
        return this.service = '';
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _openWindowConnect(cmd) {
    const callee = this.peer;
    const name = this.peer.display;
    const type = this.peer.flag;

    const w = Wm.getItemByKind('window_connect') || Wm.getItemByKind('window_meeting');
    if (w) {
      Wm.alert(LOCALE.ALREADY_ANOTHER_CALL)
      return;
    }
    const opt = {
      kind: cmd.get(_a.respawn),
      hub_id: this.peer.hub_id,
      nid: this.peer.nid,
      filename: name,
      display: name,
      callee
    };
    return Wm.launch(opt, { explicit: 1, singleton: 1 });
  }



  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  openContactManager(cmd) {
    const o = cmd.model.toJSON();
    const route = cmd.mget('route') || {};
    const w = Wm.getItemsByKind('window_addressbook')[0];
    const source = Wm.__dock.__addressbookLauncher;

    if (w && !(w.isDestroyed())) {
      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          w.wake(source);
        }
        w.raise();
        w.reload(route);
        return w.triggerHandlers();
      };
      _.delay(f, 100);
      return false;
    }

    Wm.launch({ kind: 'window_addressbook', args: route }, { explicit: 1, singleton: 1 });
  }

  /**
   * 
   * @param {*} opt 
   */
  _openOverlayWrapper(opt) {
    if (opt == null) { opt = {}; }
    const overlayWrapper = this._parent.getPart('overlay-wrapper');
    overlayWrapper.el.dataset.mode = _a.open;
    let maxContent = this._parent.getPart(MAX_CONTENT);
    if (maxContent && maxContent.updateStyle) {
      maxContent.updateStyle('z-index', '1');
      this._feedOverlayWrapper(opt);
    }
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _feedOverlayWrapper(opt) {
    if (opt == null) { opt = {}; }
    const dataOpt = require('./skeleton/common/action-popup/confirmation')(this, opt);

    return this._parent.getPart('wrapper-chat-overlay').feed(dataOpt);
  }

  /**
   * 
   */
  _archiveChat() {
    if ((this.peer != null ? this.peer.is_archived : undefined) === 0) {
      const opt = {
        type: _a.archived,
        confirmLabel: LOCALE.ARCHIVE,
        confirmService: 'toggle-archive-chat',
        headerContent: LOCALE.ARCHIVE_CONTACT_AND_CHAT,
        subtitleContent: LOCALE.CONFIRM_ARCHIVE_THE_CONTACT_AND_CHAT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   */
  _unArchiveChat() {
    if ((this.peer != null ? this.peer.is_archived : undefined) === 1) {
      const opt = {
        type: 'unarchive',
        confirmLabel: LOCALE.UNARCHIVE,
        confirmService: 'toggle-archive-chat',
        headerContent: LOCALE.UNARCHIVE_CONTACT_AND_CHAT,
        subtitleContent: LOCALE.CONFIRM_UNARCHIVE_THE_CONTACT_AND_CHAT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   * @param {*} cmd 
   */
  _toggleArchiveChat(cmd) {
    const contact = this.peer;
    if (this.entityId) {

      let _status = _a.archived;
      if (contact.is_archived == 1) {
        _status = _a.active;
      }

      const api = {
        service: SERVICE.chat.change_status,
        status: _status,
        entity_id: this.entityId,
        hub_id: Visitor.get(_a.id)
      };

      this.postService(api);
    }

  }

  /**
   * 
   * @returns 
   */
  _toggleArchiveAcknowledgement() {
    const contact = this.peer || {};

    let content = LOCALE.INFO_ARCHIVE_CONTACT_CHAT;
    if (contact.is_archived == 1) {
      content = LOCALE.INFO_ARCHIVE_CONTACT_CHAT;
    }

    this.source = contact;
    this.service = 'remove-room-from-list';
    this.triggerHandlers();

    const popupBodyContent = this._parent.getPart('popup-body-content');
    popupBodyContent.feed(require('./skeleton/common/action-popup/acknowledgement')(this, content));
    return this._closeOverlay();
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _updateTicketStatus(cmd) {
    const _status = cmd.mget(_a.status);

    const api = {
      service: SERVICE.channel.update_ticket,
      status: _status,
      ticket_id: this.peer.ticket_id,
      hub_id: Visitor.get(_a.id)
    };

    return this.postService(api);
  }

  /**
   * 
   * @returns 
   */
  _closeOverlay() {
    const f = () => {
      this.source = this;
      this.service = 'close-overlay';
      this.triggerHandlers();
      return this.service = '';
    };
    return _.delay(f, Visitor.timeout());
  }


  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.tagcontact.entity_assign:
        return this.debug("SERVICE.tagcontact.entity_assign", service, data, socket);

      case SERVICE.contact.change_status:
      case SERVICE.chat.change_status:
        return this._toggleArchiveAcknowledgement();

      case SERVICE.channel.update_ticket:
        this.respData = data[0];
        this.peer = respData;

        return this.getPart('load_chat_header').render();
    }
  }
}

module.exports = ___chat_room;
