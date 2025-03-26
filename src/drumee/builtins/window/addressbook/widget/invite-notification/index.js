
class __addressbook_widget_invite_notification extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._getInviteNotifications = this._getInviteNotifications.bind(this);
    this._navigateNotification = this._navigateNotification.bind(this);
    this._acceptInvite = this._acceptInvite.bind(this);
    this._refuseInvite = this._refuseInvite.bind(this);
    this._acceptInformed = this._acceptInformed.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
  }

/**
 * 
 * @param {*} opt 
 * @returns 
 */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    return this.bindEvent(_a.live);
  }

/**
 * 
 * @param {*} cmd 
 */
  onDestroy(cmd) { }


/**
 * 
 * @returns 
 */
  onDomRefresh() { 
    this._getInviteNotifications();
  }

/**
 * 
 * @param {*} cmd 
 * @returns 
 */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);

    switch (service) {
      case _a.close:
        this.service = 'close-overlay';
        return this.triggerHandlers({ service: 'close-overlay' });

      case 'navigate-notification':
        var type = cmd.mget(_a.type);
        return this._navigateNotification(type);

      case _e.submit:
        return this._acceptInvite(cmd);

      case _e.closePopup:
        return this._refuseInvite(cmd);

      case 'accept-informed':
        return this._acceptInformed(cmd);

      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers({ service, source: cmd });
    }
  }

  /**
   * 
   * @returns 
   */
  _getInviteNotifications() {
    this.fetchService({
      service: SERVICE.contact.invite_get,
      hub_id: Visitor.get(_a.id)
    }, { async: 1 }).then((data) => {
      if (_.isEmpty(data)) {
        return this.updateStatus({ status: _a.empty });
      }
      this.mset('notificationList', data);
      this.mset('currentIndex', 0);
      this.feed(require('./skeleton')(this));
    });
  }

  /**
   * 
   * @param {*} type 
   * @returns 
   */
  _navigateNotification(type) {
    const notificationList = this.mget('notificationList');
    let cIndex = this.mget('currentIndex');

    switch (type) {
      case _a.next:
        cIndex = cIndex + 1;
        if (cIndex >= notificationList.length) {
          cIndex = 0;
        }
        break;

      case _a.prev:
        cIndex = cIndex - 1;
        if (cIndex < 0) {
          cIndex = notificationList.length - 1;
        }
        break;
    }

    this.mset('currentIndex', cIndex);
    return this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _acceptInvite(source) {
    const notificationList = this.mget('notificationList');
    const cIndex = this.mget('currentIndex');
    const data = notificationList[cIndex];

    return this.postService({
      service: SERVICE.contact.invite_accept,
      email: data.drumate_id || data.email,
      hub_id: Visitor.get(_a.id)
    }, { async: 1 }).then(() => {
      this.fetchService({
        service: SERVICE.contact.invite_get,
        hub_id: Visitor.get(_a.id)
      }, { async: 1 }).then((data) => {
        if (_.isEmpty(data)) {
          return this.triggerHandlers({service:"close-overlay"});
        }
        this.mset('notificationList', data);
        this.mset('currentIndex', 0);
        this.feed(require('./skeleton')(this));
      });
    });
  }

  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _refuseInvite(source) {
    const notificationList = this.mget('notificationList');
    const cIndex = this.mget('currentIndex');
    const data = notificationList[cIndex];

    return this.postService({
      service: SERVICE.contact.invite_refuse,
      email: data.drumate_id || data.email,
      hub_id: Visitor.get(_a.id)
    });
  }

  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _acceptInformed(source) {
    const notificationList = this.mget('notificationList');
    const cIndex = this.mget('currentIndex');
    const data = notificationList[cIndex];

    return this.postService({
      service: SERVICE.contact.accept_informed,
      email: data.drumate_id || data.email,
      hub_id: Visitor.get(_a.id)
    });
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  updateStatus(data) {
    if (!_.isObject(data)) {
      return;
    }

    const {
      status
    } = data;
    let notificationList = this.mget('notificationList');
    switch (status) {
      case _a.active:
      case _a.deleted:
        var cIndex = this.mget('currentIndex');
        notificationList = this.mget('notificationList');
        notificationList = notificationList.filter(row => {
          return row.drumate_id !== data.drumate_id;
        });
        this.mset('notificationList', notificationList);
        if (notificationList.length === 0) {
          this.service = 'close-overlay';
          this.triggerHandlers({service:"close-overlay"});
          return;
        }

        if (cIndex >= notificationList.length) {
          this._navigateNotification(_a.prev);
          return;
        }
        this._navigateNotification();
        break;

      case _a.informed: case _a.received: case _a.invitation:
        notificationList.push(data);
        break;

      case _a.empty:
        this.service = 'empty-notification-handler';
        this.triggerHandlers({ service: 'empty-notification-handler' });
        break;
      default:
        this.debug("unknown Status");
    }

    return this.mset("notificationList", notificationList);
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  onWsMessage(service, data, options={}) {
    if (options.service.includes(_a.contact)) {
      return this.updateStatus(data);
    }
  }

}
//@unbindEvent()


module.exports = __addressbook_widget_invite_notification;
