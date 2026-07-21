
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
        this._releaseModalGuards();
        try {
          resolve({ response: _e.confirm });
        } catch (e) {
          this.warn("Got error while resolving", e)
        }
        if (this.mget(_a.confirm_action) == _e.close) this.goodbye();
      }
      this.onCancel = (cmd, args) => {
        this._done = true;
        this._releaseModalGuards();
        try {
          reject({ response: _e.cancel });
        } catch (e) {
          this.warn("Got error while rejecting", e)
        }
        if (this.mget(_a.cancel_action) == _e.close) this.goodbye();
      }
      this.onBeforeDestroy = (cmd, args) => {
        this._releaseModalGuards();
        if (this._done) return;
        try {
          reject({ response: _e.close });
        } catch (e) {
          this.warn("Got error while rejecting", e)
        }
      }
    });
    this._armModalGuards();
    return a;
  }

  /**
   * A pending confirm must stay answerable until resolved. Two live-verified
   * failure modes leave it stuck instead, turning its host wrapper-modal
   * (which only auto-closes when the confirm is DESTROYED) into an invisible
   * full-screen shield that eats every click/hover until reload:
   *  - Escape has no handler anywhere (both WM _kbHandler's are empty stubs),
   *    so keyboard users can't dismiss it.
   *  - The confirm's el joins the app-wide window focus radio: any other
   *    window being raised (WS event, re-render, programmatic launch — e.g.
   *    the post-deploy newVersion() confirm losing focus to the window the
   *    user keeps working in) demotes data-state to 0 with no way back.
   * Escape now runs the Cancel path, and a state guard re-asserts `open`
   * until the confirm is answered — a modal keeps the top spot by design.
   */
  _armModalGuards() {
    this._kbEscape = (e) => {
      if (e.key === 'Escape' && !this._done && this.onCancel) this.onCancel();
    };
    document.addEventListener(_e.keyup, this._kbEscape);
    this._stateGuard = new MutationObserver(() => {
      if (!this._done && this.el && this.el.dataset.state !== _a.open) {
        this.el.dataset.state = _a.open;
      }
    });
    this._stateGuard.observe(this.el, { attributes: true, attributeFilter: ['data-state'] });
  }

  _releaseModalGuards() {
    if (this._kbEscape) {
      document.removeEventListener(_e.keyup, this._kbEscape);
      this._kbEscape = null;
    }
    if (this._stateGuard) {
      this._stateGuard.disconnect();
      this._stateGuard = null;
    }
  }

}


module.exports = ___window_confirm;