class ___widget_supportTicketItem extends LetcBox {
  constructor(...args) {
      super(...args);
      this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.resetNotification = this.resetNotification.bind(this);
    this.updateNotification = this.updateNotification.bind(this);
    this.onDestroy = this.onDestroy.bind(this);

  }

  static initClass() {
    this.prototype.figName  = 'widget_support_ticket_item';
  }


// ===========================================================
//
// ===========================================================
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    return this.bindEvent(_a.live);
  }

// ===========================================================
// 
// ===========================================================
  // onPartReady: (child, pn, section) ->
    // switch pn
    //   when _a.none
    //     @debug "Created by kind builder"
    //   else
    //     @debug "Created by kind builder"

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }
    // @el.dataset.online = @mget(_a.online)

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`SERVICE=${service}`);

    switch (service) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  onWsMessage(service, data, options) {
    switch (options.service) {
      case SERVICE.channel.acknowledge:
        if (this.mget('ticket_id') === data.ticket_id) {
          this.mset('room_count', 0);
          this.updateNotification();
          break;
        }
        break;
          
      case 'channel.support_reset':
        this.mset('room_count', 0);
        this.updateNotification();
        break;
      
      case SERVICE.channel.post_ticket:
        if (this.mget('ticket_id') === data.ticket_id) {
          let room_count;
          if (this.mget(_a.state) === 1) {
            room_count = 0;
          } else { 
            room_count = this.mget('room_count') + 1;
          }
          
          this.mset('room_count', room_count);
          return this.updateNotification();
        }
        break;

      case SERVICE.channel.update_ticket:
        // if @mget('ticket_id') is data.ticket_id
        //   @mset({...this.model.attributes,...data})   
        //   @getPart('support-wrapper').render()
        return this.debug(SERVICE.channel.update_ticket , " services"); 
      default: 
        return this.debug("no services"); 
    }
  }


// ===========================================================
// 
// ===========================================================
  resetNotification() {
    const count = this.mset('room_count',0);
    return this.updateNotification();
  }

// ===========================================================
// 
// ===========================================================
  updateNotification() {
    let count = this.mget('room_count') || 0;
    if (count > 99) {
      count = '99+';
    }
    this.__counter.model.set(_a.content, count);
    if (count === 0) {
      this.__counter.el.hide();
    } else {
      this.__counter.render();
      this.__counter.el.show();
    }

    return this.trigger(_e.update);
  }


// ===========================================================
// onDestroy
// ===========================================================
  onDestroy(cmd) {}
}
___widget_supportTicketItem.initClass();
    //@unbindEvent()

module.exports = ___widget_supportTicketItem;
