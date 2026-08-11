/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
require("./skin/resizable.css");
require("builtins/contextmenu/skin/index.scss");
require("./skin");

const { getModule, moduleName } = require('./modules');
const { captureCampaignArrival } = require('libs/campaign');
const billingDeepLink = require('libs/billing-deep-link');

class drumee_router extends LetcBox {
  constructor(...args) {
    super(...args);
    // this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    // this.onDomRefresh = this.onDomRefresh.bind(this);
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
    super.initialize(opt);
    this._contextmenu = true;
    this._origin = {};
    this._mainBarreShown = false;
    this.declareHandlers();
    // Cold arrival on a campaign link. Recorded before ANY module resolves: the
    // signin plugin replaces the hash wholesale with "#/welcome/signin", so the
    // markers are gone by the time a module could look for them.
    captureCampaignArrival();
    // Same reason, same moment: "#/desk/billing" must be remembered before the
    // signin plugin replaces the hash, or a signed-out visitor loses the
    // destination the link named.
    billingDeepLink.captureFromUrl();
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

    this._boundRoute = this.route.bind(this);
    window.onhashchange = this._boundRoute;
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
    if (window.onhashchange === this._boundRoute) {
      window.onhashchange = null;
    }
  }

  /**
  * 
  * @param {*}  
  */
  setWallpaper(data) {
    if (data) {
      Visitor.respawn(data);
    }
    require("./skin/themes/light");
    require("./skin/themes/dark");
    // Display mode (light/dark/system) — single source of truth. Applies the
    // stored preference and wires the OS listener when set to "system".
    require("./theme").initTheme();
  }

  /**
   * 
   */
  // _initFonts() {
  //   let font;
  //   if (!_.isEmpty(Host.get('fonts_links'))) {
  //     for (font of Array.from(Host.get('fonts_links'))) {
  //       if (font != null) {
  //         appendLink(font.url);
  //       }
  //     }
  //   }
  //   for (font of Array.from(Host.get('fonts_faces'))) {
  //     if (font != null) {
  //       appendFontFace(Host.get('fonts_faces'));
  //     }
  //   }
  // }

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
        // Visitor (ui-core __core_user) defines changePageLang — capital L;
        // changePagelang exists only on Host. The old call threw TypeError,
        // so a user flipped into the wrong language could never switch back
        // through this control.
        return Visitor.changePageLang(c.mget(_a.value));
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
    // Secure-share recipients who signed in from a share link return to that
    // shared folder instead of the desk. The target is validated + stashed by
    // the welcome module (_secureShareReturnTarget). Handle it here so we don't
    // route()/changeHost to the desk or org host and strand them — those run on
    // the same user:signed:in event and were winning the navigation race against
    // the welcome once-handler. Only a fresh login (reconnect falsy) sets/uses
    // this, so it can never fire on a reconnect, and the flag is one-shot.
    if (this._secureShareReturn) {
      const _target = this._secureShareReturn;
      this._secureShareReturn = null;
      location.href = _target;
      return;
    }
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
    this.debug("currentModule", moduleName(), this.currentModule)
    this.ensurePart('body').then(async (p) => {
      await Kind.waitFor(kind);
      if (this.currentKind === kind && this.currentModule && !this.currentModule.isDestroyed()) {
        this.debug("Forwarding routing to", kind, moduleName(), this.currentModule)
        this.currentModule.route()
        return;
      }
      p.feed({ kind, name });
      this.currentModule = p.children.last();
      this.currentKind = kind;
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
    // Warm arrival: clicking the CTA in a tab that already has the app running
    // is a same-document navigation, so only hashchange fires and initialize()
    // never runs again. Capturing at boot alone missed that entirely — which is
    // the usual case, since the recipient is normally already on a Drumee page.
    // A no-op when the URL carries no campaign params.
    captureCampaignArrival();
    // Warm arrival for the billing link too — clicking it in a tab that
    // already runs the app never re-enters initialize().
    billingDeepLink.captureFromUrl();
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
    // GA4 screen, reported here rather than automatically: the tag is
    // configured send_page_view:false to match drumee.com, and this is a hash
    // router, so nothing after the first screen would be counted otherwise.
    // Below the two redirect branches above on purpose — a bootstrap page or a
    // changeHost is a URL we are leaving, not one anybody looked at. Deduped
    // and self-gating; off a drumee.com host it does nothing. See libs/gtag.
    require('libs/gtag').pageView();
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
