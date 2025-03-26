const __pad = require('../pad');
class __security_email extends __pad {
  constructor(...args) {
    super(...args);
    this.checkSanity = this.checkSanity.bind(this);
    this._send = this._send.bind(this);
    this.change = this.change.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() { 
    this.prototype.figName    = "security_email";
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    let _button = LOCALE.CHANGE;
    let _status = _a.enable;

    if (Visitor.isB2B()) {
      _button = LOCALE.ENABLE_DISABLE_DOUBLE_AUTHENTICATION;
      _status = _a.disable;
    }
    if (Visitor.domainCan(_K.permission.admin_member)) {
      _button = LOCALE.FOR_SECURITY_DOUBLE_AUTHENTICATION;
      _status = _a.disable;
    }
    
    this.mset({
      icon      : "account_mail",
      label     : LOCALE.EMAIL,
      button    : _button,
      status    : _status,
      type      : _a.email,
      content   : Visitor.profile().email
    });
    return this.attribute.set({ 
      title : Visitor.profile().email});
  }

  /**
   * 
   * @returns 
   */
  checkSanity() {
    const v = this.getData().email; 
    if (!v) {
      return false; 
    }
    const button = this.findPart('ref-button');
    if (v.isEmail()) {
      button.el.dataset.state = 1;
      return v;
    }
    button.el.dataset.state = 0;
    return false;
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _send(cmd) {
    const val = this.findPart('ref-input').getValue();
    if (!val.isEmail()) {
      this._tooltips.feed(require('../../skeleton/tooltips/message')(this, LOCALE.REQUIRE_EMAIL));
      return; 
    }

    return this.fetchService({ 
      service      : SERVICE.yp.email_exists,
      value        : val,
      hub_id       : Visitor.id
    }); 
  }

  /**
   * 
   * @returns 
   */
  change() {
    if (!this.getPass()) {
      this.unlock();
      return; 
    }
    const opt = {
      label     : LOCALE.NEW_EMAIL,
      type      : _a.text,
      name      : _a.email,
      title     : LOCALE.EMAIL,
      state     : 0, 
      value     : Visitor.profile().email
    };
    this.feed(require("../skeleton/entry")(this, opt));
    return this._modal = this.children.last();
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case _e.change:
        return this.change();

      case _e.set:
        if (cmd.status === _a.interactive) { 
          this.checkSanity();
          return;
        }
        return this._send(cmd);

      default: 
        return super.onUiEvent(cmd, {title:LOCALE.EMAIL});
    }
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.drumate.change_email:
        Visitor.set(_a.profile, data.profile);
        this._modal.feed(require('libs/preset/ack')(
          this, LOCALE.ACK_EMAIL_ADDRESS_UPDATED, {height:"100%"}
        )
        );

        var f = ()=> {
          this._modal.goodbye();
          return this.respawn();
        };
        return _.delay(f, Visitor.timeout());

      case SERVICE.yp.email_exists:
        var email = this.getPart('ref-input').getValue();
        if (_.isEmpty(data)) { 
          this.postService({ 
            service      : SERVICE.drumate.change_email,
            email,
            password     : this.getPass(),
            hub_id       : Visitor.id
          }); 
          return; 
        }
        this._modal.feed(require('libs/preset/ack')(
          this, (email.printf(LOCALE.EMAIL_ALREADY_EXISTS)), {height:"100%"}
        )
        );
        return this._modal.selfDestroy({
          callback : this.reload}); 

      default: 
        return super.__dispatchRest(method, data, socket);
    }
  }
}
__security_email.initClass();



module.exports = __security_email;
//
