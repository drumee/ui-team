class __exported__ extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this._keyPress = this._keyPress.bind(this);
  }

  static initClass() {
    this.prototype.events =
      {'keypress body'    : '_keyPress'};
  }

    _keyPress(e) {
    //_dbg "Behavior.Keyboard", e
    let c;
    if (e != null) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!e.charCode) {
      c = String.fromCharCode(e.which);
    } else {
      c = String.fromCharCode(e.charCode);
    }
    //_dbg "chrfilter = #{c}",  e.charCode, e.which
    switch (e.which) {
      case _K.char.enter:
        this.triggerMethod("key:enter");
        return true;
      case _K.char.escape:
        this.triggerMethod("key:escape");
        return true;
    }
  }
}
__exported__.initClass();
module.exports = __exported__;
