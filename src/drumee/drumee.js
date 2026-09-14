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
      //
      // Precedence, in order: the choice recorded in THIS BROWSER, then the
      // account profile, then English. That order is load-bearing — see the
      // block below. The recorded choice is safe to trust because it lives in
      // its own key (locale/supported CHOICE_KEY) that no earlier build ever
      // wrote, so navigator-derived residue cannot masquerade as a choice;
      // and with nothing on record anywhere, forget() purges that residue and
      // pins everything back to English.
      //
      let resolved = null;
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
        const fromProfile = plang ? uiLang.normalize(plang) : null;
        const fromBrowser = uiLang.stored();

        if (fromBrowser) {
          // THE CHOICE MADE IN THIS BROWSER WINS, and that is the whole fix.
          //
          // It used to be the other way round — the profile overwrote the
          // local choice unconditionally — and the profile lies in two
          // ordinary situations: `drumate.set_lang` can fail (offline, DMZ,
          // no endpoint), and the page render reads the SESSION's copy of the
          // profile, which can still hold the previous value immediately
          // after a successful write. Either way it answers 'fr' right after
          // a switch back to English, and letting it win did three visible
          // things: reverted the switch, re-declared <html lang="fr">
          // mid-boot — which is what put Chrome's "translate from French?"
          // bar on an English page — and swapped the table AFTER boot had
          // already installed English, so the session rendered part English
          // and part French.
          //
          // Boot already installed exactly this language (locale/index.js
          // reads the same key), so there is nothing to swap here.
          uiLang.store(fromBrowser);
          resolved = fromBrowser;
        } else if (fromProfile) {
          // Nothing chosen in this browser, so adopt the account's choice —
          // only the switcher can have written it.
          //
          // Reload rather than swapping in place: <title>, the meta
          // description and keywords are server-rendered from this same
          // profile language (client/page.js -> DrumeeCache.lex), and a
          // swap here cannot correct them, so the whole document has to come
          // back in one language. Guarded on the write having actually
          // persisted, or a browser refusing storage would reload forever.
          uiLang.store(fromProfile);
          // `window.UI_LANGUAGE &&` matters: without a locale bundle to
          // install one it is undefined, which would differ from every
          // language and reload forever.
          if (
            window.UI_LANGUAGE &&
            fromProfile !== window.UI_LANGUAGE &&
            uiLang.stored() === fromProfile
          ) {
            return location.reload();
          }
          this.locale(fromProfile);
          resolved = fromProfile;
        } else {
          // No choice anywhere: English, and purge older builds' residue.
          uiLang.forget();
          this.locale(uiLang.DEFAULT_LANGUAGE);
          resolved = uiLang.DEFAULT_LANGUAGE;
        }
      } catch (e) { /* storage unavailable — nothing to reconcile */ }
      Visitor.respawn(user);
      // AFTER respawn, never before: respawn() re-reads `profile` straight
      // out of this response and rewrites UIlanguage from Visitor.language(),
      // so anything aligned earlier is undone here.
      // `|| window.UI_LANGUAGE`: if the block above threw (storage refused)
      // we still know which table boot installed, and the model should agree
      // with it either way.
      this._alignVisitorLanguage(resolved || window.UI_LANGUAGE);
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
   * Make `Visitor.language()` agree with the table that is actually installed.
   *
   * THIS IS THE OTHER HALF OF THE MIXED-LANGUAGE BUG. `Visitor.language()`
   * (ui-core letc/user.js) reads `profile().lang` BEFORE it looks at
   * localStorage, and `profile()` spreads `get('user')` over `get('profile')`
   * — so it answers with the server's copy, which is stale for exactly as
   * long as `drumate.set_lang` has not landed or the session still holds the
   * previous profile.
   *
   * That value is not cosmetic: 29 call sites read it. Every
   * `Dayjs...locale(Visitor.language())`, the OnlyOffice editor UI
   * (`editorConfig.lang`, player/document), the conference labels and the
   * helpdesk content all follow it. A stale 'fr' therefore renders French
   * dates and opens a French document editor inside an English UI — which is
   * the half-French session this exists to stop, and it survives every
   * reload because it is re-read from the profile each time.
   *
   * Only the in-memory model is touched. The server copy is the switcher's
   * job (`drumate.set_lang`); this just refuses to let a lagging copy of it
   * drive the UI.
   *
   * @param {string} l the installed language
   */
  _alignVisitorLanguage(l) {
    if (!l) return;
    try {
      // Parse defensively, the way ui-core's own profile() does: a malformed
      // profile string must not throw past the pin() below, which is the part
      // that keeps Visitor.language() off a stale value.
      const raw = Visitor.get(_a.profile);
      let profile = {};
      if (_.isString(raw)) {
        try { profile = JSON.parse(raw) || {}; } catch (e) { profile = {}; }
      } else if (raw) {
        profile = { ...raw };
      }
      if (profile.lang !== l) {
        profile.lang = l;
        Visitor.set(_a.profile, profile);
      }
      // profile() spreads get('user') LAST, so a `lang` in there outranks
      // what we just wrote.
      const u = Visitor.get(_a.user);
      if (u && _.isObject(u) && u.lang && u.lang !== l) {
        Visitor.set(_a.user, { ...u, lang: l });
      }
      // respawn() has just written Visitor.language() into UIlanguage; put
      // the mirrors back on the installed language.
      require('locale/supported').pin(l);
    } catch (e) { /* model shape unexpected — leave it alone */ }
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
