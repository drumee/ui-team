const { toPercent } = require("core/utils")

const __pad = require('../pad');
const specials = require('assets/special-chars');
class __security_pass extends __pad {
  constructor(...args) {
    super(...args);
    this.checkSanity = this.checkSanity.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._set = this._set.bind(this);
    this.change = this.change.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    let _button;
    super.initialize(opt);
    let _status = _a.enable;
    if (Visitor.isMimicUser()) {
      _button = LOCALE.ASK_ADMIN;
      _status = _a.disable;
    }
    return this.mset({
      icon    : "account_padlock",
      button  : _button,
      status  : _status,
      label   : LOCALE.PASSWORD,
      content : 'xxxxxxxx',
      service : _e.change
    });
  }

  /**
   * 
   * @returns 
   */
  checkSanity() {
    const v = this.getData().password;
    if (!v) {
      return false; 
    }
    let r = (50*v.length)/8;
    this.__refPwm.el.dataset.state = 1;
    for (var c of Array.from(v)) { 
      if (specials.test(c)) {
        r = r + 10;
      }
    }
    if (r > 100) {
      r = 100;
    }
    this.__refPwm.el.style.left = toPercent(r/100);
    const button = this.findPart('ref-button');
    this.debug(`HHHHH 32 r=${r} v=${v}`,  button);
    if (r > 59) {
      button.el.dataset.state = 1;
      return v;
    }
    button.el.dataset.state = 0;
    return false;
  }
 
  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-tooltips":
        this._tooltips = child;
        return this._offset  = this.$el.offset();
    }
  }


  /**
   * 
   */
  _set(cmd) {
    const val = this.checkSanity();
    if (!val) { 
      return;
    }
    const old_pw = this.getPass();
    if (!old_pw) {
      this.unlock();
      return;
    }

    this.postService({ 
      service      : SERVICE.drumate.change_password,
      old_password : old_pw,
      new_password : val,
      hub_id       : Visitor.id
    }).then((data)=>{
      this._modal.feed(require('libs/preset/ack')(
        this, LOCALE.PASS_PHRASE_UPDATED, {height:"100%"}
      )
      );
      var f = ()=> {
        this._modal.goodbye();
        return this.reload();
      };
      return _.delay(f, Visitor.timeout());

    })
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
      label     : LOCALE.NEW_PASSWORD,
      type      : _a.password, 
      passmeter : 1,
      shower    : 1,
      state     : 0 
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
        return this._set(cmd);

      default: 
        return super.onUiEvent(cmd, {title:LOCALE.PASSWORD});
    }
  }

}

module.exports = __security_pass;

