// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/addressbook/widget/notification/index.coffee
//   TYPE : Component
// ==================================================================== *

class __addressbook_widget_notification extends LetcBox {
  constructor(...args) {
    super(...args);
    this.updateNotificationCount = this.updateNotificationCount.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.model.atLeast({
      count: 0
    });
  }


  /**
   * 
   * @param {*} cmd 
   */
  onDestroy(cmd) {
    RADIO_BROADCAST.off('notification:summary', this.updateNotificationCount);
  }

  /**
   * 
   */
  updateNotificationCount(summary={}) {
    let count = 0;
    if(!summary.contact) return;
    let data = summary.contact[Visitor.id];
    if (data && data.content && data.content.contact) {
      count = data.content.contact.cnt || data.cnt;
    }
    //this.debug("AAAA:45 49", this, data);
    this.ensurePart('counter').then((p) => {
      //this.debug("AAAA:45 51", count, p);
      p.set({ content: count });
      p.el.dataset.count = count;
      return this.trigger(_e.update);
    });
  }

  /**
   * 
   */
  async onDomRefresh() {
    this.feed(require('./skeleton')(this));
    RADIO_BROADCAST.on('notification:summary', this.updateNotificationCount);
    await Kind.waitFor("notification_panel");
    await Kind.waitFor("notification_window");
    await Kind.waitFor("notification_list_item");
    RADIO_BROADCAST.trigger('notification:request');
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    return this.triggerHandlers();
  }

  /**
   * 
   * @returns 
   */
  update() {
    let count;
    const data = this.mget(_a.data._);
    //@debug "update notification ", data
    if ((data == null) || (data.length == null) || (data.length === 0)) {
      count = "";

    } else {
      count = `${data.length}`;
    }

    this.__counter.model.set(_a.content, count);

    if (_.isEmpty(count)) {
      this.__counter.el.hide();

    } else {
      this.__counter.render();
      this.__counter.el.show();
    }

    return this.trigger(_e.update);
  }

}


module.exports = __addressbook_widget_notification;
