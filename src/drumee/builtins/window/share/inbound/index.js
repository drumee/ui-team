const channel = _.uniqueId("sharer-");
class __share_inbound extends LetcBox {
  constructor(...args) {
    super(...args);
    this.reload = this.reload.bind(this);
    this._sendInvitation = this._sendInvitation.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.figName = "share_inbound";
    this.prototype.behaviorSet = {
      bhv_socket   : 1,
      bhv_wrapper  : 1
    };
    this.prototype.genesis  =
      {inbound_sharer : require('./sharer/sharer')};
  }
// ===========================================================
// onDomRefresh
//
// ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.declareHandlers();
    return this.fetchService({
      service     : SERVICE.sharebox.notification_list,
      hub_id      : Visitor.id
    });
  }

// ===========================================================
//
// ===========================================================
  // onDomRefresh: () => 
  //   @$el.draggable
  //     cancel      : _a.input
  //     appendTo    : _a.body
  //     containment : Desk.$el
  //     cursor      : _a.move

// ===========================================================
//
// ===========================================================
  shareIn() { 
    this.debug("ZZZZZZZZ", this.__content);
    if (this.__content && !this.__content.isDestroyed()) { //and c.mget(_a.mode) is 'share-in'
      return;
    }
    this.logicalParent = this.getHandlers(_a.ui)[0];
    return this.feed(require('./skeleton/share-in')(this));
  }

// ===========================================================
//
// ===========================================================
  showList() { 
    this.mset({ 
      mode : 'showList'});
    return this.fetchService({
      service     : SERVICE.sharebox.notification_list,
      hub_id      : Visitor.id
    });
  }

// ===========================================================
//
// ===========================================================
  reload(data) { 
    if (this.mget(_a.mode) !== 'showList') {
      return;
    }
    this.el.show();
    for (var d of Array.from(data)) { 
      d.kind = 'inbound_sharer';
      d.dialogHandler = this;
      d.radio  = channel;
      d.uiHandler = this.getHandlers(_a.ui).concat(this);
    }
    return this.feed(require('./skeleton/main')(this, data));
  }

// ===========================================================   
// 
// ===========================================================
  _sendInvitation(cmd) {
    const args = cmd.getData();
    args.hub_id  = Visitor.get('sb_id');
    args.nid  = this.logicalParent.mget(_a.nodeId);
    this.debug("zzzzssszJJJJJJJJJ", args, cmd, this.logicalParent);
    return this.postService(SERVICE.sharebox.create_inbound_link, args); 
  }

// ===========================================================   
// onPartReady
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "wrapper-dialog":
        return this.dialogWrapper = child;

      case "sharers-list":
        return child.onChildDestroy = c=> {
          if (child.isEmpty()) {
            //@goodbye()
            return this.el.hide();
          }
        };

      case "ref-invitation":
        return this.invitation = child;
    }
  }
            
// ===========================================================
//
// ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = cmd.mget(_a.service);
    this.debug(`zzzzz service=${service}`, cmd, lastClick);
    switch (service) {
      case _e.close: 
        return this.softDestroy();

      case 'share-in':
        if (cmd.service === _e.share) {
          return this._sendInvitation(cmd);
        }
        break;
    }
  }



// ===========================================================
//
// ===========================================================
  __dispatchPush(service, data){}


// ===========================================================
//
// ===========================================================
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.sharebox.notification_list:
        if (_.isEmpty(data)) {
          return this.el.hide();
        } else { 
          return this.reload(data);
        }
      case SERVICE.sharebox.create_inbound_link:
        var msg = LOCALE.MSG_SHARE_ACK;
        this.feed(require('libs/preset/ack')(this, msg, {height : this.$el.height()}));
        var timeout = (1000*Visitor.parseModuleArgs().timeout) || 2000;
        var f = ()=> {
          return this.clear();
        };
        return _.delay(f, timeout);
    }
  }
}
__share_inbound.initClass();

module.exports = __share_inbound;
