const __window_bigchat_interact = require('window/interact/singleton');

const MAX_CONTENT = 'max-content';
class ___window_bigchat extends __window_bigchat_interact {
  constructor(...args) {
    super(...args);
    this.reload = this.reload.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.openContactManager = this.openContactManager.bind(this);
    this._toogleSearchBar = this._toogleSearchBar.bind(this);
    this.loadContactView = this.loadContactView.bind(this);
    this.openShareRoomChat = this.openShareRoomChat.bind(this);
    this.openChatRoom = this.openChatRoom.bind(this);
    this._loadSearchResults = this._loadSearchResults.bind(this);
    this.loadNoDiscussion = this.loadNoDiscussion.bind(this);
    this.forwardMessage = this.forwardMessage.bind(this);
    this.closeOverlay = this.closeOverlay.bind(this);
    this.previousBreadcrumb = this.previousBreadcrumb.bind(this);
    this.nextBreadcrumb = this.nextBreadcrumb.bind(this);
    this.refreshNotify = this.refreshNotify.bind(this);
    this._removeRoomFromList = this._removeRoomFromList.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
    this.updateNotificationCount = this.updateNotificationCount.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    this.acceptMedia = 1;
    let height, width;
    require('./skin');
    super.initialize(opt);
    this._view = _a.medium;
    this._state = 0;
    this.activeNodes = {};
    this._attachmentList = [];
    this.initialLoad = true
    if (Visitor.isMobile()) {
      this.style.set({
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
      });
    } else {
      width = _K.iconWidth * 6.5;
      height = window.innerHeight - 138;
      this.style.set({
        left: window.innerWidth - width - Wm.$el.offset().left - 10,
        top: window.innerHeight - height - 75,
        height,
        width
      });
    }

    if (this.mget(_a.source)) {
      this.minimizeLocation = {
        left: this.mget(_a.source).$el.offset().left - 20
      };
    }

    this.currentPageListCount = 0;
    this._setSize({ minHeight: 150 });
    this.declareHandlers();
    this.refreshNotify();
    this.bindEvent(_a.live);
    this.router = {};
    this.router.page = 'all-conversations';
    this.contextmenuSkeleton = 'a';
    if (this.mget(_a.args)) {
      this.router = this.mget(_a.args);
    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'contact-breadcrumbs-container':
        return this.contactBreadcrumbsContainer = child;
      case 'chat_contact_list':
        return this.waitElement(child.el, () => {
          child.on('change:room_count', (count) => {
            this.currentPageListCount = count;
          })
        })

      case _a.content:
        this.raise();
        this._content = child;
        return this.loadContentView();

      case MAX_CONTENT:
        return this.loadChatRoom(child);

      default:
        return super.onPartReady(child, pn);
    }
  }

  /**
   * 
   * @param {*} args 
   */
  reload(args) {
    this.router = null;
    if (args) {
      this.mset(_a.args, args);
      this.router = args;
    }

    this.initialLoad = true;

    this.loadContentView();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    super.onDomRefresh();
    this.bindNotificationCenterEvent();
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.service || cmd.get(_a.name);
    if (pointerDragged) { return; }

    switch (service) {
      case 'open-contact':
        return this.openContactManager(cmd);

      case 'previous-page':
        this.previousBreadcrumb(cmd.source);
        return this.refreshNotify();

      case 'next-page':
        this.nextBreadcrumb(cmd.source);
        return this.refreshNotify();

      case 'toggle-search-bar':
        return this._toogleSearchBar();

      case 'close-search-bar':
        this.getPart('search-bar-input').setValue('');
        return this.getPart(_a.search).el.dataset.mode = _a.closed;

      case 'show-contact-list':
        const tag = cmd.source;
        const tagId = tag.mget('tag_id') || null;
        if (!(['all-contacts', 'contact'].includes(this.router.page))) {
          this.router.page = 'team-room';
        }
        this.loadContactView(cmd.source);
        return this.refreshNotify();

      case 'show-all-conversations-list':
        if (!(['contact', 'team-room'].includes(this.router.page))) {
          this.router.page = 'all-conversations';
        }
        this.loadContactView(cmd.source);
        return this.refreshNotify();

      case 'show-shareroom-list':
        this.router.page = 'team-room';
        this.loadContactView(cmd.source);
        return this.refreshNotify();

      case 'open-privateroom-chat':
        return this.openChatRoom(cmd);

      case 'open-search-privateroom-chat':
        return this.openSearchChatRoom(cmd);

      case _e.search:
        return this._loadSearchResults(cmd);

      case 'forward-message':
        return this.forwardMessage(cmd);

      case 'close-overlay':
        return this.closeOverlay(cmd);

      case 'remove-room-from-list':
        return this._removeRoomFromList(cmd);

      case 'select-contact':
        return this.highlightContact(args);

      case _e.error:
        if (args.message) this.warning(args.message);
        return


      default:
        return super.onUiEvent(cmd);



    }
  }

  /**
   * 
   */
  highlightContact(args) {
    let c = this.ensurePart('chat_contact_list').then((p) => {
      let i = 0;
      let l = setInterval(() => {
        i++;
        if (i > 20) {
          clearInterval(l);
        }
        let items = p.getItemsByAttr(_a.entity_id, args.entity_id);
        if (items.length) {
          clearInterval(l);
          items[0].setState(1);
        }
      }, 500)

    })

  }

  /**
   * @param {*} cmd
  */
  openContactManager(cmd) {
    const type = cmd.mget(_a.type);
    const source = Wm.__dock.__addressbookLauncher;
    const route = { page: type };
    let kind = 'window_addressbook';
    if (type == "invite") {
      kind = 'window_contact';
    }
    const w = Wm.getItemsByKind(kind)[0];

    if (w && !w.isDestroyed()) {
      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          w.wake(source);
        }
        w.raise();
        w.reload(route);
      }

      _.delay(f, 100);
      return false;
    }

    Wm.launch({ kind: kind, args: route }, { explicit: 1, singleton: 1 })
    return;
  }

  /**
   * 
   */
  loadContentView() {
    this.__content.feed(require("./skeleton/content")(this));
    _.delay(this.setupInteract.bind(this), 1000);
  }

  /**
  * 
  */
  loadChatRoom(child) {
    this.waitElement(child.el, () => {
      this.responsive('', _a.none);
    });
    const shareRoomChat = {
      kind: 'chat_room',
      type: 'private-room',
      uiHandler: this
    };
    child.feed({ kind: _a.spinner });
    Kind.waitFor('chat_room').then(async () => {
      await Kind.waitFor('widget_chat');
      child.feed(shareRoomChat);
      let room = child.children.last();
    })
  }

  /**
   * 
   * @returns 
   */
  _toogleSearchBar() {
    const {
      mode
    } = this.getPart(_a.search).el.dataset;

    if (mode === _a.open) {
      this.__searchBarInput.setValue('');
      this.getPart('search-result').clear();
      return this.getPart(_a.search).el.dataset.mode = _a.closed;
    } else {
      this.getPart(_a.search).el.dataset.mode = _a.open;
      return this.getPart('search-bar-input').focus();
    }
  }

  /**
   * 
   * @param {*} tag 
   * @returns 
   */
  loadContactView(tag = null) {
    const tagId = tag.mget('tag_id') || null;
    const tagName = tag.mget(_a.name) || null;
    const _flag = tag.mget(_a.flag) || _a.all;
    const _option = tag.mget(_a.option) || _a.active;
    const _origin = tag.mget(_a.origin) || _a.allContacts;

    this._tagId = tagId;
    this._origin = _origin;
    const contacts = {
      kind: "chat_contact_list",
      className: "chat_contact_list",
      sys_pn: 'chat_contact_list',
      source: tag,
      flag: _flag,
      option: _option,
      origin: _origin,
      tag: {
        tag_id: tagId,
        name: tagName
      }
    };

    this.activeNodes['panel2'] = {
      mode: _a.tag,
      source: tag
    };

    if ((this._view === _a.min) || (this._view === _a.medium)) {
      this.updateInstance(this.viewInstance = 2);
    }

    return this.getBranch('contact-wrapper').feed(contacts);
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  openShareRoomChat(cmd) {
    const source = cmd.source || this.source;
    if (!source.mget('id')) {
      this.loadNoDiscussion();
      return;
    }

    const shareRoomChat = {
      kind: 'chat_room',
      //className: 'share-room__chat',
      type: 'share-room',
      source
    };

    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 2);
    } else if (this._view === _a.medium) {
      this.updateInstance(this.viewInstance = 1);
    }

    this.getBranch(MAX_CONTENT).feed(shareRoomChat);
  }

  /**
   * openChatRoom - to load the private room chat view
   * @param {*} cmd 
   * @returns 
   */
  openChatRoom(cmd) {
    const source = cmd.source || this.source;

    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 3);
    } else if (this._view === _a.medium) {
      this.updateInstance(this.viewInstance = 2);
    }

    if (this.currentEntityId && (this.currentEntityId === source.mget('entity_id'))) {
      return;
    }

    this.currentEntityId = source.mget('entity_id');
    if (!this.currentEntityId) {
      this.currentTag = cmd.mget(_a.origin);
      this.loadNoDiscussion();
      return;
    }

    const shareRoomChat = {
      kind: 'chat_room',
      //className: 'share-room__chat',
      type: 'private-room',
      source
    };

    this.getBranch(MAX_CONTENT).feed(shareRoomChat);
  }

  /**
   * @param {*} cmd
  */
  openSearchChatRoom(cmd) {
    const source = cmd.source || this.source;

    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3);
    } else if (this._view == _a.medium) {
      this.updateInstance(this.viewInstance = 2);
    }

    if (this.currentEntityId && (this.currentEntityId == source.mget(_a.entity_id))) {
      return;
    }

    if (_.isEmpty(this.__chatContactList.getItemsByAttr(_a.entity_id, source.mget(_a.entity_id)))) {
      this.__chatContactList.getItemsByAttr(_a.entity_id, this.currentEntityId)[0].el.dataset.radio = _a.off; //to unselect the prev selected item
      return this.openChatRoom({ source });
    } else {
      this.__chatContactList.triggerClick(source.mget(_a.entity_id));
      return this.currentEntityId = source.mget(_a.entity_id);
    }
  }


  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _loadSearchResults(source) {
    const val = source.getData(_a.formItem).value;
    if (val.length < 2) {
      return;
    }

    const dataOpt = {
      kind: 'widget_search',
      className: "search-result-box",
      search: val,
      type: _a.chat
    };

    this.getPart('search-result').feed(dataOpt);
    return this.getPart(_a.search).el.dataset.mode = _a.open;
  }

  /**
   * 
   * @returns 
   */
  loadNoDiscussion() {
    let content;
    if (this.currentTag === _a.archived) {
      content = require('./skeleton/common/no-archives-content')(this);
    } else {
      content = require('./skeleton/common/no-discussion-content')(this);
    }

    return this.getBranch(MAX_CONTENT).feed(content);
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  forwardMessage(cmd) {
    if (cmd == null) { cmd = {}; }
    const {
      source
    } = cmd;
    const overlayWrapper = this.getPart('overlay-wrapper');
    const chatOverlay = this.getPart('wrapper-chat-overlay');
    const chatFrwd = {
      kind: 'widget_chat_item_forward',
      source: cmd,
      messages: source._selectedMessages,
      msghubID: source.hubId
    };

    overlayWrapper.el.dataset.mode = _a.open;
    return chatOverlay.feed(chatFrwd);
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  closeOverlay(cmd) {
    if (cmd == null) { cmd = {}; }
    const overlayWrapper = this.getPart('overlay-wrapper');
    const chatOverlay = this.getPart('wrapper-chat-overlay');
    chatOverlay.clear();
    overlayWrapper.el.dataset.mode = _a.closed;
    return chatOverlay.el.dataset.state = _a.closed;
  }

  /**
   * 
   * @returns 
   */
  previousBreadcrumb() {
    let viewInstance = this.viewInstance || 1;
    if (viewInstance > 1) {
      viewInstance = viewInstance - 1;
    }
    return this.updateInstance(viewInstance);
  }

  /**
   * 
   * @returns 
   */
  nextBreadcrumb() {
    let viewInstance = this.viewInstance || 1;
    if (viewInstance < 3) {
      viewInstance = viewInstance + 1;
    }
    return this.updateInstance(viewInstance);
  }

  /**
   * 
   */
  refreshNotify() {
    /** DO NOT DELETE */
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _removeRoomFromList(cmd) {
    let peer = cmd.peer || {};
    const roomId = peer.contact_id || peer.entity_id;
    const roomList = this.getItemsByKind('chat_contact_list')[0];
    roomList.deleteRoomItemById(roomId);
    const f = () => {
      return roomList.triggerClick();
    };
    return _.delay(f, Visitor.timeout(500));
  }



  /**
   * 
   * @param {*} newSize 
   * @param {*} oldSize 
   */
  sizeUpdated(newSize, oldSize) {
    this.updateNotificationCount();
  }

  /**
   * @param {number} viewInstance 
   */
  updateInstance(viewInstance) {
    super.updateInstance(viewInstance);
    this.updateNotificationCount();
  }

  /**
   * 
   */
  updateNotificationCount(args) {
    let data;
    if(args){
      this.chatNotificationCount = args;
      this.tagNotificationList = args.tags; 
      data = args;
    }else{
      if(!this.chatNotificationCount) return;
      data = this.chatNotificationCount;
    }

    this.ensurePart("all_conversations_counter").then((p)=>{
      this.updateCounter(p, data.allConversationsCount);
    })
    this.ensurePart("contact_counter").then((p)=>{
      this.updateCounter(p, data.contactChatCount);
    })
    this.ensurePart("team_counter").then((p)=>{
      this.updateCounter(p, data.teamChatCount);
    })
    this.updateBackButtonCounter();
  }

  /**
   * updateBackButtonCounter 
   * 
   * | instence  | min    | medium | max    |
   * |-----------|--------|--------|--------|
   * | 1         | 0      | 0      | 0      |
   * | 2         | filter | filter | filter |
   * | 3         | total  | 0      | 0      |
   * 
   * Total Count => contactChatCount + teamChatCount
   * 
   * Filter Logic 
   *  all-conversations => 0
   *  contacts          => teamChatCount 
   *  Team room         => contactChatCount
   *  Tag Page          => contactChatCount + teamChatCount - "Current Page Count"
   *  Archive Page      => contactChatCount + teamChatCount
   *  support           => contactChatCount + teamChatCount
   * 
   * Page router 
   *     => ['all-contacts','contact'] => Contact List 
   *     => ['team-room']              => Team Room Page 
   *     => ['support-list']           => Support List Page 
   * 
   * chatNotificationCount = { totalChatCount:0, contactChatCount:1, teamChatCount:5, supportCount:1 }
   * 
   */
  updateBackButtonCounter() {
    if (!this.__backButtonCounter) {
      return
    }

    let windowSize = this.el.dataset.size;
    let page = this.router.page;
    let viewInstance = this.viewInstance;
    let count = 0;
    let data = this.chatNotificationCount;
    let totalChatCount = data.contactChatCount + data.teamChatCount;


    if (windowSize == _a.min && viewInstance == 3) {
      count = totalChatCount;
    }

    if (viewInstance == 2 && this._origin) {
      // all contacts 
      if (this._origin == 'all-conversations') {
        count = 0;
      }
      // all contacts 
      if (this._origin == 'all-contacts' && (!this._tagId)) {
        count = data.teamChatCount;
      }

      // Team or share  
      if (this._origin == 'share') {
        count = data.contactChatCount;
      }

      // tag page 
      if (this._origin != 'all-conversations' && this._tagId) {
        let currentTagCount = this.tagNotificationList[this._tagId] || 0;
        count = totalChatCount - currentTagCount;
      }

      // Archive list 
      if (this._origin == 'archived') {
        count = totalChatCount;
      }

    }
    this.updateCounter(this.__backButtonCounter, count)
  }

  /**
   * updateCounter
   * @param {LETC} counter 
   * @param {number} count 
   */
  updateCounter(counter, count) {
    if (count < 0) {
      count = 0;
    }
    if (count > 9) {
      count = '9+';
    }
    counter.model.set(_a.content, count)
    if (count == 0) {
      counter.el.hide()
    } else {
      counter.render()
      counter.el.show()
    }
  }

  /**
   * 
   */
  getNotificationCount() {
    if (this.chatNotificationCount) {
      return this.chatNotificationCount;
    }
  }


  /**
   * @param {String} service 
   * @param {Object} data 
   * @param {Object} options
   * @returns 
   */
  onWsMessage(service, data, options) {
    switch (options.service) {
      case SERVICE.contact.invite_accept:
      case SERVICE.contact.delete_contact:
        return this.fetchService({
          service: SERVICE.chat.chat_room_info,
          key: data.entity || data.contact_id || data.drumate_id,
          hub_id: Visitor.get(_a.id)
        }).then(resData => {
          const chatContactList = this.getItemsByKind('chat_contact_list')[0];
          let addedData = {
            ...resData
          }
          const item = chatContactList.getItemsByAttr('entity_id', addedData.entity_id)[0];
          if (item && (item.mget(_a.state) || (item.el.dataset.radio === _a.on))) {
            this.currentEntityId = null;
          }
          if (service === SERVICE.contact.delete_contact) {
            return chatContactList.updateContactItem(addedData);
          }
          return chatContactList.addorUpdateContactItem(addedData);
        });

    }
  }


}


module.exports = ___window_bigchat;
