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
const { filesize } = require("core/utils")

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
    if (this.isRecconnecting) return;
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
  login(vhost) {
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
        this.feed(require("./skeleton/reconnect")(this, vhost));
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
        if (_.isFunction(this._onClose)) {
          return this._onClose();
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
  say(message, cb) {
    this.feed(require("./skeleton/message")(this, message, "info"));
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
  logout() {
    this.isDisconnecting = 1;
    Visitor.set({ connection: _a.off });
    this.feed(require("./skeleton/goodbye")(this));
    const f = () => {
      return setTimeout(() => {
        Visitor.clear();
        Host.clear();
        Drumee.start();
      }, Visitor.timeout(1000));
    };

    this.triggerHandlers({ service: _e.logout });
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
