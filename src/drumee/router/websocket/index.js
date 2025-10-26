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
const W3CWebSocket = require("websocket").w3cwebsocket;
const WEBSOCKET_ERROR = "websocket:error";
const WEBSOCKET_MESSAGE = "websocket:message";
const RECONNECT_INTERVAL = 5000;

window.W3CWebSocket = W3CWebSocket;
let TIMESTAMP = new Date().getTime();

function __processMessage__(msg = {}) {
  if (this.isDestroyed()) {
    this.warn(this, `with cid=${this.cid} is no longer alive !!!!.`);
    this.unbindEvent();
    return;
  }
  let payload = msg.data || msg;
  let service = payload.service || msg.service;
  let options = payload.options || {};
  let model = payload.model;
  this.gossip(`[processMessage] service=${service}`, options, model);
  TIMESTAMP = new Date().getTime();
  this.triggerMethod(WEBSOCKET_MESSAGE, msg);
  if (this.onWsMessage) {
    return this.onWsMessage(service, model, options);
  }
}

class __router_websocket extends LetcBox {
  initialize(opt) {
    this.model.set({
      flow: _a.none,
      position: _a.absolute,
      style: {
        // Out of screen by default
        top: window.screen.availWidth + 100,
        left: window.screen.availHeight + 100,
      },
    });

    super.initialize(opt);

    this.bindEvent = this.bindEvent.bind(this);
    this.unbindEvent = this.unbindEvent.bind(this);
    this.restart = this.restart.bind(this);
    this.keepAlive = this.keepAlive.bind(this);
    this.onLinkUp = this.onLinkUp.bind(this);
    this.onLinkDown = this.onLinkDown.bind(this);

    this.model.set({
      entity: Visitor.id,
    });
    this._listeners = new Map();
    this._senders = new Map();
    window.wsRouter = this;
    RADIO_NETWORK.trigger(_e.websocketReady, this);
    this.reconnectTimer = RECONNECT_INTERVAL;
    this._reconnect_count = 0;
    this.keepAlive();
    window.addEventListener("online", this.onLinkUp);
    window.addEventListener("offline", this.onLinkDown);
    RADIO_BROADCAST.on("user:signed:in", () => {
      this.restart(1)
    });

  }

  /**
   *
   */
  onLinkUp() {
    this.restart(1);
    Butler.clear();
    this.once(_e.connect, this.keepAlive);
  }

  /**
   *
   */
  onLinkDown() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
    }
    Butler.say(LOCALE.NETWORK_IS_OFF);
    this.watchdogTimer = null;
    this.resetSocket();
  }

  /**
   *
   */
  switchOn(data) {
    this.debug("AAA:91", data)
    if (data.user) {
      Visitor.set(data.user);
    } else {
      Visitor.set(data);
    }
    if (data.socket_id) {
      Visitor.set(_a.socket_id, data.socket_id);
    }
    this.trigger(_e.connect);
    this.socketBound = 1;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
  }

  /**
   *
   * @param {*} opt
   * @returns
   */
  onDestroy(opt) {
    window.removeEventListener("online", this.onLinkUp.bind(this));
    window.removeEventListener("offline", this.onLinkDown.bind(this));
    return this.unbindEvent(_a.sys, _a.drumate, this);
  }

  /**
   *
   * @param {*} type
   * @param {*} args
   * @returns
   */
  url(opt) {
    if (this.mget(_a.url) && !opt) return this.mget(_a.url);
    opt = opt || {};
    let { token } = opt;
    let { websocketApi } = bootstrap();
    console.log("AAA:162", { websocketApi })
    /** One Time Access Key*/
    if (token) {
      token = `&otak=${token}`;
    } else {
      token = "";
    }
    return `${websocketApi}?${token}`;
  }

  /**
   *
   */
  resetSocket(client) {
    this.socketBound = 0;
    if (this.socket) {
      if (this.socket.readyState === this.socket.OPEN) {
        this.socket.close();
      }
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket = null;
    }
    if (client) this.socket = client;
    //this.debug("AAAX:153 Binding", this.socket, this);
  }

  /**
   * 
   * @returns 
   */
  lastTimestamp() {
    return TIMESTAMP
  }

  /**
   * 
   * @returns 
   */
  timestampAge() {
    return new Date().getTime() - TIMESTAMP;
  }

  /**
   *
   * @param {*} client
   * @returns
   */
  _bind(client) {
    this.resetSocket(client);
    this._reconnect_count++;
    return new Promise(async (resolve, reject) => {
      if (!client) {
        reject({ error: "got undefined socket" });
        this.warn("ERROR:166 - got undefined socket");
        return;
      }
      if (this._reconnect_count > 50) {
        let error = "Too many reconnections failed. Giving up";
        setTimeout(() => {
          this._reconnect_count = 0;
        }, 10 * 1000)
        this.warn(error);
        reject({ error });
        return;
      }
      client.onopen = (e) => {
        this._shutdown = 0;
        RADIO_NETWORK.trigger(_e.change);
        this.trigger(_e.connect);
        this.reconnectTimer = Visitor.timeout(RECONNECT_INTERVAL);
        this._reconnect_count = 0;
        this.timer = null;
        resolve(client);
      };

      client.onmessage = (e) => {
        let args;
        try {
          args = JSON.parse(e.data);
        } catch (error) {
          e = error;
          this.warn("Error raised in message dispatching", e);
          return;
        }
        if (args.sender != null) {
          sender_id = args.sender.id;
        }
        if (args.error) {
          this.warn("GOT WdS ERROR", args);
          this.triggerError(args);
          return;
        }
        const data = args.data || args;
        const s = args.service || _e.data;
        const [module_name, method_name] = Array.from(s.split("."));
        const conf = require("./services")(module_name, method_name, data);

        const event = conf.event || module_name;
        if (event == _a.sys) {
          this.__dispatchPush(args.service, args.data);
        } else {
          this.trigger(event, args);
        }
      };

      client.onerror = (e) => {
        this.warn("Websocket encounted error", e);
        this.trigger(_e.error, "connect_error");
        this.socketBound = 0;
        if (client.readyState !== client.OPEN) {
          this.reconnectTimer = parseInt(this.reconnectTimer * 3);
          this.timer = setTimeout(
            this.connect.bind(this),
            Visitor.timeout(this.reconnectTimer)
          );
        }
      };

      client.onclose = (e) => {
        this.socketBound = 0;
        if (this._shutdown) {
          this.trigger("shutdown");
          return;
        }
        this.warn("WebSocket CLOSE !", e);
        RADIO_NETWORK.trigger(_e.offline, this);
        this.reconnectTimer = Visitor.timeout(RECONNECT_INTERVAL);
        this.timer = setTimeout(
          this.restart.bind(this),
          Visitor.timeout(this.reconnectTimer)
        );
      };
    });
  }

  /**
   *
   * @param {*} reconnecting
   * @returns
   */
  connect() {
    const { endpoint, main_domain } = bootstrap();
    if (!endpoint || !main_domain) return;
    if (this._reconnect_count > 50) {
      this.warn("Too many reconnections failed. Giving up");
      return;
    }
    if (this.timer) {
      this.warn("Already connection pending. Skipped");
      this.timer = null;
    }
    this.postService(SERVICE.bootstrap.authn).then((r) => {
      if (r.otp_key) {
        Visitor.set({ otp_key: r.otp_key });
      }
      let url = this.url(r);
      this._bind(new W3CWebSocket(url, _a.service));
    }).catch((e) => {
      this.warn("ERROR:292 - failed to connect websocket", e)
      let url = this.url({});
      this._bind(new W3CWebSocket(url, _a.service));
    })
  }

  /**
   *
   * @param {*} reconnecting
   * @returns
   */
  restart(force = 0) {
    if (force) this._reconnect_count = 0;
    if (!force && this.isOk()) return;
    this.connect()
  }

  /**
   *
   * @returns
   */
  isOk() {
    return (
      this.socketBound &&
      this.socket &&
      this.socket.readyState == this.socket.OPEN
    );
  }

  /**
   *
   */
  triggerError(args) {
    this.warn("GOT WS ERROR", args);
    if (args.cid) {
      let target = this._senders.get(args.cid);
      let s = WEBSOCKET_ERROR;
      if (!target) {
        this.trigger(s);
      } else {
        target.triggerMethod(s, args);
      }
    }
    //this.triggerError(_e.error, args);
  }

  /**
   *
   */
  onDomRefresh() {
    this.connect();
  }

  /**
   *
   */
  check_revision() { }

  /**
   *
   * @returns
   */
  check_sanity() {
    if (!this.socket) {
      this.trigger(_e.error, "connect_error");
      return false;
    }
    if (this.socket.readyState === this.socket.OPEN) {
      return true;
    }
    this.trigger(_e.error, "connect_error");
    return false;
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  ping(args, service = "ping") {
    const number = Math.round(Math.random() * 0xffffff);
    const msg = JSON.stringify([`sys.${service}`, { serial: number, ...args }]);
    if (msg.length > 5000) {
      this.warn("Too long message. Not sent");
      return;
    }
    if (!this.check_sanity()) {
      this.restart()
        .then(() => {
          this.socket.send(msg);
        })
        .catch((e) => {
          this.warn("Failed to ping", e);
        });
      return;
    }
    this.socket.send(msg);
  }

  /**
   *
   */
  keepAlive(timer = Visitor.timeout(60000)) {
    if (!this._timestamp) {
      setTimeout(this.keepAlive.bind(this), timer);
      return;
    }
    this.watchdogTimer = setInterval(() => {
      let t = new Date().getTime();
      let delta = t - this._timestamp;
      if (delta > 120000) {
        this.ping({ type: "checkConnection" });
        this.verbose(`Checking timestamp ${t} - ${this._timestamp}`, delta);
        this._timestamp = t;
      }
    }, timer);
  }

  /**
   *
   * @param  {...any} args
   * @returns
   */
  upstream(...args) {
    let opt;
    let service;
    let data;
    if (!this.check_sanity()) {
      return;
    }
    const target = args.pop();
    switch (args.length) {
      case 0:
        this.warn("Nothing to emit");
        return;
      case 1:
        opt = args[0];
        if (_.isString(opt)) {
          service = opt;
        } else if (_.isObject(opt)) {
          if (opt.service) {
            ({ service } = opt);
            delete opt.service;
          } else {
            this.warn(WARNING.argument.recommanded.format(_a.service));
            return;
          }
        }
        data = [service, opt];
        break;
      default:
        if (!_.isString(args[0])) {
          this.warn("Mal formed arguemnts");
          return;
        }
        data = args;
    }
    if (target.cid) {
      data.cid = target.cid;
      let sender = this._senders.get(target.cid);
      if (!sender) this._senders.set(target.cid, target);
    }
    const msg = JSON.stringify(data);
    this.socket.send(msg);
  }

  /**
   *
   * @returns
   */
  bindEvent() {
    const args = Array.prototype.slice.call(arguments);
    if (args.length < 2) {
      this.warn("Wrong API: bindEvent(list of signal..., listener)");
      return;
    }
    let target = args.pop();

    target.__processMessage__ = __processMessage__.bind(target);

    target.once(_e.destroy, () => {
      this.unbindEvent(target);
    });
    const events = [];
    for (let e of Array.from(args)) {
      let existing = this._listeners.get(target.cid);
      if (existing && existing.includes(e)) {
        this.warn(
          `Target ${target.cid} is already listening to ${e}, skipping`,
          target
        );
        continue;
      }
      events.push(e);
      this.wsBound = true;
      target.listenTo(this, e, target.__processMessage__);
    }

    this._listeners.set(target.cid, events);
    return target;
  }

  /**
   * 
   * @returns 
   */
  unbindEvent() {
    const args = Array.prototype.slice.call(arguments);
    if (args.length < 1) {
      this.warn("Wrong API : unbindEvent(list of signal..., listener)");
      return;
    }
    let target = args.pop();

    const events = this._listeners.get(target.cid);
    if (!events) {
      return;
    }
    for (let e of Array.from(events)) {
      target.stopListening(this, e, target.__processMessage__);
    }
    target.__processMessage__ = null;
    this._listeners.delete(target.cid);
    target = null;
  }

  /***
   * 
   */
  hasListener(target) {
    return this._listeners.get(target.cid);
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @returns 
   */
  __dispatchPush(service, data) {
    this.verbose("dispatchPush", service, data);
    if (data.socket_id) {
      this.mset(_a.socket_id, data.socket_id);
      RADIO_BROADCAST.trigger(_e.websocketReady, data.socket_id);
    }
    switch (service) {
      case "sys.handshake":
        if (data.error) {
          this.warn(data.error);
        }
        break;
      case "sys.ping":
        if (!data.ok) {
          this.warn("AAA:504 socket down -- trying to reconnect", data);
          this.restart(1);
        }
        break;
      case "sys.socket_bound":
        this.switchOn(data);
        break;
      case "sys.keepalive":
        this._timestamp = new Date().getTime();
        break;
      case "sys.hello":
        if (data.user) {
          this.switchOn(data);
        }
        if (this.mget("redirect")) return;
        if (data.hash && document.body.dataset.hash != data.hash) {
          if (localStorage.lastHash && localStorage.lastHash == data.hash) {
            return;
          }
          localStorage.lastHash = data.hash;
          if (window.Wm) {
            Wm.newVersion();
          }
        }
        return;
    }
  }
}

module.exports = __router_websocket;
