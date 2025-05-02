const EventName = {
  "media.trash": "media.remove",
  "media.make_dir": "media.init",
  "media.rotate": "media.update",
}

class __changelog_event extends LetcBox {

  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._onTaskTerminated = this._onTaskTerminated.bind(this);
    mfsActivity.on(`mfs-task-terminated:*`, this._onTaskTerminated);

    let { args, event, nid, pid, hub_id, inode, id} = opt.data || {};
    this.debug("AAA:20", this, opt.event)
    this.mset({ nid, pid, hub_id, id, inode });
    if (!_.isEmpty(args)) {
      if (typeof args == "string") {
        let { src, dest } = JSON.parse(args)
        this.mset(src);
        this.mset({ args: { src, dest } });
      }
    } else {
      this.mset({ args: {} })
    }
    let name = EventName[event] || event;
    //delete opt.event.args;
    this.mset({ name, id })

  }

  /**
   * 
   * @param {*} filepath 
   */
  async _onTaskTerminated(evt) {
    if (this.isDestroyed()) {
      return
    }
    if (evt.nid == this.mget(_a.nid) || evt.inode == this.mget('inode')) {
      mfsActivity.off(`mfs-task-terminated:*`, this._onTaskTerminated);
      this.goodbye();
    }
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    //this.debug("onPartReady", child, pn);
    switch (pn) {
      case "my-part-name":
        /** Do something **/
        break;
      default:
      /** Delegate to parent if any **/
      //if(super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */
  logEvent() {
    let data = this.mget(_e.data);
    data.args = this.mget(_a.args)
    this.debug("AAA:82", this, this.mget(_a.name), this.mget(_a.args), data)
    MfsScheduler.log(this.mget(_a.name), data);
  }

  /**
   * User Interaction Evant Handler
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    this.debug(`onUiEvent service was called with : `, { service, args, trigger })
    switch (service) {
      case "accept-sync":
        this.logEvent();
        break;
    }
  }


  /** Optional. 
   * uncomment and call this.bindEvent to subscribe to websocket events
   **/
  /** 
   * Websocket Service Endpoint
   * @param {String} service
   * @param {Object} options
   */
  //onWsMessage(svc, data, options={}){
  //  const {service} = options || svc;
  //  switch(service){
  //  case  "my-service":
  //      this.debug("AAA:94",service, data)
  //    break;
  //    default:
  //      /** Delegate to parent if any **/
  //      if(super.onWsMessage) super.onWsMessage(service, data, options)
  //  }
  //}
}

module.exports = __changelog_event