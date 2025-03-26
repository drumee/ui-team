const __pad = require('../pad');
class __security_ident extends __pad {
  constructor(...args) {
    super(...args);
    this.checkSanity = this.checkSanity.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._send = this._send.bind(this);
    this.change = this.change.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.figName    = "security_ident";
  }

// ===========================================================
// initialize
// ===========================================================

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
    
    // if @cannotChange()
    //   _button = LOCALE.ASK_ADMIN
    //   _status = _a.disable
    
    this.mset({
      icon      : 'account_name',
      label     : LOCALE.USERNAME,
      button    : _button,
      status    : _status,
      type      : _a.username,
      content   : Visitor.profile().ident
    });
      // tooltips  : Visitor.profile().ident 
    return this.attribute.set({ 
      title : Visitor.profile().ident});
  }
       
// ===========================================================
//
// ===========================================================
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

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-tooltips":
        this._tooltips = child;
        return this._offset  = this.$el.offset();
    }
  }

// ===========================================================
// 
// ===========================================================
  _send(cmd) {
    if (cmd.status === _a.interactive) { 
      this.checkSanity();
      return;
    }

    const val = this.findPart('ref-input').getValue();
    if (!Validator.ident(val)) {
      this._modal.feed(Skeletons.Note(LOCALE.REQUIRE_IDENT, "malformed"));
      this._modal.selfDestroy({
        callback : this.reload}); 
      return;
    }
    return this.fetchService({ 
      service      : SERVICE.yp.username_exists,
      value        : val,
      hub_id       : Visitor.id
    }); 
  }

// ===========================================================
// 
// ===========================================================
  change() {
    if (!this.getPass()) {
      this.unlock();
      return; 
    }
    const opt = {
      label     : LOCALE.NEW_IDENT, //Visitor.get(_a.ident)
      type      : _a.text,
      name      : _a.ident,
      state     : 0, 
      value     : Visitor.profile().ident
    };
    this.feed(require("../skeleton/entry")(this, opt));
    return this._modal = this.children.last();
  }

// ===========================================================
// onUiEvent
// ===========================================================

  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    //@debug "QQQQQQQQQQQ", service, cmd
    switch (service) {
      case _e.change:
        return this.change();

      case _e.set:
        return this._send(cmd);

      default: 
        return super.onUiEvent(cmd, {title:LOCALE.IDENT});
    }
  }

  __dispatchRest(method, data, socket) {
    this.debug("AAAAAAAAAAA", method, this, data, data.profile);
    switch (method) {
      case SERVICE.drumate.update_ident:
        // Visitor.respawn(data)
        Visitor.set(_a.profile, data.profile);

        this._modal.feed(require('libs/preset/ack')(
          this, LOCALE.ACK_SAVE_CHANGES, {height:"100%"}
        )
        );

        var f = () => {
          this._modal.goodbye();
          return this.respawn();
        };
        return _.delay(f, Visitor.timeout());

      case SERVICE.yp.username_exists:
        var ident = this.getPart('ref-input').getValue();
        if (_.isEmpty(data) || !data.exists) {
          this.postService({ 
            service      : SERVICE.drumate.update_ident,
            ident,
            password     : this.getPass(),
            id           : Visitor.id, 
            hub_id       : Visitor.id
          }); 
          return; 
        }
        this._modal.feed(require('libs/preset/ack')(
          this, (ident.printf(LOCALE.ALREADY_EXISTS)), {height:"100%"}
        )
        );
        return this._modal.selfDestroy({
          callback : this.reload}); 
      default: 
        return super.__dispatchRest(method, data, socket);
    }
  }
}
__security_ident.initClass();


module.exports = __security_ident;
//
