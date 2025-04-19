const __router = require('.');

// ====================================== *
// gateway
// ====================================== *
class __drumee_router extends __router {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.once('top-level-ready', () => {
      edBridge.send('web-upstream-start');
    })
    require('./bridge')(this, {
      'menu-web-logout': "_logout",
      'endpoint-new': "_newEndpoint",
      'user-web-reload': "_reload",
      'ipc-web-alert': "_alert",
      'updater-web-start': "_checkUpdate",
      'endpoint-changed': "_changeEndpoint",
      "endpoint-update": "_uppdateEndpoint"
    });
  }

  /**
   * 
   */
  _logout(args) {
    Butler.logout();
  }

  /**
   * 
   */
  _changeEndpoint(bootstrap){
    this.debug("AAA:221 -- prepared", bootstrap)
    this._uppdateEndpoint({bootstrap});
    Drumee.start();
  }

  /**
   * 
   */
  _uppdateEndpoint(data) {
    let { bootstrap } = data;
    let updater = this.mget('updateBootstrap');
    if (updater && bootstrap) {
      updater(bootstrap)
    }
  }

  /**
   * 
   */
  _resetSingletons() {
    Platform.clear();
    Host.clear();
    Visitor.clear();
    Organization.clear();

  }

  /**
   * 
   */
  _newEndpoint() {
    this._resetSingletons();
    Drumee.resetBootstrap();
    Drumee.initEndpoint(1);
  }

  /**
   * 
   */
  async changeEndpoint(data) {
    let { platform, user, organization, hub } = data;
    this._resetSingletons();
    this.debug("AAA:93 -- changeEndpoint", this, { platform, user, organization, hub } );
    Platform.set(platform);
    Host.set(hub);
    Organization.set(organization);
    Visitor.set(user);
    this.selectedUsername = user.username;
    Drumee.start();
  }

  /**
  * Do not remove
  */
  changeHost() {

  }

  /**
   * 
   */
  _reload(args = {}) {
    this.debug("AAA:104 -- RELOADING", args);
    if (args.auth) {
      localStorage.setItem(_a.session, args.auth);
    }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  /**
  * 
  */
  route() {
    this.debug("AAA:129", this)
    this.loadModule();
  }


  /**
   * 
   */
  _alert(args) {
    if (_.isString(args)) {
      Butler.say(args);
    } else {
      Butler.say(args.message || args.error);
    }
  }

  /**
   * 
   */
  _checkUpdate(args) {
    Butler.message({ kind: 'electron_update', uiHanlder: Butler });
  }

}

module.exports = __drumee_router;
