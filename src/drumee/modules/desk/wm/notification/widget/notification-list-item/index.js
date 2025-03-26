/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : src/drumee/modules/desk/wm/notification/widget/notification-list-item/index.js
*   TYPE : Component
* ==================================================================== */

class __notification_list_item extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    require('./skin');
  }



  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'delete-entity':
        return this.deleteEntity(cmd, service);

      case 'open-contact':
        this.launchWindow({ kind: 'window_addressbook', args: { page: 'notification' } })
        return this.triggerClosePanel();

      case 'open-chat':
        this.launchWindow({ kind: 'window_bigchat', args: { page: 'contact', contact_id: this.mget('contact_id') } })
        return this.triggerClosePanel();

      case 'open-teamchat':
        this.launchWindow({ kind: 'window_bigchat', args: { page: 'team-room', team_id: this.mget('hub_id') } })
        return this.triggerClosePanel();

      case 'open-ticket':
        this.launchWindow({ kind: 'window_supportticket', args: { page: 'ticket', ticket_id: this.mget('key_id') } })
        return this.triggerClosePanel();

      case 'open-media':
        return this.launchMedia();
    }
  }

  launchWindow(window, singelton = { explicit: 1, singleton: 1 }) {
    const w = Wm.getItemsByKind(window.kind)[0];

    if (w && !w.isDestroyed()) {
      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          return w.wake(null, () => {
            w.raise();
            w.reload(window.args);
          });
        }
        w.raise();
        w.reload(window.args);
      }

      _.delay(f, 100);
    }

    window.args.initialLoad = true

    Wm.launch(window, singelton);
    return;
  }

  /**
   *
  */
  launchMedia() {
    const fType = `hub_${this.mget(_a.area)}`;
    let opt = require('window/configs/application')(fType, '');

    return this.fetchService({
      service: SERVICE.media.attributes,
      hub_id: this.mget(_a.hub_id)
    }, { async: 1 }).then((r) => {
      let m = new Backbone.Model(r);
      opt = _.merge(opt, r);
      opt.filename = this.mget('display_name')
      Kind.waitFor(_a.media).then((k) => {
        opt.media = new k({ model: m });
        Wm.launch(opt, { explicit: 1 });
      })
      return this.triggerClosePanel();
    })
  }

  /**
   * 
   * @param {Letc} cmd 
   * @returns 
  */
  deleteEntity() {
    const service = SERVICE.drumate.notification_remove;
    let opt = {
      entity_id: this.mget(_a.hub_id),
      hub_id: Visitor.get(_a.id)
    }
    if (this.mget(_a.area) == _a.personal && this.mget(_a.hub_id) != 'Support Ticket') {
      opt.entity_id = this.mget('drumate_id')
    } else if (this.mget(_a.hub_id) == 'Support Ticket') {
      opt.entity_id = this.mget('key_id')
    }
    this.postService(service, opt).then((data) => {
      if (!_.isEmpty(data)) {
        this.goodbye();
      }
    })
  }

  /**
   * 
   * @returns 
   */
  canShowinfo() {
    if (!_.isEmpty(this.mget(_a.content))) {
      return false;
    }
    return this.mget(_a.content).contact;
  }

  /**
   * 
  */
  triggerClosePanel() {
    this.service = 'close-notification-panel';
    this.source = this;
    return this.triggerHandlers();
  }

  /**
   * @param {String} category
   * @returns
   */
  getNotificationCount(category) {
    let data = this.mget(_a.content)[category]
    if (data) {
      return data;
    }
    return {
      cnt: 0
    }
  }

}

module.exports = __notification_list_item
