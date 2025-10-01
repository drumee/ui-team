// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/main
//   TYPE :
// ==================================================================== *

require('./core');
window.errorStack = [];
const { xhRequest } = require("core/socket/request");
const { version } = require('../../package.json')
class Drumee extends Marionette.Application {

  static initClass() {
    this.prototype.region = '#--router';
    this.prototype.version = version;
  }

  /**
   * 
   */
  onStart() {
    xhRequest(`yp.get_env`).then((r) => {
      if (!r || r.__status != 200 || r.response?.error) {
        return this.failover(r.response);
      }
      this.route(r);
    }).catch((r) => {
      console.error("Failed to setup initial environment", r);
      this.failover(r);
    })
  }

  /**
   * 
   * @returns 
   */
  route(r) {
    switch (r.__status) {
      case 200:
        this.init_globals(r.data);
        this.load_router(r.data);
        return;
      default:
        return this.failover(r.data);
    }
  }

  /**
   * 
   * @param {*} response 
   * @returns 
   */
  error(response) {
    switch (response.error) {
      case 'HUB_NOT_FOUND':
        if (bootstrap().main_domain) {
          debugger;
          return location.host = bootstrap().main_domain;
        } else {
          const a = document.getElementById('--router');
          return a.innerHTML = require("./template/page/error")();
        }
      default:
        return this.failover(data);
    }
  }

  /**
   * 
   * @returns 
   */
  failover(data = {}) {
    console.warn("ENV_ERROR", data);
    if (!window.LOCALE) {
      window.LOCALE = require("locale")(navigator.language);
    }
    let b = bootstrap();
    const { body } = document;
    const { protocol, main_domain } = b;
    let bgImg = `${protocol}://${main_domain}/-/images/background/drumee-pro-background.jpg`;
    body.style.height = "100vh";
    body.style.width = "100vw";
    body.style.alignContent = "center";
    body.style.alignItems = "center";
    body.style.justifyContent = "center";
    body.style.justifyItems = "center";
    body.style.display = "flex";
    body.style.flexDrection = "column";
    body.style.background = `url(${bgImg})`;
    body.style.color = "white";
    body.style.lineHeight = 1.5;
    body.style.fontSize = "24px";
    body.style.fontFamily = "Roboto-Regular,sans-serif";
    const a = document.getElementById('--router');
    a.style.margin = "auto";
    a.style.width = "100%";
    a.style.alignContent = "center";
    a.style.textAlign = "center";
    let style = `text-decoration: none; color:white`;
    console.trace()
    switch (data.status) {
      case 403:
        return a.innerHTML = require("./template/page/403")(b, data, style);
      case 404:
        return a.innerHTML = require("./template/page/404")(b, data, style);
      case 500:
      case 501:
      case 502:
      case 503:
      case 504:
      case 505:
        return a.innerHTML = require("./template/page/500")(b, data, style);
      default:
        return a.innerHTML = require("./template/page/failover")(b, data, style);
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  init_globals(data) {
    let { hub, user, platform, organization } = data;
    try {
      hub.privilege = parseInt(data.privilege);
      Host.set(hub);
      Platform.set(platform);
      Visitor.set(user);
      Organization.set(organization)
      window.currentDevice = Visitor.device();
      window.SERVICE = require('lex/services');
      SERVICE = { ...SERVICE, ...Platform.get('services') }
    } catch (e) {
      console.error("FAILED TO PARSE ENVIRONMENT DATA", e);
      this.failover(e);
    }
    console.log("AAA:138", data, SERVICE)
  }

  /**
   * 
   * @param {*} l 
   */
  load_router(data, locale) {
    let { user } = data;
    let { lang } = user;
    if (!lang) {
      lang = Visitor.language();
    }
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
      const gw = require('./router');
      this.router = new gw();
      this.showView(this.router);
      Visitor.listenChanges();
      Organization.listenChanges();
      if (user.id) {
        Visitor.respawn(user);
      }
      if (!Backbone.History.started) Backbone.history.start();
    });
  }

  /**
   * 
   */
  locale(lang) {
    if (!lang) {
      return LOCALE;
    }
    LOCALE = require("locale")(lang);
    LOCALE.__currentLanguage = lang;
    return LOCALE;
  }

  /**
   * 
   */
  loadSprites() {
    function create_el(content) {
      const el = document.createElement(_K.tag.div);
      el.style = "display:none !important";
      el.style.cssText = "display:none !important";
      el.innerHTML = content;
      document.body.insertBefore(el, document.body.childNodes[0]);
    }
    let raw = require('../../bb-templates/svg/raw.sprite.txt').default;
    let normalized = require('../../bb-templates/svg/normalized.sprite.txt').default;
    create_el(raw);
    create_el(normalized);
  }


  /**
   * 
   * @returns 
   */
  not_found() {
    return location.href = _K.page_not_found;
  }

  /**
   * 
   */
  utils() {
    return require("core/utils");
  }
}
Drumee.initClass();


module.exports = Drumee;
