/*
   Copyright Xialia.com  2011-2021
   FILE : src/drumee/router/gateway
   TYPE :
 */

require("./skin/resizable.css");
require("builtins/contextmenu/skin/index.scss");
// require("jquery-ui/ui/core");
// require("jquery-ui/ui/widget");
require("skin/global/common");
const { appendFontFace, appendLink } = require("core/utils");
const { getModule, moduleName } = require('./modules');

class drumee_router extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.restart = this.restart.bind(this);
    this.responsive = this.responsive.bind(this);
    this.setWallpaper = this.setWallpaper.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this._contextmenu = true;
    this._origin = {};
    this._mainBarreShown = false;
    this.declareHandlers();
    localStorage.main_domain = bootstrap().main_domain;
    this._buffer = [];
    this._loaded = {
      sys: {},
      usr: {}
    };
    if (Host.get(_a.area) === _a.public) {
      Host.set(_a.icon, "unlock");
    } else {
      Host.set(_a.icon, "lock");
    }
    this.model.atLeast({
      flow: _a.vertical,
      justify: _a.top,
      is_gateway: true
    });

    this.initEnv();
    this._buildwidth = {
      desktop: 1280,
      mobile: 512
    };
    this._wallpaper = {};
    this._responsive = w => {
      return this.responsive(w);
    };
    RADIO_BROADCAST.on(_e.responsive, this._responsive);
    RADIO_BROADCAST.on("user:signed:in", this.restart.bind(this));
    window.uiRouter = this;

    window.onhashchange = this.route.bind(this);
  }

  /**
   * 
   */
  initEnv() {
    localStorage.cache_control = Host.settings().cache_control;
    Env.set('wm-radio', _.uniqueId('wm-radio-'));
  }


  /**
 *
 * @param {*} p
 * @returns
 */
  checkAccessLevel(p) {
    p = p || getRequiredPrivilege();
    const rp = p.required_privilege;
    switch (Host.get(_a.area)) {
      case "personal":
      case _a.private:
        if ((rp & Host.get(_a.privilege)) >= rp) {
          return true;
        }

        if (!Visitor.isOnline()) {
          this.login();
          return false;
        }
        break;

      case _a.public:
        if (!Visitor.isOnline() && p.require_login) {
          this.login();
          return false;
        }
        return true;

      default:
        if (p.require_login) {
          this.login();
          return false;
        }
    }
    return true;
  }

  /**
   * 
   */
  onBeforeDestroy() {
    RADIO_BROADCAST.off(_e.responsive, this._responsive);
    window.onhashchange = null;
  }

  /**
  * 
  * @param {*}  
  */
  setWallpaper(opt) {
    let wallpaper;
    if (this.isDmz()) {
      wallpaper = Organization.deskWallpaper();
    } else {
      wallpaper = Visitor.wallpaper() || Organization.deskWallpaper();
    }

    if (JSON.stringify(this._wallpaper) == JSON.stringify(wallpaper)) {
      return
    }
    this._wallpaper = wallpaper;
    this.ensurePart('wallpaper').then((p) => {
      let kind = 'drumee_background';
      if (wallpaper) {
        p.feed({ ...wallpaper, kind });
      }
    })
  }

  /**
   * 
   */
  _initFonts() {
    let font;
    if (!_.isEmpty(Host.get('fonts_links'))) {
      for (font of Array.from(Host.get('fonts_links'))) {
        if (font != null) {
          appendLink(font.url);
        }
      }
    }
    for (font of Array.from(Host.get('fonts_faces'))) {
      if (font != null) {
        appendFontFace(Host.get('fonts_faces'));
      }
    }
  }

  /**
   * 
   * @returns 
   */
  _makeTempEl() {
    const id = "--" + Host.get(_a.id);
    if (!document.getElementById(id)) {
      const el = document.createElement(_K.tag.div);
      el.style = "display:none !important";
      el.style.cssText = "display:none !important";
      el.setAttribute(_a.id, id);
      return document.body.appendChild(el);
    }
  }

  /**
   * 
   */
  async onDomRefresh() {
    this._innerWidth = window.innerWidth;
    this._scrollBarWidth = window.outerWidth - this._innerWidth;
    if (this._scrollBarWidth < 0) {
      this._scrollBarWidth = 0;
    }

    this.isReady = false;
    this.feed(require("./skeleton")(this));

    this._makeTempEl();
    //this._initFonts();
    this.content = await this.ensurePart('body');
    await this.ensurePart('butler');
    this.isReady = true;
    this.setWallpaper();
    this.route();
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'dialog':
        window.drumeeDialog = child;
        break;
    }
  }

  /**
   * 
   * @param {*} c 
   * @returns 
   */
  onUiEvent(c) {
    const svc = c.mget(_a.service);
    switch (svc) {
      case "acknowledge":
        return this.getPart(_a.tooltips).clear();
      case "set-lang":
        return Visitor.changePagelang(c.mget(_a.value));
    }
  }

  /**
   * 
   */
  repaint() {
    this.feed(require("./skeleton")(this));
  }
  /**
   * 
  */
  async restart(reconnect) {
    if (reconnect) return;
    this._wallpaper = {};
    this.currentModule = null;
    this.route();
    this.setWallpaper();
  }


  /**
   * 
   */
  isDmz() {
    return (/^(dmz|share)$/.test(bootstrap().area))
  }

  // /**
  //  * 
  //  */
  // defaultWallpaper() {
  //   const { appRoot } = bootstrap();
  //   let base = appRoot + "/images/background/";
  //   if (this.isDmz()) {
  //     return {
  //       url: base + 'dmz-sharebox-background.jpg',
  //       preview: base + 'dmz-sharebox-wallpaper-preview.jpg'
  //     }
  //   }
  //   return {
  //     url: base + 'welcome-wallpaper.png',
  //     preview: base + 'welcome-wallpaper-preview.png'
  //   }
  // }

  /**
* 
* @returns 
*/
  ensureWebsocket() {
    return new Promise((resolve, reject) => {
      if (this.get('noWebsocket')) {
        return resolve({ ready: 1 });
      };
      let timer;
      this.ensurePart('websocket').then((ws) => {
        if (ws.isOk()) {
          clearInterval(timer);
          return resolve({ ready: 1 });
        }
        ws.once(_e.connect, () => {
          clearInterval(timer);
          resolve({ ready: 1 });
        })
      })
      timer = setInterval(() => {
        if (!this.__websocket) return;
        clearInterval(timer);
      }, 7500)
    });
  }

  /**
   * 
  */
  changeHost(host) {
    const { loose_host } = getModule();
    this.debug("AAAA:310", { loose_host })
    if (loose_host) {
      return false;
    }
    if (this.isDmz()) return false;
    location.host = host;
    return true;
  }


  /**
   * 
   * @returns 
   */
  loadModule() {
    let name = moduleName();
    let { kind, access } = getModule(name);
    if ((!kind)) {
      if (location.hash.match(/^\#\//)) {
        Butler.say(name.printf(LOCALE.MODULE_NOT_FOUND));
        return true;
      }
      if (!Visitor.isOnline()) {
        kind = 'module_welcome';
      } else {
        kind = 'module_desk';
      }
    }
    if (access == _a.private) {
      if (!Visitor.isOnline()) {
        kind = 'module_welcome';
      }
    }
    this.ensurePart('body').then(async (p) => {
      await Kind.waitFor(kind);
      p.feed({ kind, name: name });
      this.currentModule = p.children.last();
    })
  }

  /**
   * 
   */
  loadBootstrap() {
    const event = new Event('drumee:router:ready');
    event.root = this.content;
    document.dispatchEvent(event);
  }


  /**
   * 
   */
  route() {
    let page = /^\/.*(.+)\.htm?/;
    if (page.test(location.pathname) || page.test(Host.get(_a.homepage))) {
      this.loadBootstrap();
      return true;
    }
    let [hostname] = location.host.split(':'); /** In case specific port */
    if (Visitor.isOnline() && hostname != Organization.host()) {
      if (this.changeHost(Organization.host())) {
        return;
      }
    }
    let name = moduleName();
    const cm = this.currentModule;
    if (cm && !cm.isDestroyed() && cm.mget(_a.name) == name) {
      return cm.route()
    }

    this.loadModule();
  }

  /**
   * 
   * @param {*} w 
   * @returns 
   */
  responsive(w) {
  }


}

module.exports = drumee_router;
