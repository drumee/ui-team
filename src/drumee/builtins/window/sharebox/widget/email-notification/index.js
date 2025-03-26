/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : /src/drumee/builtins/window/sharebox/widget/email-notification/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../../../@types/index.d.ts" />

/**
 * Class representing the email-notification module.
 * @class ___widget_sharebox_email_notification
 * @extends LetcBox
*/

class ___widget_sharebox_email_notification extends LetcBox {

  /**
   * @param {Object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    this._media = this.mget(_a.media)
    return
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'ref-message':
        this._input = child;
        break;

      default:
        this.debug("Created by kind builder");
    }
  }

  /**
   *
  */
  onDomRefresh() {
    this.getNodeAttributesApi();

    // return this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch (service) {
      case 'send-email-notification':
        return this.sendEmailNotification();
      
      case 'close-popup':
        return this.goodbye();
      
      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = '';
    }
  }

  getNodeAttributesApi() {
    this.postService({
      service: SERVICE.hub.get_external_room_attr,
      hub_id: this.mget(_a.media).actualNode().hub_id
    }).then((data) => {
      this.data = data;
      this.emailData = data.members;
      this.feed(require('./skeleton').default(this));
      
      // if( !(data.members && _.isEmpty(data.members)) ){
      //   return this.getPart('email-notification-content').feed(require('./skeleton/content').default(this))
      // }
      // const a = require('./skeleton/notification-message').default(this,'noemail');
      // this.getPart('email-notification-content').feed(a);
    })
  }

  /**
   *
  */
  sendEmailNotification () {
    this.validateData()
    if (this.formStatus == _a.error) {
      return this._input.showError();
    }

    const _message = this.getData(_a.formItem).message

    return this.postService({
      service   : SERVICE.hub.external_notification,
      message   : _message,
      hub_id    : this._media.mget(_a.hub_id)
    }).then(() => {
      let emailSuccessText = LOCALE.NOTIFICATION_SENT;
      this.__emailNotificationBody.feed(require('./skeleton/notification-message').default(this, emailSuccessText))  
      _.delay(()=>this.goodbye(), Visitor.timeout(4000));
      return;
    })
  }

}

___widget_sharebox_email_notification.initClass();

module.exports = ___widget_sharebox_email_notification
