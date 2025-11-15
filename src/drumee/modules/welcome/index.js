
/**
 * Class representing the Welcome module.
 * @class __welcome_router
 * @extends LetcBox
*/

class __welcome_router extends LetcBox {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    window.Welcome = this;
  }

  /**
   * 
   */
  onDomRefresh() {
    const args = Visitor.parseModule();
    this.debug("AAA:26", args, this.tab)
    this.route();
  }

  /**
   * 
   */
  loadSignup() {
    const loadDefault = (opt) => {
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_signin' }));
    }

    if (Visitor.isOnline()) {
      const f = () => {
        location.hash = _K.module.desk;
      }
      setTimeout(f, Visitor.timeout(700));
      return
    }
    let plugins;
    try {
      plugins = JSON.parse(Platform.get('plugins'))
    } catch (e) {
      return loadDefault();
    }
    if (!plugins || !plugins.signup) {
      return loadDefault();
    }
    this.debug("AAA:54 GOT signup plugin", plugins.signup)
    let { name, kind } = plugins.signup;
    if (Kind.get(kind)) {
      return this.feed({ kind });
    }
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.feed({ kind });
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   * 
   */
  loadSignin() {
    const loadDefault = (opt = {}) => {
      console.trace()
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_signin' }));
    }

    if (Visitor.parseModuleArgs().cross == 'cross') {
      opt.hack = 1;
      loadDefault({ hack: 1 })
      return;
    }

    if (Visitor.isOnline()) {
      const f = () => {
        location.hash = _K.module.desk;
      }
      setTimeout(f, Visitor.timeout(700));
      return
    }
    let plugins;
    try {
      plugins = JSON.parse(Platform.get('plugins'))
    } catch (e) {
      this.warn("Failed to pase", e, JSON.parse(Platform.get('plugins')))
      return loadDefault();
    }
    if (!plugins || !plugins.signin) {
      return loadDefault();
    }
    this.debug("AAA:95 GOT signin plugin", plugins.signin)
    let { name, kind } = plugins.signin;
    if (Kind.get(kind)) {
      return this.feed({ kind });
    }
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.feed({ kind });
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   * 
   */
  loadReset() {
    const loadDefault = (opt = {}) => {
      const args = Visitor.parseModule();
      if (args[2] != null) {
        opt.uid = args[2];
        opt.secret = args[3];
      }
      require_logout = 1;
      this.feed(require('./skeleton').default(this, { ...opt, kind: 'welcome_reset' }));
    }

    if (Visitor.isOnline()) {
      this.postService(SERVICE.drumate.logout, { hub_id: Visitor.id }, { async: 1 }).then(() => {
        location.reload();
      }).catch((e) => {
        this.warn("Failed to disconnect", e)
      });
      return
    }

    try {
      plugins = JSON.parse(Platform.get('plugins'))
    } catch (e) {
      return loadDefault();
    }
    if (!plugins || !plugins.signin) {
      return loadDefault();
    }
    this.debug("AAA:GOT signin plugin", plugins.signin)
    let { name, kind } = plugins.signin;
    Kind.loadPlugin({ name, kind }).then(() => {
      Kind.waitFor(kind).then((k) => {
        this.triggerHandlers({ kind })
      })
    }).catch((e) => {
      return loadDefault();
    })
  }

  /**
   *
  */
  route() {
    let opt;
    const args = Visitor.parseModule();
    this.tab = args[1] || 'hello';

    this.waitElement(this.el, () => {
      this.el.dataset.tab = this.tab;
    });
    let require_logout = 0;
    this.debug("AAA:40", this.tab)
    switch (this.tab) {
      case 'signup':
        return this.loadSignup();

      case 'signin':
        return this.loadSignin()

      case 'reset':
        return this.loadReset()

      default:
        return this.loadSignin()
    }

    if (Visitor.isOnline()) {
      if (require_logout) {
        this.postService(SERVICE.drumate.logout, { hub_id: Visitor.id }, { async: 1 }).then(() => {
          location.reload();
        }).catch(noOperation);
        return;
      }

      const f = () => {
        location.hash = _K.module.desk;
      }
      setTimeout(f, Visitor.timeout(700));
      return
    }
    this.feed(require('./skeleton').default(this, opt));

  }


  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'wrapper-modal':
        if (localStorage.getItem('skip-browser-check')) return;
        if (!Visitor.browserSupport() || Visitor.parseModuleArgs().browser) {
          child.feed(require('./skeleton/unsupported-browser').default(this));
        }
        break;
    }
  }


  /**
   * @param {object} c
  */
  onChildBubble(c) {
    try {
      return c.clearMessage();
    } catch (error) { }
  }

  /**
   * @param {LetcBox} c
   * @param {any} args
  */
  onUiEvent(c, args = {}) {
    const service = args.service || c.service || c.mget(_a.service);
    switch (service) {
      case _e.close:
        var w = this.getPart('wrapper-modal');
        c = w.children.last();
        if ((c != null) && _.isFunction(c.goodbye)) {
          c.goodbye();
        } else {
          w.clear();
        }
        break;

      case 'skip-browser-check':
        localStorage.setItem('skip-browser-check', 1);
        location.reload()
        break;

      case 'redirect-to-home':
        const { endpoint } = bootstrap();
        return location.href = `${endpoint}${_K.module.welcome}`;

      case 'close-current-connection':
        this.postService(SERVICE.yp.reset_session, {}, { async: 1 }).then(() => {
          location.reload();
        });
        break;

      case "load-signup":
        let { kind } = args;
        this.feed(require('./skeleton').default(this, { kind }));
        break;

      case 'keep-current-connection':
        return location.hash = _K.module.desk;
    }
  }

  /**
   * @param {String} message
   * @param {object} cb
   * @param {any} args
  */
  say(message, cb, args) {
    this.getPart('wrapper-modal').feed(require('./skeleton/message').default(this, message));
    if (_.isFunction(cb)) {
      return cb(args);
    }
  }
}


module.exports = __welcome_router;
