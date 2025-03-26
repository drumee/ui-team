class __media_origin extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._showOrigins = this._showOrigins.bind(this);
    this._remove = this._remove.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.fig  = 1;
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
      
    this.prototype.genesis  = { 
      notification_file    : require('./file'),
      notification_message : require('./message')
    };
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.model.set({
      flow : _a.y});
//      volatility : 1
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
    const blocks = this.mget('notifications').split('+++');
    const nodes = [];
    const messages = [];
    for (var block of Array.from(blocks)) { 
      var items = JSON.parse('[' + block + ']');
      for (var item of Array.from(items)) { 
        if (item.type === _a.media) { 
          nodes.push(item); 
        } else if (item.type === _a.chat) { 
          messages.push(item); 
        }
      }
    }
    this.mset(_a.nodes, nodes);
    return this.mset(_a.messages, messages);
  }

// ===========================================================
// 
// ===========================================================
  _showOrigins(){
    if (!this.__newItems.isEmpty()) { 
      this.__sender.el.dataset.open = 0;
      this.__newItems.clear();
      return;
    }
    const nodes = this.mget(_a.nodes);
    const messages = this.mget(_a.messages);
    const list  = []; 
    if (!_.isEmpty(nodes)) {
      for (var node of Array.from(nodes)) {
        if (!_.isEmpty(node)) {
          node.kind = 'notification_file';
          node.uiHandler = this.getHandlers(_a.ui);
          list.push(node);
        }
      }
    }
    if (!_.isEmpty(messages)) {
      let msg;
      const hubs = {};
      for (msg of Array.from(messages)) {
        if (!_.isEmpty(msg)) {
          if (!hubs[msg.hub_id]) {
            hubs[msg.hub_id] = 1;
          } else { 
            hubs[msg.hub_id]++; 
          }
        }
      }
      for (var k in hubs) {
        var v = hubs[k];
        msg = {
          kind : 'notification_message',
          name : this.mget(_a.hubName),
          hub_id : k,
          count : v, 
          uiHandler : this
        };
        list.push(msg);
      }
    }
    if (_.isEmpty(list)) {
      return;
    }
    this.__sender.el.dataset.open = 1;
    return this.__newItems.feed(list);
  }

// ===========================================================
// 
// ===========================================================
  _remove(){
    let n;
    const nodes = this.mget(_a.nodes) || [];
    const messages = this.mget(_a.messages) || [];

    const hubs = {};
    const channels = {};
    for (n of Array.from(nodes)) { 
      if (![n.hub_id]) {
        continue;
      }
      if(hubs[n.hub_id]) {
        hubs[n.hub_id].push(n.nid);
      } else {
        hubs[n.hub_id]=[n.nid];
      }
    }
      
    for (n of Array.from(messages)) { 
      if (![n.hub_id]) {
        continue;
      }
      if(channels[n.hub_id]) {
        channels[n.hub_id].push(n.hub_id);
      } else {
        channels[n.hub_id]=[n.hub_id];
      }
    }

    return this.postService({ 
      service : SERVICE.notification.clear_all,
      nodes    : hubs,
      channels,
      messages : channels,
      hub_id   : Visitor.id
    }); 
  }
    // @debug "QQQQQ", hubs, channels

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {}
    // @debug "Created by kind builder", child, pn
    // switch pn
    //   when _a.none
    //     @debug "Created by kind builder"
    //   else
    //     @debug "Created by kind builder"

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.get(_a.service);
    const status = cmd.get(_a.status);
    this.debug("NOTIFICATION ORIG", service, this);

    switch (service) {
      case _e.clear:
        if (this.mget(_a.nodes)) {
          const nodes = [];
          const list = this.mget(_a.nodes).split('/');
          for (var n of Array.from(list)) { 
            nodes.push(JSON.parse(n));
          }
          return this.postService({ 
            service : SERVICE.media.clear_notifications,
            nodes
          });
        }
        break;

      case _e.show:
        return this._showOrigins();
        //@debug "zzzzzzzzzzzmessages ", @

      case "new-media": case "new-messages":
        // @status = _a.idle
        // cmd._args.filename = @mget(_a.hubName)
        // @bubbleService(service, cmd._args)
        return this.triggerHandlers(args);

      case _e.remove:
        return this._remove();
    }
  }
        //@debug "zzzzzzzzzzzmessages ", @
      // when "show-rooms"
      //   @_showRooms()

        //@debug "zzzzzzzzzzzrooms ", @

// ===========================================================
//
// ===========================================================
  __dispatchRest(service, data, socket) {
    this.debug("SSSSSSSS", service, this, data); 
    switch (service) {
      case SERVICE.notification.clear_all:
        return this.goodbye();
    }
  }
}
__media_origin.initClass();

module.exports = __media_origin;    
