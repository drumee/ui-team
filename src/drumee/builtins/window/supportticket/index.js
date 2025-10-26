// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/index.js
//   TYPE : Component
// ==================================================================== *

//########################################

const __window_support_ticket_interact = require('window/interact/singleton');

const MAX_CONTENT = 'max-content';
class ___window_support_ticket extends __window_support_ticket_interact {
  
  constructor(...args) {
    super(...args);
  }

  /**
   * @param {*} opt
  */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);

    this.acceptMedia = 1;
    let height, width;
    this._view = _a.medium;
    this._state = 0;
    this.activeNodes = {};
    this._attachmentList = [];

    if (Visitor.device() === _a.desktop) {
      width = _K.iconWidth * 5;
      height = _K.iconWidth * 4;
      this.style.set({
        left: window.innerWidth - width - Wm.$el.offset().left - 10,
        top: window.innerHeight - height - 75,
        height,
        width
      });
      this.el.dataset.size = _a.medium;
    } else {
      this.style.set({
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
      });
      this.el.dataset.size = _a.min;
    }

    if (this.mget(_a.source)) {
      this.minimizeLocation = {
        left: this.mget(_a.source).$el.offset().left - 20
      };
    }

    this._setSize();
    this.declareHandlers();
    this.refreshNotify();
    this.bindEvent(_a.live);

    this.bindNotificationCenterEvent();
    this.contextmenuSkeleton = 'a';

    this.initialLoad = true;
    this.router = {};
    this.router.page = 'all';
    if (this.mget(_a.args)) {
      return this.router = this.mget(_a.args);
    }
  }


  /**
   * @param {*} child
   * @param {*} pn
   * @param {*} section
  */
  onPartReady(child, pn, section) {
    this.raise();
    switch (pn) {
      case 'breadcrumbs-container':
        return this.breadcrumbsContainer = child;
      
      case 'support_ticket_list':
        this.debug('support ticket list')
        return this.waitElement(child.el, this.loadAfterWidgetTickets.bind(this), child);
      
      case _a.content:
        this._content = child;
        this.loadContentView();
        return _.delay(this.setupInteract.bind(this), 1000);
      
      case MAX_CONTENT:
        this._loadDefaultContent();
        return this.waitElement(child.el, this.loadAfterAllPartReady);

      default:
        return super.onPartReady(child, pn, section);
    }
  }

  /**
   * 
  */
  onDomRefresh () {
    this.feed(require('./skeleton')(this));
    return super.onDomRefresh();
  }

  /**
   * @param {*} args
  */
  reload (args) {
    this.router = null;
    if (args) {
      this.mset(_a.args, args);
      this.router = args;
    }

    this.initialLoad = true;

    this.loadContentView();
    return _.delay(this.setupInteract.bind(this), 1000);
  }

  
  /**
   * @param {*} widgetTickets
  */
  loadAfterWidgetTickets(widgetTickets) {
    let EOD = 'end:of:data';

    let f = () => {
      if (this.router && this.initialLoad && this.router.page != 'all') { 
        this.initialLoad = false;
        if (this.router.page == 'ticket' && this.router.ticket_id) {
          widgetTickets.triggerClick(this.router.ticket_id)
          return
        }
      }

      if (this._view == _a.max || this._view == _a.medium) {
        widgetTickets.triggerClick()
      }
    }

    widgetTickets.on(EOD, f);
    this.debug('its coming here 44444', this)
    widgetTickets.on('change:room_count', (count) => {
      this.currentPageListCount = count;
    })
  }

  /**
   *
  */
  loadContentView () {
    return this.__content.feed(require("./skeleton/content")(this));
  }

  /**
   * 
  */
  _loadDefaultContent() {
    //
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.service || cmd.get(_a.name);
    this.debug(`AAA:85 onUiEvent SERVICE=${service}`, cmd, this);

    if (pointerDragged) { return; }

    switch (service) {    
      case 'previous-page':
        this.previousBreadcrumb(cmd.source);
        return this.refreshNotify();

      case 'next-page':
        this.nextBreadcrumb(cmd.source);
        return this.refreshNotify();
        
      case 'toggle-search-bar':
        return this._toggleSearchBar();
      
      case _e.search:
        return this._loadSearchResults(cmd);
      
      case 'close-search-bar':
        this.getPart('search-bar-input').setValue('');
        return this.getPart(_a.search).el.dataset.mode = _a.closed;
      
      case 'open-ticketroom-chat':
        return this.openTicketRoom(cmd);
      
      case 'open-search-ticketroom-chat':
        return this.openSearchTicketRoomChat(cmd);
      
      case 'create-support-ticket':
        return this.createSupportTicket(cmd);
      
      case 'close-overlay':
        return this.closeOverlay(cmd);
      
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
  previousBreadcrumb() {
    let viewInstance = this.viewInstance || 1;
    if (viewInstance > 1) {
      viewInstance = viewInstance - 1;
    }
    return this.updateInstance(viewInstance);
  }

  /**
   *
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
  _toggleSearchBar () {
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
   * @param {*} source
  */
  _loadSearchResults(source) {
    const val = source.getData(_a.formItem).value;
    if (val.length < 1) {
      return;
    }

    const dataOpt = {
      kind      : 'widget_search',
      className : "search-result-box",
      search    : val,
      type      : _a.supportTicket
    };

    this.getPart('search-result').feed(dataOpt);
    return this.getPart(_a.search).el.dataset.mode = _a.open;
  }

  /**
   * @param {*} cmd
  */
  openTicketRoom(cmd) {
    const source = cmd.source || this.source;

    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3);
    } else if (this._view == _a.medium) {
      this.updateInstance(this.viewInstance = 2);
    }
    
    if (this.currentEntityId && (this.currentEntityId == source.mget('ticket_id'))) {
      return;
    }

    this.currentEntityId = source.mget('ticket_id');
    if (!this.currentEntityId) {
      this.loadNoTickets();
      return;
    }

    const shareRoomChat = {
      kind      : 'chat_room',
      className : 'share-room__chat',
      type      : _a.ticketRoom,
      source
    };

    return this.getBranch(MAX_CONTENT).feed(shareRoomChat);
  }

  /**
   * @param {*} cmd
  */
  openSearchTicketRoomChat(cmd) {
    const source = cmd.source || this.source;

    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3);
    } else if (this._view == _a.medium) {
      this.updateInstance(this.viewInstance = 2);
    }

    if (this.currentEntityId && (this.currentEntityId == source.mget(_a.ticketId))) {
      return;
    }

    if (_.isEmpty(this.__supportTicketList.getItemsByAttr(_a.ticketId, source.mget(_a.ticketId)))) {
      this.__supportTicketList.getItemsByAttr(_a.ticketId, this.currentEntityId)[0].el.dataset.radio = _a.off; //to unselect the prev selected item
      return this.openTicketRoom({source});
    } else {
      this.__supportTicketList.triggerClick(source.mget(_a.ticketId));
      return this.currentEntityId = source.mget(_a.ticketId);
    }
  }

  /**
   * @param {*} source
  */
  createSupportTicket(source) {
    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 3);
    } else if (this._view === _a.medium) {
      this.updateInstance(this.viewInstance = 2);
    }

    this.currentEntityId = null;

    const supportTicket = {
      kind      : 'chat_room',
      className : 'create-support-ticket',
      type      : _a.supportTicket,
      source
    };

    return this.getBranch(MAX_CONTENT).feed(supportTicket);
  }

  /**
   * 
  */
  loadNoTickets() {
    const noTicket = require('./skeleton/common/no-ticket-content')(this);
    this.getBranch(MAX_CONTENT).feed(noTicket);
  }

  /**
   * 
  */
  refreshNotify() {
    //
  }

  /**
   *
  */
  // bindNotificationCenterEvent() {
  //   if (!window.NotificationCenter) {
  //     RADIO_NETWORK.once(_e.notificationCenterReady, (ws) =>
  //       this.listenTo(window.NotificationCenter, 'notificationUpdated', this.updateNotificationCount))
  //     this.updateNotificationCount()
  //   } else {
  //     this.listenTo(window.NotificationCenter, 'notificationUpdated', this.updateNotificationCount)
  //     this.updateNotificationCount()
  //   }
  // }

  /**
   * 
  */
  updateNotificationCount() {
    this.ticketNotificationCount = data.supportCount    
    this.updateBackButtonCounter()
  }

  /**
   * 
  */
  updateBackButtonCounter() {
    if (!this.__backButtonCounter) {
      return
    }

    let windowSize = this.el.dataset.size;
    let page = this.router.page;
    let viewInstance = this.viewInstance;
    let count = 0


    if (windowSize == _a.min && viewInstance == 3) {
      count = this.ticketNotificationCount.totalChatCount
    }

    if (viewInstance == 2 && this._origin) {
      // support
      if (this._origin == 'support') {
        count = this.ticketNotificationCount.contactChatCount + this.ticketNotificationCount.teamChatCount;
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
    if (this.ticketNotificationCount) {
      return this.ticketNotificationCount;
    }
  }
}

module.exports = ___window_support_ticket;