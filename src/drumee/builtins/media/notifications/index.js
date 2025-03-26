class __media_notifications extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this._clearAll = this._clearAll.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName  = "media_notifications";
    // genesis : 
    //   media_origin : require('./origin')
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
  }

// ===========================================================
//
// ===========================================================
  initialize() {
    require('./skin');
    super.initialize();
    this.mset({ 
      volatility : 1});
    return this.declareHandlers();
  }
    
// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.list:
        var f = ()=> {
          return child.collection.on(_e.remove, c=> {
            const m = this.getHandlers(_a.ui)[0];
            m.refreshNotification();
            if (child.collection.length === 0) { 
              return this.goodbye();
            }
          });
        };
        return _.delay(f, Visitor.timeout());
    }
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
    this.$el.addClass(this.mget(_a.mode));
    return this.el.onmouseenter = this._mouseenter; 
  }


// ===========================================================
// 
// ===========================================================
  getCurrentApi(){
    let api, nid;
    if (this.mget(_a.filetype) === _a.hub) { 
      nid = this.mget(_a.actual_home_id); 
    } else { 
      nid = this.mget(_a.nid);
    }
    return api = { 
      service : SERVICE.media.show_new,
      nid,
      hub_id  : this.mget(_a.hub_id)
    };
  }

// ===========================================================
// 
// ===========================================================
  _clearAll(){
    let n;
    let nodes = [];
    let messages = [];
    for (var i of Array.from(this.__list.collection.toArray())) {
      if (!_.isEmpty(i.get(_a.nodes))) {
        nodes = nodes.concat(i.get(_a.nodes));
      }
      if (!_.isEmpty(i.get(_a.messages))) {
        messages = messages.concat(i.get(_a.messages));
      }
    }

    const hubs = {};
    const channels = {};
    for (n of Array.from(nodes)) { 
      if(hubs[n.hub_id]) {
        hubs[n.hub_id].push(n.nid);
      } else {
        hubs[n.hub_id]=[n.nid];
      }
    }
      
    for (n of Array.from(messages)) { 
      if(channels[n.hub_id]) {
        channels[n.hub_id].push(n.hub_id);
      } else {
        channels[n.hub_id]=[n.hub_id];
      }
    }
    if (_.isEmpty(hubs)) {
      hubs[this.mget(_a.hub_id)] = this.mget(_a.nid);
    }
    this.postService({ 
      service : SERVICE.notification.clear_all,
      nodes    : hubs,
      messages : channels,
      hub_id   : Visitor.id
    }); 
    return this.debug("QQsQQQ", hubs, this);
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.get(_a.service);
    const status = cmd.get(_a.status);
    this.debug(`FFFFFFFFF svc=${service}`, status, cmd, this);

    switch (service) {
      case _e.close:
        return this.goodbye();

      case _e.clear:
        this.debug("CLEAR", this);
        return this._clearAll();

      case "new-media": case "new-messages":
        //@bubbleService(service, cmd._args)
        return this.triggerHandlers(args);
    }
  }
        
// ===========================================================
//
// ===========================================================
  __dispatchRest(service, data, socket) {
    //debug "SSSSSSSS", service, @, data 
    switch (service) {
      case SERVICE.notification.clear_all:
        this._changed = 1;
        return this.goodbye();
    }
  }
}
__media_notifications.initClass();

module.exports = __media_notifications;    
