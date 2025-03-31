
const { timestamp } = require("core/utils")
const __room = require('builtins/webrtc/room/jitsi');
class __window_litechat extends __room {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    this.service_class = opt.service_class;
    super.initialize(opt);
    // this.debug('AAA:19', opt);
    this.declareHandlers();
    this.media = opt.media;
    this.user = opt.user;
    this.style.set({
      left: opt.trigger.$el.offset().left + opt.trigger.$el.width() / 2,
      top: opt.trigger.$el.offset().top
    })
  }

  /**
   * 
   */
  onDestroy() {
    // Do not remove
  }

  /**
   * 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.list:
        this.setupInteract();
        this.raise();
        break;
    }
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  // ===========================================================
  // 
  // ===========================================================
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug(`SERVICE=${service}`, cmd, this);

    switch (service) {

      case _e.send: case _e.commit:
        return this.sendMessage(cmd);

      case "open-node":
        return Wm.launch(cmd);

      case 'delete-for-me':
        return this.deleteMessage(cmd, service);

      case 'delete-for-all':
        if (cmd.el.dataset.active === _a.yes) {
          return this.deleteMessage(cmd, service);
        }
        break;

      case 'interactive':
        return;

      default:
        super.onUiEvent(cmd, args);
    }
  }


  // ===========================================================
  // getActiveWindow
  // ===========================================================
  getActiveWindow() {
    return this;
  }


  // ===========================================================
  // sendMessage - Send the the chat message 
  // ===========================================================
  sendMessage(cmd) {
    this.debug("AAA:341 --- sendMessage", cmd.getMessage(), cmd);

    let opt = {
      kind: 'litechat_message',
      author: 'me',
      ...this.user,
      message: cmd.getMessage(),
      ctime: timestamp(1),
      //author : 
    }
    this.debug("AAA:401", this, opt);
    this.__list.append(opt);
    this.send({
      service: 'upstream-live-message',
      message: opt.message,
      ctime: opt.ctime,
    });
    cmd.resetMessage();
  }


  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @returns 
   */
  __dispatchPush(service, data) {
    let svc = this.serviceName(service);
    this.debug(`AAA:132 service=${svc}`, data, this);
    switch (svc) {
      case 'downstream-live-message':
        let opt = {
          kind: 'litechat_message',
          author: _a.other,
          ...data
        }
        this.debug("AAA:553", this, opt, data);
        this.__list.append(opt);
        break;

      case 'downstream-pending-messages':
        if (_.isEmpty(data.messages) || !_.isArray(data.messages)) return;
        data.messages.map((e) => { 
          e.kind = 'litechat_message';
        })
        //this.debug("AAA:147", this, data);
        this.__list.reset();
        this.__list.append(data.messages);
        break;

      // default:
      //   super.__dispatchPush(service, data);
    }

  }

  // // ===========================================================
  // //
  // // ===========================================================
  // onServerComplain(xhr, socket) {
  //   return this.warn(xhr);
  // }

  // // ===========================================================
  // // 
  // // ===========================================================
  // __dispatchRest(service, data, socket) {
  //   switch (service) {

  //     case SERVICE.chat.delete: case SERVICE.channel.delete:
  //       this.disableMessageSelection();
  //       return this.clearMessageFromChat(data);

  //     case SERVICE.chat.upload_remove:
  //       return this.removeUploadFromChat(data);

  //     case SERVICE.channel.send_ticket:
  //       this.respData = data;
  //       this.source = this;
  //       this.service = 'add-to-support-tickets-list';
  //       this.triggerHandlers();
  //       return this.service = '';
  //   }
  // }

}

module.exports = __window_litechat;
