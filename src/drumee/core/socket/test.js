//########################################
class socket_test extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this.onSocketOk = this.onSocketOk.bind(this);
    this.onPipeFailed = this.onPipeFailed.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "pipe-test";
  }
// ======================================================
//
// ======================================================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    const args = this.getOption(_a.args) || {};
    args[_a.method]    = this.getOption(_a.method) || 'req.test';
    this.pipe = new Socket.Pipe(args);
    this.pipe.addListener(this);
    this.pipe.setEvent(_a.prefix, _a.socket);
    return this.pipe.setEvent('success', 'ok');
  }
    //_dbg ">>==========> initialize", @pipe
//============================
//
//===========================

// ===========================================================
// onPipeSucceeded
//
// @param [Object] json
//
// ===========================================================
  onPipeSucceeded(json) {
    return _dbg(">>==========> Test _onSucceeded", json);
  }
//============================
//
//===========================

// ===========================================================
// onSocketOk
//
// @param [Object] json
//
// ===========================================================
  onSocketOk(json) {
    return _dbg(">>==========> Test onSocketSucceeded", json);
  }
// ============================
//
// ===========================

// ===========================================================
// onPipeFailed
//
// @param [Object] json
//
// ===========================================================
  onPipeFailed(json) {
    return _dbg(">>====> _onPipeFailed Test",  json);
  }
}
socket_test.initClass();
module.exports = socket_test;
