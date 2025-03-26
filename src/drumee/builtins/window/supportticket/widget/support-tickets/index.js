// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/window/bigchat/widget/support-tickets/index.js
//   TYPE : Component
// ==================================================================== *

//########################################

const EOD = "end:of:data";
class ___widget_support_tickets extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.triggerClick = this.triggerClick.bind(this);
    this.addTicketItem = this.addTicketItem.bind(this);
    this.updateTicketItem = this.updateTicketItem.bind(this);
    this.deleteRoomItemById = this.deleteRoomItemById.bind(this);
    this.onServerComplain = this.onServerComplain.bind(this);
  }



// ===========================================================
//
// ===========================================================
  initialize(opt = {}) {
    require('./skin');
    super.initialize();
    this.declareHandlers();

    this.selectedFilter = [_a.new, _a.doing];
    this.bindEvent(_a.live);
  }

  /**
   * @param {*} child
   * @param {*} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'list-tickets':
        return child.on(EOD, () => {
          this.trigger(EOD);
        });
    }
  }
      // else
      //   super(child, pn, section)

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`onUiEvent service=${service}`, cmd, this);
    switch (service) {
      case 'trigger-tickets-filter':
        var data = this.getData(_a.formItem);
        this.selectedFilter = data.options.filter(r => { return r.filter!== 0; }).map(r => { return r.filter; });

        this.getPart('list-ticket-wrapper').feed(require('./skeleton/ticket-list').default(this));
        return;
      
      case 'open-ticketroom-chat':
        if (cmd.resetNotification) {
          cmd.resetNotification();
        }
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
      
      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }

// ===========================================================
// getCurrentApi 
// ===========================================================
  getCurrentApi() {
    const api = { 
      service : SERVICE.channel.list_tickets,
      hub_id  : Visitor.get(_a.id),
      status  : this.selectedFilter
    };

    return api;
  }

// ===========================================================
// triggerClick
// ===========================================================
  triggerClick(id = null) {
    const ticketList = this.__listTickets;
    if (!id) {
      const firstEl = ticketList.children.first();
      firstEl.triggerHandlers();
      return;
    }
    
    const ticketID = parseInt(id);
    let ticket = ticketList.getItemsByAttr('ticket_id', ticketID)[0];
    if (!ticket) {
      ticket = ticketList.getItemsByAttr('entity_id', ticketID)[0];
    }
    
    return ticket.triggerHandlers();
  }

// ===========================================================
// addTicketItem
// ===========================================================
  addTicketItem(ticket) {
    const itemsOpt = this.__listTickets.mget(_a.itemsOpt);
    const newTicket = _.merge(ticket, itemsOpt);

    this.__listTickets.prepend(newTicket);
    return;
  }

// ===========================================================
// updateTicketItem
// ===========================================================
  updateTicketItem(data) {
    if (!data.ticket_id) {
      this.warn('Ticket ID is required.');
      return;
    }
    
    const item = this.getItemsByAttr('ticket_id', data.ticket_id)[0];

    const itemsOpt = this.__listTickets.mget(_a.itemsOpt);
    const updatedTicket = _.merge(data, itemsOpt);

    if (_.isEmpty(item)) {
      this.warn('Ticket not found.');
      return;
    }
      
    item.model.set(updatedTicket);
    item.render();
    return;
  }

// ========================================================
// deleteRoomItemById delete a room by roomId
// ========================================================
  deleteRoomItemById(id) {
    const list = this.__listTickets.collection;
    let room = this.getItemsByAttr('ticket_id', id)[0];
    if (room) {
      list.remove(list.findWhere({'ticket_id': id}));
    } else {
      room = this.getItemsByAttr('entity_id', id)[0];
      list.remove(list.findWhere({'entity_id': id}));
    }
    return;
  }

  /**
   * @param {String} service
   * @param {Object} data
   * @param {Object} options
   * @returns
  */
  onWsMessage (service, data, options) {
    this.debug('AAA:180', service, data, options, this);
    switch (options.service) {
      case SERVICE.channel.send_ticket:
        if (data.is_ticket) {
          data.status = (data.metadata != null ? data.metadata.status :'New')
          const ticketId = data.ticket_id;
          this.addTicketItem(data);
          return this.triggerClick(ticketId);
        }
        break
      
      case SERVICE.channel.update_ticket:
        return this.updateTicketItem(data);
      
      default: 
        return this.debug("no services"); 
    }
  }

}


module.exports = ___widget_support_tickets;
