/// <reference path = "../../../../@types/index.d.ts" />

const __password_meter = require('./password-meter');

/**
 * Class representing interact in the Welcome module.
 * @class ___welcome_interact
 * @extends __password_meter
 */

class __welcome_interact extends __password_meter {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    return this.declareHandlers();
  }

  /**
   *
  */
  initLoader(type = _a.loader) {
    this._mode = type
    this.__header.render();
    this.__content.feed(require('./skeleton/common/loading').default(this));
  }

  /**
  * To avoid full page reload upon login 
  */
  gotSignedIn() {
    // GA4 `login`, the counterpart of the signup plugin's `sign_up`. Every
    // completed credential sign-in passes through here, and it still runs
    // before the desk takes the document over. Self-gating and failure-proof
    // inside libs/gtag — off a drumee.com host it does nothing.
    //
    // Not a reconnect: signin/index.js handles that case before it reaches
    // this method, and counting a dropped websocket as a login would inflate
    // the metric. Not the Google SSO route either — that lands from loby's
    // interstitial with the session already established, and that page reports
    // its own signup.
    require('libs/gtag').event('login', { method: 'password' });
    if (Visitor.isOnline()) {
      this.anim([1, { alpha: 0.0 }]);
      RADIO_BROADCAST.trigger("user:signed:in", this.mget('reconnect'));
    } else {
      Drumee.start()
    }
  }


  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    let delay = (100 * Visitor.parseModuleArgs().timeout) || 12;

    switch (pn) {
      case _a.loader:
        return child.on(_e.show, () => {
          return this.waitElement(child.el, () => {
            if (this.mget("reconnect")) {
              return;
            }
            let i = 0;
            var f = () => {
              i++;
              if (i > 100) {
                this.hello();
                return;
              }
              _.delay(f, delay);
            };

            return f();
          });
        });

      default:
        return super.onPartReady(child, pn);
    }
  }

  /**
   *
  */
  hello() {
    Visitor.clear();
    Visitor.set(this.data);
  }
}

module.exports = __welcome_interact;