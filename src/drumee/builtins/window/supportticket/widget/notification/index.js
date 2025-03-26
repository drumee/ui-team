// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/widget/notification/index.js
//   TYPE : Component
// ==================================================================== *


/**
 * @class __support_ticket_widget_notification
 * @extends __support_ticket_widget_notification
 */

class __support_ticket_widget_notification extends LetcBox {

  /**
   * @param {any} args
   */

  /**
   * 
   * @param {any} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.set({ flow: _a.none });
    this.mset('notificationCount', 0);
    this.updateNotificationCount.bind(this);
    this.bindNotificationCenterEvent();
  }

  onPartReady(child, pn, section) {
    switch (pn) {
      case "counter":
        if (!this.notificationCounterLoded) {
          this.notificationCounterLoded = true;
          this.update()
        }
        break;
    }
  }

  /**
   * 
   * @param {*} cmd 
   */
   onDestroy() {
    RADIO_BROADCAST.off('notification:counts', this.updateNotificationCount.bind(this));
  }

  /**
   * 
   */
  bindNotificationCenterEvent() {
    RADIO_BROADCAST.on('notification:counts', this.updateNotificationCount.bind(this));
  }


  /**
   * 
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {Letc} cmd 
   */
  onUiEvent(cmd) {
    return this.triggerHandlers();
  }

  /**
   * 
   */

  /**
   * 
   */
  updateNotificationCount(data) {
    if(!data) return;
    this.mset('notificationCount', data.supportCount)
    this.update();
  }

  /**
   * 
   */
  update() {
    let count;
    if (!this.notificationCounterLoded) {
      return;
    }
    const notificationCount = this.mget('notificationCount');
    if (!notificationCount) {
      count = '';
    } else {
      count = `${notificationCount}`;
    }

    this.__counter.model.set(_a.content, count)

    if (_.isEmpty(count)) {
      this.__counter.el.hide();
    } else {
      this.__counter.render();
      this.__counter.el.show();
    }

    return this.trigger(_e.update);
  }

  /**
   * 
   * @param {String} service 
   * @param {Object} data 
   */
  __dispatchPush(service, data) {
    // return this.updateStatus(data);
  }

  /**
   * 
   * @param {String} service 
   * @param {Object} data 
   */
  __dispatchRest(service, data) {
    // this.mset(_a.data._, data);
    // return this.update();
  }
}


module.exports = __support_ticket_widget_notification;
