class ___litechat_message extends LetcBox {

// ===========================================================
//
// ===========================================================
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.msgOptionsTrigger = this.msgOptionsTrigger.bind(this);
    this.showMsgSelector = this.showMsgSelector.bind(this);
    this.getAttachments = this.getAttachments.bind(this);
    this.nextRow = this.nextRow.bind(this);
    this.prevRow = this.prevRow.bind(this);
    this.showDateOfDay = this.showDateOfDay.bind(this);
    this.attachmentReponse = this.attachmentReponse.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    this.bindEvent(_a.live);
    if(opt.ssid === Visitor.get(_a.socket_id)) {
      return this.mset(_a.author, "me");
    } else {
      return this.mset(_a.author, _a.other);
    }
  }
    

// ===========================================================
// 
// ===========================================================
  onDomRefresh() {
    this.$el.addClass(this.mget(_a.author));
    return this.feed(require('./skeleton')(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);
    
    switch (service) {
      case 'chat-item-menu':
        return this.debug("This will trigger the chat-item menu"); //do-not remove
      
      case _a.forward: case _a.delete:
        return this.msgOptionsTrigger(service, cmd);

      case 'trigger-message-selector':
        return this.showMsgSelector(service, cmd);
      
      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        return this.service = '';
    }
  }

// ===========================================================
// 
// ===========================================================
  msgOptionsTrigger(service, cmd) {
    this.source = cmd;
    this.service = service;
    this.triggerHandlers();

    this.getPart('message-item-checkbox').$el.click();
    return this.getPart('message-item-wrapper').el.dataset.active = _a.yes;
  }

// ===========================================================
// 
// ===========================================================
  showMsgSelector(service, cmd) {
    const state = cmd.mget(_a.state);
    const msgItemWrapper = this.getPart('message-item-wrapper');

    if (state) {
      msgItemWrapper.el.dataset.active = _a.yes;
    } else {
      msgItemWrapper.el.dataset.active = _a.no;
    }

    this.source = cmd;
    this.service = service;
    return this.triggerHandlers();
  }

// ===========================================================
// 
// ===========================================================
  getAttachments() {
    let {
      hubId
    } = this.mget(_a.uiHandler);
    if ((this.mget('message_type') === _a.ticket) && this.mget('hub_id')) { 
      hubId = this.mget('hub_id');
    }
    const api = {
      service     : SERVICE.chat.attachment,
      message_id  : this.mget('message_id'),
      hub_id      : hubId
    };
    
    return api;
  }

// ===========================================================
// 
// ===========================================================
  // setThreadData: () =>
  //   if _.isEmpty(@mget(_a.thread) and @mget('thread_id'))
  //     return
    
  //   if @mget(_a.thread).is_attachment
  //     @fetchService
  //       service     : SERVICE.chat.attachment
  //       message_id  : @mget(_a.thread).message_id
  //       hub_id      : @mget(_a.uiHandler).hubId

// ===========================================================
// nextRow
// ===========================================================
  nextRow() {
    return this.model.collection.at(this.model.collection.indexOf(this.model) + 1);
  }

// ===========================================================
// prevRow
// ===========================================================
  prevRow() {
    if (this.model.collection.indexOf(this.model) <= 0) {
      return; 
    }
    return this.model.collection.at(this.model.collection.indexOf(this.model) - 1);
  }

// ===========================================================
// showDateOfDay
// ===========================================================  
  showDateOfDay() { 
    const row = this.prevRow();
    if (row) {
      const currentDate = Dayjs.unix(this.mget(_a.ctime)).format("DDMMYYYY");
      const nextDate = Dayjs.unix(row.attributes.ctime).format("DDMMYYYY");
      return (currentDate !== nextDate);
    }

    return false;
  }


// ===========================================================
// attachmentReponse
// ===========================================================  
  attachmentReponse(data) {
    //@debug 'attachmentReponse', data, @
    const attachment = {
      kind          : 'media_grid',
      className     : `${this.fig.family}__attachment-wrapper`,
      isAttachment  : 1,
      origin        : _a.chat,
      logicalParent : this,
      uiHandler     : this,
      row           : data,
      filetype      : data.ftype,
      nid           : data.nid,
      hub_id        : data.hub_id,
      filename      : data.filename,
      ext           : data.ext,
      filesize      : data.filesize,
      vhost         : data.vhost,
      mode          : _a.view,
      signal        : _e.ui.event,
      accessibility : data.accessibility,
      capability    : data.capability
    };

    return this.__attachmentContent.feed(attachment);
  }

// ===========================================================
// 
// ===========================================================
  format() {} 

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  onLiveUpdate(service, data, options) {
    switch (options.service) {
      case SERVICE.channel.acknowledge: 
      case SERVICE.chat.acknowledge:
        if (data.message_id === this.mget('message_id')) {
          this.mset('is_seen', data.is_seen);
          if (!this.__messageItemReadStatus) {
            return; 
          }
          return this.__messageItemReadStatus.el.dataset.is_seen = data.is_seen;
        }
        break;
      
      default:
        return this.warn(`Service ${service} - not found`);
    }
  }



  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.chat.attachment:
        if (!_.isEmpty(data)) {
          this.attachmentReponse(data[0]);
        }
        return;
    }
  }
}


module.exports = ___litechat_message;
