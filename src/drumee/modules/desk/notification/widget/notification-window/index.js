/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : src/drumee/modules/desk/wm/notification/widget/notification-window/index.js
*   TYPE : Component
* ==================================================================== */

//#########################################
let EOD = "end:of:data"
class __notification_window extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    require('./skin');
    this.bindEvent("live");
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'notification-list':
        this.__notificationList.collection.comparator = (item) => -item.get("ctime")
        this.__notificationList.collection.sort();
        child.on(EOD, () => {
          this.trigger(EOD)
        })
    }
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} data 
   */
  update(data) {
    this.mset({ notificationData: data });
    this.__notificationList.feed(data);
  }
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args={}) {
    const service = args.service || cmd.mget(_a.service);
    this.triggerHandlers({ service });

  }
}

module.exports = __notification_window
