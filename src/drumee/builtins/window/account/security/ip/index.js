const __pad = require('../pad');
class __security_ip extends __pad {

  static initClass() {
    this.prototype.figName    = "security_ip";
  }

// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    let val;
    super.initialize(opt);
    // @debug "AAA 12", @
    try { 
      val = this.mget(_a.master).mget('geo').ip;
    } catch (error) {}
    return this.mset({
      icon    : "account_ip",
      label   : LOCALE.ACCESS_BY_IP_ADDRESS,
      value   : val
    });
  }

// ===========================================================
// 
// ===========================================================
  _set(cmd) {
    let opt;
    const val = this.findPart('ref-input').getValue();
    if (!val.isIpAddress()) {
      this._tooltips.feed(require('../../skeleton/tooltips/message')(this, LOCALE.REQUIRE_VALID_IP_ADDRESS));
      return; 
    }

    return opt = 
      {mobile : val};
  }



// ===========================================================
// onUiEvent
// ===========================================================

  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    this.debug("QQQQQQQQQQQ", service, cmd);
    switch (service) {
      case _e.change:
        var opt =
          {label   : LOCALE.NEW_PHONE};
        this.append(require("../skeleton/entry")(this, opt));
        return this._modal = this.children.last();

      case _e.set:
        return this._set(cmd);

      default: 
        return super.onUiEvent(cmd);
    }
  }

// ===========================================================
// __dispatchRest
// ===========================================================

  __dispatchRest(method, data, socket) {
    return this.debug("AAAAAAAAAAA", method, this, data);
  }
}
__security_ip.initClass();


module.exports = __security_ip;
//
