
const { copyToClipboard } = require("core/utils");
const __hub = require('../hub');
class __window_sharebox extends __hub {
  /**
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    this.isHub = 1;
    super.initialize(opt);
    this.style.set({
      margin: 0,
      width: this.size.width,
      height: this.size.height
    });
    this.settingsLabel = LOCALE.PROJECT_ROOM_MANAGER;
    this.defaultSkeleton = require("./skeleton/main");
    this.bindEvent(_a.live);
  }

  /**
   * 
   * @param {*} c 
   * @returns 
   */
  updateCount(c) {
    this.__newMessage.set({ content: c });
    return this.__newMessage.el.dataset.count = c;
  }

  /**
   * 
   */
  notify() {
    this.warn("NOTIFY FROM UI IS NOW DEPRECATED");
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case SERVICE.desk.leave_hub:
        return this.goodbye();

      case 'show-settings':
        return this.switchShowShareboxSettings();

      case "copy-share-link":
        this.postService({
          service: SERVICE.hub.get_external_room_attr,
          hub_id: this.mget(_a.media).actualNode().hub_id
        }).then((data) => {
          if(data.link){
            this.acknowledge(LOCALE.URL_COPIED)
            copyToClipboard(data.link);
          }else{
            this.acknowledge(LOCALE.SOMETHING_WENT_WRONG);
          }
        })
        break;
      case "delete-sharebox":
        return this.dialogWrapper.feed({
          kind: 'window_confirm',
          maxsize: 2,
          title: LOCALE.DELETE,
          message: (this.mget(_a.filename).printf(LOCALE.DELETE_SHARE_BOX)), //'You are about to delete sharebox "{0}".'
          confirm: LOCALE.DELETE,
          confirm_action: 'delete-share-room',
        }).ask().then(this.delete_hub.bind(this));

      case 'open-email-notifcataion':
        this.isFileUpdated = 0;
        return this.openEmailNotification(cmd);

      case _e.close:
        const shareBoxInit = this.media.mget('init')
        if (this.isFileUpdated || shareBoxInit) {
          this.isFileUpdated = 0;
          this.openEmailNotification(cmd, true, shareBoxInit);
          this.media.mset('init', false)
          return
        }
        return super.onUiEvent(cmd, args);

      case 'update-expiry-status':
        return this.updateExpiryStatus(args);

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * To switch the sharebox settings 
   * @returns 
   */
  switchShowShareboxSettings() {
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.dialogWrapper.clear();
    }
    this.isShowSettings = true;

    this.dialogWrapper.feed({
      kind: 'widget_sharebox_setting',
      label: this.settingsLabel,
      className: "",
      uiHandler: [this],
      media: this.mget(_a.media),
      hub_id: this.mget(_a.hub_id),
      source: this,
      persistence: _a.once
    });
    var c = this.dialogWrapper.children.last();
    c.once(_e.destroy, () => {
      this.isShowSettings = false;
      return this.unselect();
    });
    return c.on(_e.show, () => {
      return this.on(_e.unselect, () => {
        return this.dialogWrapper.clear();
      });
    });
  }

  delete_hub() {
    return this.postService({
      service: SERVICE.hub.delete_hub,
      hub_id: this.mget(_a.hub_id)
    });
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} fileUpdate 
   * @param {*} firstTime 
   * @returns 
   */
  openEmailNotification(cmd, fileUpdate = false, firstTime = false) {
    this.dialogWrapper.feed({
      kind: 'widget_email_notification',
      label: LOCALE.SEND_NOTIFICATION_BY_EMAIL,
      className: "",
      uiHandler: [this],
      isFileUpdate: fileUpdate,
      isFirstTime: firstTime,
      media: this.mget(_a.media),
      hub_id: this.mget(_a.hub_id),
      source: this,
      persistence: _a.once
    });

    const c = this.dialogWrapper.children.last();

    c.once(_e.destroy, () => {
      return this.unselect();
    });

    return c.on(_e.show, () => {
      return this.on(_e.unselect, () => {
        return this.dialogWrapper.clear();
      });
    });
  }

  /**
   * @param {*} args
  */
  updateExpiryStatus(args) {
    let _status = _a.closed;
    if (args.status == _a.expired) {
      _status = _a.open;
    }
    this.__validityExpiredWrapper.el.dataset.mode = _status;
    this.media.mset('dmz_expiry', args.status);
    return this.media.restart();
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @returns 
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.media.make_dir_special:
        return;

      case SERVICE.media.count_new:
        return this.updateCount(data.new_chat);

      case SERVICE.hub.delete_hub:
        this.goodbye();
        return super.__dispatchRest(method, data);

    }
  }
}

module.exports = __window_sharebox;
