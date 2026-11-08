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
require("./skin");
const { getModule } = require('../modules');
const { filesize } = require("@drumee/ui-essentials")

const SEPARATOR = `<div class="mt-20 mb-20"></div>`;

class __router_butler extends LetcBox {
  constructor(...args) {
    super(...args);
    this._syncIds = this._syncIds.bind(this);
    this.clearError = this.clearError.bind(this);
    this._afterClose = this._afterClose.bind(this);
    this.logout = this.logout.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.quota = this.quota.bind(this);
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    this._forgotPassword = "";
    window.Cop = this;
    window.Keeper = this;
    window.Butler = this;
    this.startTime = new Date().getTime();
    localStorage.setItem("locationOnStart", JSON.stringify(location));
    RADIO_MEDIA.on("quota:exceeded", (args) => {
      this.quota(args)
    });
    this.router = opt.router;

  }

  /**
   *
   * @returns
   */
  onDestroy() {
    return RADIO_BROADCAST.off(_e.document.click, this._select);
  }

  /**
   *
   * @returns
   */
  onDomRefresh() {
    Visitor.on("gone:offline", this.reconnect);
  }

  /**
   *
   * @returns
   */
  sleep() {
    return this.el.setAttribute(_a.data.state, _a.closed);
  }

  /**
   *
   * @returns
   */
  wakeup() {
    return this.el.setAttribute(_a.data.state, _a.open);
  }

  /**
   *
   * @param {*} c
   * @returns
   */
  onAddKid(c) {
    return this.el.setAttribute(_a.data.state, _a.open);
  }

  /**
   *
   * @param {*} c
   * @returns
   */
  onChildDestroy(c) {
    if (!this.isEmpty()) return;
    return this.el.setAttribute(_a.data.state, _a.closed);
  }

  /**
   *
   */
  reconnect() {
    if (this.isRecconnecting || this.isDisconnecting) return;
    let { access } = getModule() || {};
    if (access != _a.private) return;
    this.isRecconnecting = true;

    this.postService(SERVICE.yp.hello).then(async (user) => {
      if (user && user.signed_in) {
        this.isRecconnecting = false;
        return;
      }
      wsRouter.ping({ type: "publishOfflineStatus" });
      RADIO_BROADCAST.once("user:signed:in", () => {
        this.isRecconnecting = false;
        let r = this.getPart("raw-content");
        if (!r) return;
        r.goodbye();
      });
      this.feed(require("./skeleton/reconnect")(this));
      this.isRecconnecting = true;
    });
  }


  /**
   *
   */
  login(vhost, title) {
    return new Promise((resolve, reject) => {
      if (this.isRecconnecting) return resolve();
      let { access } = getModule() || {};
      if (access != _a.private && !vhost) return resolve();
      this.isRecconnecting = true;

      this.postService(SERVICE.yp.hello).then(async (user) => {
        if (user && user.signed_in) {
          this.isRecconnecting = false;
          return resolve();
        }
        uiRouter.ensureWebsocket().then(() => {
          wsRouter.ping({ type: "publishOfflineStatus" });
        })
        RADIO_BROADCAST.once("user:signed:in", (s) => {
          this.isRecconnecting = false;
          resolve();
          let r = this.getPart("raw-content");
          if (!r) return;
          r.goodbye();
        });
        this.feed(require("./skeleton/reconnect")(this, vhost, title));
        this.isRecconnecting = true;
      });
    })
  }



  /**
   *
   * @param {*} child
   * @param {*} pn
   * @param {*} section
   * @returns
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "container":
      case "body":
        child.onChildDestroy = this.onChildDestroy.bind(this);
        child.onAddKid = this.onAddKid.bind(this);
        break;
      case "wrapper-error":
        return (this._errorWrapper = child);
    }
  }

  /**
   *
   * @returns
   */
  _syncIds() {
    let id = 0;
    return this._iconsList.children.each(function (c) {
      c.el.setAttribute("sort-id", id);
      return id++;
    });
  }

  /**
   *
   * @returns
   */
  clearError() {
    if (this._errorWrapper.isEmpty()) {
      return;
    }
    this._errorWrapper.clear();
    this.__password.hideError();
    return this.__ident.hideError();
  }

  /**
   *
   * @returns
   */
  _afterClose() {
    switch (this._reason) {
      case LOCALE.WEAK_PRIVILEGE:
        return (location.host = `${Visitor.get(_a.ident)}.${_K.domainName}`);
    }
  }


  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    let service;
    if (cmd.source != null) {
      service = cmd.source.mget(_a.service);
    } else {
      service = cmd.mget(_a.service);
    }
    service = args.service || service;
    //this.debug("aaa 193", service, cmd);
    switch (service) {
      case "clear-error":
        return this.clearError();

      case "log-in":
      case _e.submit:
        return this.send();

      case _e.cancel:
      case _e.confirm:
        this.trigger(service);
        this.sleep();
        break;

      case _e.close:
        this.trigger("close-content");
        this.sleep();
        // One-shot. _onClose was set and never cleared, so a callback handed to
        // say()/alert()/message() stayed armed and fired again on the close of
        // every LATER, unrelated dialog — a navigating callback would then take
        // the user somewhere the second dialog said nothing about.
        if (_.isFunction(this._onClose)) {
          const done = this._onClose;
          this._onClose = null;
          return done();
        }
        break;

      case "close-reconnect":
        location.reload()
        break;

      case _e.restart:
        return this.reload();
    }
  }



  /**
   *
   * @returns
   */
  reload() {
    this.el.dataset.state = _a.open;
    this.feed(require("./skeleton/main")(this));
    return this.trigger(_e.load);
  }

  /**
   *
   * @param {*} message
   * @param {*} cb
   * @returns
   */
  say(message, cb, opt = {}) {
    this.feed(require("./skeleton/message")(this, message, "info", opt));
    this.el.dataset.state = _a.open;
    if (_.isFunction(cb)) {
      return (this._onClose = cb);
    }
  }

  /**
  *
  * @param {*} message
  * @param {*} cb
  * @returns
  */
  confirm(message) {
    return new Promise((resolve, reject) => {
      this.feed(require("./skeleton/confirm")(this, message));
      this.el.dataset.state = _a.open;
      this._onConfirm = resolve;
      this._onCancel = reject;
      this._reject = () => {
        this.off(_e.cancel, this._resolve);
        reject();
      }
      this._resolve = () => {
        this.off(_e.cancel, this._reject)
        resolve();
      }
      this.once(_e.confirm, this._resolve);
      this.once(_e.cancel, this._reject);
    })
  }

  /** */
  quota(args = {}) {
    let { type, content, title } = args;
    content = content || LOCALE.SANDBOX_LIMITS_TIPS;
    const {
      disk, private_hub, share_hub, team_call: duration
    } = Visitor.quota();
    switch (type) {
      case "disk":
        content = content + SEPARATOR +
          LOCALE.QUOTA_DISK.format(filesize(disk))
        break;
      case "conference":
        let minutes = Dayjs.duration(duration, 'seconds').format("mm");
        content = content + SEPARATOR +
          LOCALE.QUOTA_CONFERENCE.format(minutes)
        break;
      case "private_hub":
        content = content + SEPARATOR +
          LOCALE.QUOTA_PRIVATE_HUB.format(private_hub)
        break;
      case "dmz_hub":
        content = content + SEPARATOR +
          LOCALE.QUOTA_DMZ_HUB.format(share_hub)
        break;
    }
    return new Promise((resolve, reject) => {
      this.once("close-content", () => {
        resolve();
      });
      this.feed(require("./skeleton/quota")(this, { content, title }));
      this.el.dataset.state = _a.open;
    })
  }

  /**
   *
   * @param {*} message
   * @param {*} opt
   * @param {*} cb
   * @returns
   */
  alert(message, opt, cb) {
    if (opt == null) {
      opt = {};
    }
    this.feed(require("./skeleton/alert")(this, message, opt));
    this.el.dataset.state = _a.open;
    if (_.isFunction(cb)) {
      return (this._onClose = cb);
    }
  }

  /**
   *
   * @param {*} message
   * @param {*} cb
   * @returns
   */
  wip(message, cb) {
    this.feed(require("./skeleton/message")(this, message, "warn"));
    if (_.isFunction(cb)) {
      return (this._onClose = cb);
    }
  }

  /**
   *
   */
  message(content, cb) {
    this.feed(require("./skeleton/raw")(this, content));
    if (_.isFunction(cb)) {
      return (this._onClose = cb);
    }
  }

  /**
   *
   * @param {*} redirect
   */
  /**
   * Move the goodbye screen's progress bar (skeleton/goodbye.js).
   *
   * getPart, not ensurePart: this is only ever called after the skeleton is
   * up, and a bar that cannot be found must not hold up a sign-out. Every
   * call is advisory — logout completes whether or not anything is painted.
   *
   * @param {Number} percent 0-100
   */
  _logoutProgress(percent) {
    try {
      const p = this.getPart && this.getPart("goodbye-progress");
      if (p && p.el) p.el.style.width = `${percent}%`;
    } catch (e) { /* non-fatal — the bar is never the point of logging out */ }
  }

  /**
   * Forget where the signed-out account was standing.
   *
   * The address bar mirrors the current folder (libs/location-url):
   * "#/desk/wm/o/<nid>/<hub_id>/folder". Logout left it there, and the restart
   * carried it on — logout then also switched hosts (`location.hostname = …`,
   * which keeps path AND hash). On the main domain's fresh document the
   * history-state mark is gone, so file-deep-link.captureFromUrl() armed the
   * hash as a link "sent" to the next visitor; the next sign-in's changeHost()
   * then carried it to that account's host and wm opened it — a different
   * account, not a member → DESIGNATION_LINK_NO_ACCESS, then a bounce to its
   * own default workspace (stage, yipejo5194 after h0anghu7n, 2026-11-07).
   *
   * Dropped: the hash and any armed file-deep-link relay. The remembered desk
   * screen is not dropped but set aside for `uid` (libs/signed-out-location):
   * the SAME account signing back in lands where it left, as after a reload;
   * any other account finds nothing. A link genuinely opened signed out is
   * armed when it is OPENED, never here.
   *
   * @param {String} uid the account signing out
   */
  _dropAccountLocation(uid) {
    try {
      history.replaceState(null, "", "#/welcome/signin");
    } catch (e) { /* history unavailable — nothing to drop */ }
    try {
      require("libs/file-deep-link").clear();
    } catch (e) { /* storage blocked — nothing was stored either */ }
    require("libs/signed-out-location").stash(uid);
  }

  /**
   * Keep the goodbye screen on top until the sign-in form has painted.
   *
   * Drumee.start() replaces this router — and the goodbye screen with it — as
   * soon as yp.get_env answers, but the sign-in page only paints once the
   * welcome module and its signin plugin have loaded. In between, nothing: a
   * blank page. A cross-host logout hid that gap behind the browser's boot
   * loader; an in-place restart has no such cover, so bring our own.
   *
   * A detached copy of the screen, pinned over the viewport outside #--router
   * (the new router cannot remove it), lifted when the welcome module holds an
   * input — the sign-in form, plugin or built-in. Bounded, so a sign-in page
   * that never comes can never leave the visitor stuck behind it.
   */
  _holdGoodbyeUntilSignin(maxWait = 10000) {
    let veil;
    try {
      const screen = this.el.querySelector(".router-butler-goodbye__main");
      if (!screen) return;
      veil = screen.cloneNode(true);
      Object.assign(veil.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483000",
        display: "flex",
      });
      document.body.appendChild(veil);
    } catch (e) {
      return;
    }
    let observer = null;
    let timer = null;
    const lift = () => {
      if (observer) observer.disconnect();
      clearTimeout(timer);
      // One frame later, so the form has been painted under the veil.
      requestAnimationFrame(() => veil.remove());
    };
    const painted = () => !!document.querySelector(".welcome-router input");
    timer = setTimeout(lift, maxWait);
    if (typeof MutationObserver !== "function") return;
    observer = new MutationObserver(() => {
      if (painted()) lift();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   *
   * @param {*} redirect
   */
  async logout() {
    // Remember where this account stands NOW, while the desk is still up: the
    // pagehide snapshot is from the last page load at best, and none is taken
    // once isDisconnecting is raised. Set aside for this uid only — see
    // _dropAccountLocation.
    const uid = Visitor.id;
    try {
      if (window.Desk && _.isFunction(window.Desk._persistDeskState)) {
        window.Desk._persistDeskState();
      }
    } catch (e) { /* nothing remembered — the next sign-in lands on home */ }
    this.isDisconnecting = 1;
    this.feed(require("./skeleton/goodbye")(this));
    await this.ensurePart('disconnected') /** Ensure the skeloton is loaded, it will be detected as disconnecting */
    // THE ONLY TWO THINGS THIS SCREEN ACTUALLY KNOWS. The screen is up, and
    // later the session is ended; there is no third milestone to invent. The
    // opening 15% is the honest reading of "asked, not answered" — a bar that
    // starts at 0 and holds there reads as broken.
    this._logoutProgress(15);
    const f = () => {
      // Straight to 100 rather than in steps: the work is over by the time f
      // runs, and what remains is the Visitor.timeout(1000) wait below. The
      // fill's 1s transition (skin/goodbye.scss) spans exactly that, so the
      // bar lands full as the redirect fires instead of freezing part-way.
      this._logoutProgress(100);
      this.triggerHandlers({ service: _e.logout });
      Visitor.set({ connection: _a.off });
      return setTimeout(() => {
        Visitor.clear();
        Host.clear();
        // The session read cache goes with the session (libs/read-cache).
        require("libs/read-cache").clear();
        this._dropAccountLocation(uid);
        // Restart IN PLACE, on whatever host this is. An organisation's own
        // host (yipejo5194.drumee.in, team-NNNN.drumee.com) used to bounce to
        // the main domain with `location.hostname = main_domain` — a full page
        // load behind the goodbye screen, so every sign-out showed two loading
        // screens. The sign-in form works on the organisation's host as well;
        // a member of another organisation signing in there is sent on by the
        // router's changeHost, exactly as from the main domain.
        this._holdGoodbyeUntilSignin();
        Drumee.start();
      }, Visitor.timeout(1000));
    };

    this.postService(SERVICE.drumate.logout, {
      hub_id: Visitor.id,
    }).then(f).catch((e) => {
      this.warn("Normal logout has failed. Proceeding to reset session", e);
      this.postService(SERVICE.yp.reset_session, {
        hub_id: Visitor.id,
      }).then(f).catch((e) => {
        this.warn("LOGOUT_ERROR", e);
        this.say(e);
      });
    });
  }


  /**
   *
   * @returns
   */
  // _restricted_access() {
  //   if (location.hash.match(_reserved_hash)) {
  //     return __d.session === _a.anon;
  //   }
  //   return false;
  // }


}

module.exports = __router_butler;
