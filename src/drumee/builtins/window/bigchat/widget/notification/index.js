// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/window/bigchat/widget/notification/index.js
//   TYPE : Component
// ==================================================================== *


/**
 * @class __bigchat_widget_notification
 * @extends __bigchat_widget_notification
 */

class __bigchat_widget_notification extends LetcBox {

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
    this.bindNotificationCenterEvent();
    this.model.set({
      flow: _a.none,
      notificationCount: 0
    });
  }

  /**
   * 
   * @param {Letc} cmd 
  */
  onDestroy(cmd) {
    RADIO_BROADCAST.off('notification:counts', this.updateCount.bind(this));
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
  bindNotificationCenterEvent() {
    RADIO_BROADCAST.on('notification:counts', this.updateCount.bind(this));
  }

  /**
   * nc (Notificatio Center)
   */
  updateCount(nc) {
    let count = nc.teamChatCount + nc.contactChatCount;
    this.mset('notificationCount', count)
    this.update();
  }

  /**
   * 
   */
  update() {
    this.ensurePart('counter').then((p) => {
      const c = this.mget('notificationCount');
      let count;
      if (!c) {
        count = '';
      } else {
        count = `${c}`;
      }

      p.set({ content: count })
      if (_.isEmpty(count)) {
        p.el.hide();
      } else {
        p.render();
        p.el.show();
      }

      this.trigger(_e.update);

    })
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


module.exports = __bigchat_widget_notification;
