const __welcome_interact = require('../interact');

/**
 * Class representing signup loader
 * This class is intended to load customer signup, if exists
 * @class __welcome_signup
 * @extends __welcome_interact
 */

class __welcome_signup extends __welcome_interact {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y })
  }

  /**
   *
  */
  onDomRefresh() {
    let plugins;
    const nop = (...msg) => {
      this.debug(...msg);
      this.triggerHandlers({ service: 'redirect-to-home' })
    }
    try {
      plugins = JSON.parse(Platform.get('plugins'))
    } catch (e) {
      return nop(e)
    }
    if (!plugins || !plugins.signup) {
      return nop("No plugin", plugins)
    }
    this.debug("AAA:GOT signup plugin", plugins.signup)
    let { name, kind } = plugins.signup;
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.triggerHandlers({ service: 'load-signup', kind })
      })
    }).catch((e) => {
      nop(e)
    })
  }
}

module.exports = __welcome_signup
