
const { toPercent } = require("core/utils")
class __libs_password extends LetcBox {
  constructor(...args) {
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.checkSanity = this.checkSanity.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.fig  = 1;
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    return this.skeleton = require('./skeleton')(this);
  }

// ===========================================================
//
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {

      case "ref-email": case "ref-password": case "ref-entry": case "ref-ident":
        this._input =  child;
        child.on(_e.keyup, ()=> {
          return this.checkSanity();
        });
        return child.on(_e.blur, ()=> {
          return this.clearMessage();
        });
    }
  }


// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.model.get(_a.service);
    this.debug(`menuEvents service=${service}`, cmd, this);
    switch (service) {
      case 'show-password':
        var pw = this._input;
        if (cmd.mget(_a.state)) {
          pw.mset(_a.type, _a.password);
        } else { 
          pw.mset(_a.type, _a.text);
        }
        return pw.reload();
    }
  }



// ===========================================================
//
// ===========================================================
  checkSanity() {
    const v = this._input.getValue();
    if (!this.pw_meter) {
      if (v.isEmail()) {
        this.msg(this._buttonLabel, 0);
        return true;
      }
      this._button.el.dataset.state = 0;
      return false; 
    }
    let r = (50*v.length)/8;
    this.pw_meter.el.dataset.state = 1;
    for (var c of Array.from(v)) { 
      if (specials.test(c)) {
        r = r + 10;
      }
    }
    if (r > 100) {
      r = 100;
    }
    this.pw_meter.el.style.left = toPercent(r/100);
    if (r > 49) {
      if (this._check) {
        this.msg(this._buttonLabel, 0);
        return true;
      }
    }
    this._button.el.dataset.state = 0;
    return false;
  }


// >>===========================================================
//
// >>===========================================================
  onChildBubble() {
    return this.clearMessage();
  }
}
__libs_password.initClass();


module.exports = __libs_password;
