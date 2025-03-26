const __pad = require('../pad');
class __security_phone extends __pad {
  constructor(...args) {
    super(...args);
    this.checkSanity = this.checkSanity.bind(this);
    this._on_change = this._on_change.bind(this);
    this._set = this._set.bind(this);
    this.change = this.change.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.figName    = "security_phone";
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
      icon      : 'account_phone',
      button    : _button,
      status    : _status,
      label     : LOCALE.MOBILE_PHONE,
      type      : _a.mobile,
      areacode  : Visitor.profile().areacode,
      content   : Visitor.profile().mobile
    });
    return Visitor.on(_e.change, this._on_change.bind(this));
  }

  /**
   * 
   * @returns 
   */
  onDestroy() {
    return Visitor.off(_e.change, this._on_change.bind(this));
  }


  /**
   * 
   * @param {*} data 
   * @param {*} args 
   * @returns 
   */
  checkSanity(data, args) {
    const v = data.areacode + data.phone;
    if (!v) {
      return false;
    }

    const button = this.findPart('ref-button');
    if (v.isPhoneNumer()) {
      button.el.dataset.state = 1;
      this.__refInput.hideError();
      return v;
    }
    
    if ((args != null ? args.status : undefined) === _a.interactive) {
      button.el.dataset.state = 1;
    } else { 
      button.el.dataset.state = 0;
    }
    
    this.__refInput.showError();
    return false;
  }


  /**
   * 
   * @param {*} m 
   * @returns 
   */
  _on_change(m) {
    if (m.change === _a.profile) {
      return this.feed(require('../skeleton/entry')(this));
    }
  }
  
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  _set(cmd, args) {
    const data = this.getData();
    if (!data.areacode.includes('+')) {
      data.areacode = '+' + data.areacode;
    }
    
    if (!this.checkSanity(data, args)) {
      return;
    }
    if ((args != null ? args.status : undefined) === _a.interactive) {
      return;
    }

    const opt = {
      mobile   : data.phone,
      areacode : data.areacode
    };

    return this.postService({
      service     : SERVICE.drumate.update_profile,
      profile     : opt,
      hub_id      : Visitor.id
    }).then(()=>{
      Visitor.set(_a.profile, data);
      this._modal.feed(require('libs/preset/ack')(
        this, LOCALE.ACK_PHONE_UPDATED, {height:"100%"}
      )
      );
      var f = ()=> {
        this._modal.goodbye();
        return this.respawn();
      };
      _.delay(f, Visitor.timeout());
    })
  }


  /**
   * 
   * @returns 
   */
  change() {
    let data;
    if (!this.getPass()) {
      this.unlock();
      return; 
    }
    try {
      data = Visitor.profile();
    } catch (error) {}
    
    const opt = {
      label     : LOCALE.NEW_PHONE,
      type      : _a.text,
      name      : _a.phone,
      mode      : _e.commit,
      areacode  : data.areacode,
      value     : data.mobile,
      state     : 0
    };
    
    this.feed(require('../skeleton/entry')(this, opt));
    return this._modal = this.children.last();
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case _e.change:
        return this.change();

      case _e.set:
        return this._set(cmd, args);

      default: 
        return super.onUiEvent(cmd, {title:LOCALE.MOBILE_PHONE});
    }
  }

}
__security_phone.initClass();

module.exports = __security_phone;
//
