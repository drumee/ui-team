class __addressbook_widget_search extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
   }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    require('./skin');
    this.debug("initialize", this, opt);
    this.type = this.mget(_a.type);
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
    let status = cmd.get(_a.status);

    this.debug("onUiEvent", cmd, this);
    if (mouseDragged) {
      return;
    }

    switch (service) {
      case _a.close:
        this.goodbye();
        this.service = 'close-search-bar';
        return this.triggerHandlers();

      case 'trigger-entity-item':
        ({
          status
        } = cmd);
        this.source = cmd;
        this.service = cmd.mget('itemService');
        this.triggerHandlers();
        this.service = 'close-search-bar';
        this.triggerHandlers();
        return this.goodbye();
      
      default:
        ({
          status
        } = cmd);
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }

// ===========================================================
// getCurrentApi
// ===========================================================
  getCurrentApi() {
    this.debug("getCurrentApi", this);
    const api = {
      service : SERVICE.contact.search,
      key     : this.mget(_a.search),
      flag    : 'all',
      order   : 'desc',
      hub_id  : Visitor.get(_a.id)
    };
    
    if (this.type === _a.chat) {
      api.service = SERVICE.chat.chat_rooms;
    }
    
    if (this.type === _a.supportTicket) {
      api.service = SERVICE.channel.list_tickets;
      api.ticket_id = this.mget(_a.search);
      api.status = [_a.new, _a.doing, _a.closed];
    }

    return api;
  }
}


module.exports = __addressbook_widget_search;
