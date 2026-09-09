/**
 * @license
 * Copyright 2025 Thidima SA. All Rights Reserved.
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


window.errorStack = [];
const { createSafeObject, xhRequest } = require("@drumee/ui-essentials");
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
    // Arriving from an OAuth provider leaves that provider's SPENT consent
    // page as the history entry directly behind the app — Google answers a
    // navigation back to it with "400 malformed, should not be retried".
    // Push one buffer entry (same URL) so the first Back lands on the app
    // again instead of that dead page. One entry only — a second Back still
    // leaves, deliberately; this just absorbs the accidental one (trackpad
    // swipe while editing a document, reported 2026-07-29). The CSS
    // overscroll-behavior guard blocks the gesture itself; this covers the
    // browser Back button and any UA that ignores overscroll-behavior.
    try {
      if (/accounts\.google\.com|appleid\.apple\.com/.test(document.referrer || "")) {
        history.pushState(history.state, "", location.href);
      }
    } catch (e) { /* history API unavailable — nothing to guard */ }
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
          return a.innerHTML = require("./template/page")("error")();
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
      window.LOCALE = createSafeObject();
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
        return a.innerHTML = require("./template/page")("403")(b, data, style);
      case 404:
        return a.innerHTML = require("./template/page")("404")(b, data, style);
      case 500:
      case 501:
      case 502:
      case 503:
      case 504:
      case 505:
        return a.innerHTML = require("./template/page")("500")(b, data, style);
      default:
        return a.innerHTML = require("./template/page")("failover")(b, data, style);
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
      const localServices = require('lex/services');
      const platformServices = Platform.get('services');
      window.SERVICE = _.merge({}, localServices, platformServices);
    } catch (e) {
      console.error("FAILED TO PARSE ENVIRONMENT DATA!", e);
      this.failover(e);
    }
  }

  /**
   * 
   * @param {*} l 
   */
  load_router(data, locale) {
    let { user } = data;
    if (!navigator.cookieEnabled) {
      alert(LOCALE.COOKIES_REQUIRED);
      return;
    }
    Visitor.listenChanges();
    Organization.listenChanges();
    if (user.id) {
      // Reconcile the recorded language with the signed-in profile.
      // `drumate.set_lang` — written only by the account menu's switcher —
      // is the source of truth WHEN IT CARRIES A VALUE: store() records it
      // and brings the ui-core keys along.
      //
      // An empty profile does not revoke a choice made in this browser. The
      // switcher writes storage before POSTing, so revoking here would
      // silently undo any switch whose server write failed. It is safe to
      // keep, because the recorded choice lives in its own key
      // (locale/supported CHOICE_KEY) that no earlier build ever wrote —
      // navigator-derived residue cannot masquerade as a choice.
      //
      // With no choice on record and no profile value, forget() purges that
      // residue and pins everything back to English, which is the guarantee
      // the older clear-both-keys version was reaching for.
      //
      // The table itself was already picked by locale/index.js from that
      // same key, before this response existed. When the profile disagrees
      // (a switch made on another device, or storage the browser cleared)
      // swap LOCALE here rather than reloading: the router is constructed a
      // few lines below and nothing has rendered yet, so the whole UI still
      // comes up in one language.
      try {
        const uiLang = require('locale/supported');
        let plang = user.lang;
        if (!plang && user.profile) {
          const p = typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile;
          plang = p && p.lang;
        }
        // Only a language we ship a complete table for counts as a choice —
        // a legacy es/km/ru/zh profile value must land on English, not on a
        // half-translated table that renders the key names back at the user.
        const chosen = plang ? uiLang.normalize(plang) : null;
        if (chosen) uiLang.store(chosen);
        else if (!uiLang.stored()) uiLang.forget();
        this.locale(uiLang.stored() || uiLang.DEFAULT_LANGUAGE);
      } catch (e) { /* storage unavailable — nothing to reconcile */ }
      Visitor.respawn(user);
    }
    const gw = require('./router');
    this.router = new gw();
    if (bootstrap().isPlugin) {
      const event = new Event('drumee:app:started');
      event.app = this;
      document.dispatchEvent(event);
    } else {
      this.showView(this.router);
      if (!Backbone.History.started) Backbone.history.start();
    }
  }

  /**
   * Read, or swap, the live string table.
   *
   * Called with no argument this is a getter. Called with a language it
   * installs that table on `window.LOCALE` — the whole point being that
   * `LOCALE` is read at render time, never captured, so replacing the object
   * is enough for everything rendered after this call. It used to be a stub
   * that returned the English table whatever it was handed, which is why the
   * account-preferences switcher appeared to do nothing.
   *
   * Swapping mid-session does NOT retranslate what is already on screen;
   * callers that need a visible change reload (see `set-ui-language` in the
   * desk module). This exists for the boot path, where nothing has rendered.
   *
   * @param {string} [lang] language to install
   * @returns {Object} the live LOCALE table
   */
  locale(lang) {
    if (!lang) {
      return LOCALE;
    }
    // locale/supported, not locale/lang: `locale/` is its own webpack entry
    // and lang.js statically requires every string table, so requiring it
    // from `main` would duplicate ~380 KB of JSON into this chunk. The table
    // itself comes from window.setUiLanguage, which the locale bundle
    // publishes precisely so this swap needs no copy of the tables.
    const l = require('locale/supported').normalize(lang);
    if (l === window.UI_LANGUAGE) return LOCALE;
    if (_.isFunction(window.setUiLanguage)) window.setUiLanguage(l);
    return LOCALE;
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
    return require("@drumee/ui-essentials");
  }
}
Drumee.initClass();


module.exports = Drumee;
