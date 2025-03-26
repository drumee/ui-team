// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /home/somanos/devel/ui/letc/template/index.coffee
//   TYPE : Component
// ==================================================================== *



mfsInteract = require('../interact')
require('./skin');
class ___window_confirm extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this.model.atLeast({
      cancel_action: _e.close,
      confirm_action: _e.close,
      maxsize: 0
    });
    this.contextmenuSkeleton = _a.none;
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'topbar':
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   */
  onBeforeRender() {
    this.el.dataset.state = _a.closed;
    this.el.dataset.type = "confirm";
    this.el.dataset.maxsize = this.mget('maxsize');
  }


  /**
   * 
   * @param {*} content 
   * @returns 
   */
  ask(content) {
    this.el.dataset.state = _a.open;
    this.feed(require('./skeleton')(this, content));
    const a = new Promise((resolve, reject) => {
      this.onConfirm = (cmd, args) => {
        this._done = true;
        try {
          resolve({ response: _e.confirm });
        } catch (e) {
          this.warn("Got error while resolving", e)
        }
        if (this.mget(_a.confirm_action) == _e.close) this.goodbye();
      }
      this.onCancel = (cmd, args) => {
        this._done = true;
        try {
          reject({ response: _e.cancel });
        } catch (e) {
          this.warn("Got error while rejecting", e)
        }
        if (this.mget(_a.cancel_action) == _e.close) this.goodbye();
      }
      this.onBeforeDestroy = (cmd, args) => {
        if (this._done) return;
        try {
          reject({ response: _e.close });
        } catch (e) {
          this.warn("Got error while rejecting", e)
        }
      }
    });
    return a;
  }

}


module.exports = ___window_confirm;