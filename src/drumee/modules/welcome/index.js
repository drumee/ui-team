
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
    this.route();
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
    if (!bootstrap().online) {
      this.mset({
        logo: '../public/main.png'
      });
      this.feed(require('./skeleton').default(this, {
        kind: 'welcome_offline',
      }));
      return
    }
    let require_logout = 0;
    switch (this.tab) {
      case 'signup':
        if (Platform.get('isPublic')) {
          opt = { kind: 'welcome_signup' };
          if (args[2] != null) {
            opt.secret = args[2];
          } else {
            return;
          }
          if (Visitor.isOnline()) {
            this.postService({
              service: SERVICE.butler.check_token,
              secret: opt.secret
            }, { sync: 1 }).then(() => {
              opt = require('./skeleton/multiple-sessions').default(this);
              this.feed(require('./skeleton').default(this, opt));
            }
            ).catch(() => {
              opt = require('./skeleton/invalid-link').default(this);
              this.feed(require('./skeleton').default(this, opt));
            });
            return;
          }
          break;
        }

      case 'signin':
        opt = { kind: 'welcome_signin' };
        if (Visitor.parseModuleArgs().cross == 'cross') {
          opt.hack = 1;
          this.feed(require('./skeleton').default(this, opt));
          return;
        }
        break;

      case 'reset':
        opt =
          { kind: 'welcome_reset' };
        if (args[2] != null) {
          opt.uid = args[2];
          opt.secret = args[3];
        }
        require_logout = 1;
        break;

      case 'invitation':
        opt =
          { kind: 'welcome_invitation' };
        if (args[2] != null) {
          opt.secret = args[2];
        }
        return this.feed(opt);

      case 'debug': 
        this.debug('RUNNING IN DEBUG MODE');
        break;

      case 'feedback':
        opt =
          { kind: 'welcome_feedback' };
        return this.feed(require('./skeleton').default(this, opt));

      case 'intro':
        opt = require('./skeleton/signup-completed').default(this);
        this.feed(require('./skeleton').default(this, opt));
        setTimeout(() => {
          location.hash = _K.module.desk
          location.reload()
        }, 2000);
        return;

      default:
        opt = { kind: 'welcome_signin' };

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
        return location.href = `https://${Host.get(_a.domain)}${location.pathname}${_K.module.welcome}`;

      case 'close-current-connection':
        //let href = location.href;
        this.postService(SERVICE.yp.reset_session, {}, { async: 1 }).then(() => {
          location.reload();
        });
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
