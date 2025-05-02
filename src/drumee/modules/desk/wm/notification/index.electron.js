/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : /home/somanos/devel/ui/letc/template/index.coffee
 *   TYPE : Component
 * ==================================================================== */

const __notification = require("./index");

//#########################################

class __notification_panel extends __notification {
  /**
   *
   * @returns
   */
  updateNotificationCount() {
    let notif = super.updateNotificationCount();
    let count = this.data().length;
    Account.setNotificationCount({ count });
  }

  /**
   *
   */
  shouldNofity() {
    let notif = super.shouldNofity(1);
    Account.showNotification(notif);
  }
}

module.exports = __notification_panel;
