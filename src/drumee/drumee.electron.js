
let BOOTSTRAP = {};

/**
 * 
 * @param {*} argv 
 * @returns 
 */
window.bootstrap = function (argv) {
  return BOOTSTRAP;
}

const __drumee = require('./drumee');
const { setAuthorization } = require("core/socket/utils")

/**
 * 
 */
function updateBootstrap(argv) {
  BOOTSTRAP = { ...BOOTSTRAP, ...argv };
  const { keysel, sid } = argv;
  setAuthorization(keysel, sid);
  delete BOOTSTRAP.sid;
}

/**
 * 
 */
function updateSocketId(socket_id) {
  Account.update({ socket_id });
}

class DrumeeUI extends __drumee {
  updateConstants() {
    let domain = bootstrap().master_domain;
    for (var item of [_K.dialtones, _K.ringtones, 'notifications']) {
      for (var k in _K[item]) {
        _K[item][k] = `https://${domain}/${_K[item][k]}`;
      }
    }
  }

  /**
   * 
   */
  resetBootstrap() {
    BOOTSTRAP = {};
  }

  /**
   * 
   */
  loadFallbackRouter(args) {
    let { lang, area } = args;
    console.log("loadFallbackRouter", this)
    Host.set({
      area,
      'fonts_faces': []
    });

    const user = {
      id: "ffffffffffffffff",
      ident: "nobody",
      username: "nobody",
      lang,
      profile: {},
      settings: {},
      disk_usage: null,
      quota: {},
      firstname: "Anonymous",
      lastname: "User",
    };

    Visitor.set(user);
    this.load_router({ user })

  }

  /**
   * 
   */
  initEndpoint(reset = 0) {
    let timer = null;

    Account.bootstrap(reset).then(async (args) => {
      this._loaded = true;
      updateBootstrap(args)
      if (timer) clearTimeout(timer);
      const { endpoint, main_domain } = args;
      if (!main_domain) {
        this.loadFallbackRouter(args);
        return;
      }
      if (!endpoint) {
        this.loadFallbackRouter(args);
        return;
      }
      this.updateConstants();

      if (args.dev) {
        setLogLevel(3);
      }
      if (args.verbose) {
        setLogLevel(4);
      }

      let yp_env = await Account.yp_env();
      this.init_globals(yp_env);
      this.load_router(yp_env);
    })
    timer = setTimeout(() => {
      if (this._loaded) return;
      console.info("Bootstrap timeout. Reloading");
      this.onStart();
    }, 4000);
  }


  /**
   * 
   * @returns 
   */
  onStart() {
    console.info("Loading Drumee engine...");
    edBridge.reset();
    this.initEndpoint(0);
    RADIO_BROADCAST.off(_e.websocketReady, updateSocketId)
    RADIO_BROADCAST.on(_e.websocketReady, updateSocketId)
  }


  /**
 * 
 * @param {*} l 
 */
  load_router(data) {
    let { user } = data;
    let { lang } = user;
    if (!lang) {
      lang = Visitor.pagelang();
    }
    const locale = require("src/drumee/widgets/electron/locale");
    require.ensure(["application"], e => {
      window.LOCALE = require("locale")(lang);
      if (_.isFunction(locale)) {
        LOCALE = { ...LOCALE, ...locale(lang) };
      }
      LOCALE.__currentLanguage = lang;
      console.log(`Selected ${lang} as UI language`);
      if (!navigator.cookieEnabled) {
        alert(LOCALE.COOKIES_REQUIRED);
        return;
      }
      const gw = require('./router/index.electron');
      this.router = new gw({ updateBootstrap });
      this.showView(this.router);
      Visitor.listenChanges();
      Organization.listenChanges();
      Visitor.respawn(user);
      if (!Backbone.History.started) Backbone.history.start();
      this._isStarting = false;
    });
  }

  /**
   * 
   */
  init_locale(yp_env, auth) {
    let language = super.init_locale(yp_env, auth);
    Account.update({ language });
  }
}

module.exports = { DrumeeUI, bootstrap };