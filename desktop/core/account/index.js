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

const { isObject } = require("lodash");
const Attr = require("../../lex/attribute");
const Db = require("../db/connector");
const { existsSync, renameSync, statSync, unlinkSync } = require("fs");
const Path = require("path");
const Backbone = require("backbone");
const { app, dialog, net, session } = require("electron");
const User = require("./user");
const menuBuilder = require("./menu/index");
const { readFileSync } = require("jsonfile");
const Scheduler = require("../../mfs/scheduler");
const Bootstrap = require("./bootstrap");
let { hash } = require("../../dist-web/index.json");
const args = require("../../args")
const startTime = new Date().getTime();
const Bridge = require("./bridge");

/**
 *
 * @param {*} data
 */

class __core_account extends Bridge {
  initialize(opt) {
    global.LOCALE = require("../../locale")("en");

    this.methods = [require("./sql")];
    super.initialize(opt);

    //this.db = new Db({ verbose: 1 });
    this.db = new Db();
    this.user = new User();
    this.organization = new Backbone.Model();
    this._reloadCount = 0;
  }

  /**
   *
   */
  retrievelastEndpoint() {
    this.envFile = Path.resolve(app.getPath(Attr.userData), "yp-env.json");
    if (existsSync(this.envFile)) {
      let data = readFileSync(this.envFile);
      this.respawn(data);
    }

    global.LOCALE = require("../../locale")(this.lang());
    this.user.on(Attr.change, this.handleChange.bind(this));
    this.organization.on(Attr.change, this.handleChange.bind(this));
  }

  /**
   *
   */
  respawn(data) {
    let { user, organization, sid, hub } = data;
    this.debug("AAA:74", data)
    if (!user || !user.profile || !organization) {
      this.warn("Could not respawn fron invalid data");
      return;
    }
    if (sid) {
      this.set({ sid });
    }
    if (isObject(user)) {
      this.user.clear();
      this.user.respawn(user);
      user.sid = sid;
      if (organization.url && !user.domain) {
        user.domain = organization.url;
      }
      user.email = user.profile.email;
      this.setUser(user);
    }
    if (!organization || !organization.id) {
      organization = {
        id: hub.org_id,
        domain_id: hub.org_id,
        name: hub.org_name,
        domain: hub.domain
      }
    }
    if (isObject(organization)) {
      this.organization.clear();
      this.organization.set(organization);
      this.setOrganization(organization);
    }
    return this.setEndpoint(data);
  }

  /**
   *
   * @returns
   */
  ping() {
    return this.bootstrap();
  }

  /**
   *
   * @returns
   */
  getId() {
    return this.get('sid')
  }

  /**
   *
   */
  bootstrap(reset = 0) {
    let [lang] = app.getLocale().split('-');
    let data;
    if (reset) {
      data = {}
    } else {
      data = this.currentEndpoint() || this.lastEndpoint();
    }
    let env = {
      ...Bootstrap,
      lang,
      ...data
    };
    let { endpointPath, host } = env;
    let origin;
    if (host) {
      origin = `https://${host}`;
    }
    const { appRoot } = Bootstrap;
    endpointPath = args.endpoint || endpointPath || '/-/';
    endpointPath = '/' + endpointPath.replace(/^\/+/, '');
    if (origin) {
      if (endpointPath == '/-/' || /^(live|main)$/.test(endpointPath)) {
        env.endpoint = `${origin}${appRoot}/`;
        env.websocketApi = `wss://${host}${appRoot}/websocket/`;
        env.websocketPath = `${appRoot}/websocket/`;
      } else {
        env.endpoint = `${origin}${appRoot}${endpointPath}/`;
        env.websocketApi = `wss://${host}${appRoot}${endpointPath}/websocket/`;
        env.websocketPath = `${endpointPath}/websocket/`;;
      }
    }

    env.protocol = "https";
    env.mfsRootUrl = `${env.endpoint}`;
    env.mfsRootUrl = `${env.endpoint}`;
    env.mfs_base = `${env.endpoint}`
    env.svc = `${env.endpoint}svc/`;
    env.vdo = `${env.endpoint}vdo/`;
    env.serviceApi = `${env.endpoint}service/?`;
    env.staticUrl = `https:/${host}${appRoot}/static/`;
    env.main_domain = host;
    env.host = host;
    env.origin = origin;
    env.pdfium_wasm='./static/vendor/embedpdf/pdfium.wasm'
    env.online = net.online;
    env.startTime = startTime;
    if (host) {
      env.static = `https://${host}/-/static/`
    }
    if (args.dev) env.dev = args.dev;
    return env;
  }

  /**
   *
   * @returns
   */
  checkConnectivity() {
    let info = this.lastEndpoint();
    if (!info) return;
    let domain = info.domain;
    const dns = require("dns");
    dns.resolve(domain, (err, addr) => {
      if (err) {
        setTimeout(() => {
          this.checkConnectivity(domain);
        }, 5000);
        return;
      } else {
        app.relaunch();
        app.exit(0);
      }
    });
  }

  /**
   *
   */
  async prepareMfs(opt) {
    if (!this.user.isOnline()) return;
    let sanity = await this.checkSanity();
    let error = "Could not start MFS Schduler";
    if (!sanity) {
      error = `${error} : sanity check has failed`;
      return;
    }
    if (this.scheduler) {
      this.scheduler.destroy();
    }
    this.scheduler = new Scheduler();
    this.syncParams = new Backbone.Model();
    try {
      let params = await this.scheduler.prepare();
      this.syncParams.set(params);
    } catch (e) {
      console.error("SCHEDULER_ERROR: failed to prepare", e);
    }
    this.refreshMenu();
  }

  /**
   *
   */
  prepare(args) {
    const endpoint = args || this.lastEndpoint() || {};
    const { host, sid, name } = endpoint;
    return new Promise((resolve, reject) => {
      if (!host) {
        this.warmup();
        return resolve('no-endpoint');
      }

      if (!net.online) {
        this.checkConnectivity();
        return resolve('no-net');
      }

      let cookie = {
        url: `https://${host}`,
        value: sid,
        name,
        path: "/",
        httpOnly: true,
        domain: host,
      };

      session.defaultSession.cookies.set(cookie)
        .then(async () => {
          session.defaultSession.cookies.flushStore();
          this.checkAuthorization(endpoint)
            .then(() => {
              this.trigger("prepared");
              this.isReady = 1;
              this.start();
              resolve('ok');
            })
            .catch((e) => {
              console.error(
                "ERR:156 -- FAILED TO INITIALIZE SESSION :",
                e,
                cookie
              );
              reject(e);
            });
        })
        .catch((e) => {
          console.error("ERR:161 -- FAILED TO INITIALIZE SESSION :", e, cookie);
        });
    });
  }

  /**
   *
   * @param {*} url
   * @param {*} opt
   * @returns
   */
  checkAuthorization(args) {
    const endpoint = args || this.currentEndpoint() || this.lastEndpoint();
    this.isReady = 0;
    let { host, path, keysel, sid } = endpoint;
    if (!path) {
      path = '/-/'
    }
    let url = `https://${host}${path}svc/yp.get_env`;
    return new Promise((resolve, reject) => {
      const request = net.request({
        url,
        method: "POST",
        useSessionCookies: true,
      });
      request.setHeader("x-param-keysel", keysel);
      if (sid) {
        request.setHeader("x-param-regsid", sid)
      }
      let res = "";
      request.on("response", (response) => {
        switch (response.statusCode) {
          case 200:
            response.on("data", (chunk) => {
              res = `${res}${chunk}`;
            });
            response.on("end", async () => {
              let { data } = JSON.parse(res);
              this.handleResponse(data, response, endpoint)
              resolve(response);
            });
            break;
          case 403:
            reject(0);
            break;
          default:
            console.error(
              `Failed to fetch ${url} from ${url}.`,
              response.headers
            );
            reject();
        }
      });
      request.on("error", (e) => {
        this.debug("AUTHORIZATION_ERROR", { host, path, keysel, sid }, this.lastEndpoint(), e);
        reject({ error: e, session: this.lastEndpoint() })
        //this.backendError(e);
      });

      request.end();
    });
  }

  /**
   *
   *
   * @param {*} res
   */
  async handleResponse(data, response, endpoint) {
    let { keysel, path, sid } = endpoint || this.bootstrap();
    this.set({ yp_env: data });
    if (response.headers && response.headers[keysel]) {
      data.sid = response.headers[keysel];
    }
    data.path = path;
    if (!data.sid) data.sid = sid;
    this.respawn(data);
    return true;
  }

  /**
   *
   */
  relaunch() {
    const options = {
      type: "question",
      buttons: [LOCALE.CANCEL, LOCALE.GOT_IT],
      defaultId: 0,
      title: LOCALE.LOGIN_ANOTHER_ACCOUNT,
      message: LOCALE.CONFIRM_CHANGE_ACCOUNT,
    };

    dialog
      .showMessageBox(null, options)
      .then(async (r) => {
        switch (r.response) {
          case 1:
            this.restart();
            break;
          default:
            this.debug(r.response);
        }
      })
      .catch((e) => {
        console.error("Caught error", e);
      });
  }

  /**
   * 
   */
  ensureSocketUp() {
    let timer;
    let count = 0;
    return new Promise((succeeded, failed) => {
      let socket_id = this.get(Attr.socket_id)
      if (socket_id) {
        return succeeded(socket_id)
      }
      timer = setInterval(() => {
        socket_id = this.get(Attr.socket_id)
        if (socket_id) {
          clearInterval(timer)
          return succeeded(socket_id)
        }
        count++;
        if (count > 10) {
          succeeded(null)
        }
      }, 300)
    })
  }

  /**
   *
   */
  fallback() {
    this.prepare()
      .then()
      .catch(() => {
        options.message = "Fatal error could not continue";
        dialog.showMessageBox(null, options).then((r) => {
          app.exit(0);
        });
      });
  }

  /**
   *
   */
  backendError(e) {
    let info = this.lastEndpoint() || {};
    let message = LOCALE.TNETWORK_ERROR;
    let detail = info.url;
    if (/ERR_INTERNET/.test(e)) {
      message = LOCALE.TIPS_OFFLINE;
    } else {
      detail = LOCALE.SERVER_NOT_REACHABLE.format(info.url);
    }
    const options = {
      type: "info",
      buttons: [LOCALE.QUIT, LOCALE.LOGIN_ANOTHER_ACCOUNT],
      defaultId: 0,
      title: LOCALE.ERROR_SERVER,
      detail,
      message,
    };

    dialog.showMessageBox(null, options).then((r) => {
      switch (r.response) {
        case 0:
          app.isQuiting = true;
          app.quit();
          return;
        case 1:
          options.buttons = [LOCALE.QUIT];
          this.fallback(options);
          break;
      }
    });
  }

  /**
   *
   */
  ransomwareDemo(e) {
    const options = {
      type: "question",
      buttons: [LOCALE.OK, LOCALE.CANCEL],
      defaultId: 0,
      title: "Protection againt ransomeware demo",
      detail: global.USER_HOME_DIR,
      message: LOCALE.RANSOMEWARE_DEMO,
    };

    dialog.showMessageBox(null, options).then(async (r) => {
      switch (r.response) {
        case 0:
          let encrypt = require("../../utils/encrypt");
          await encrypt(global.USER_HOME_DIR);
          return;
        case 1:
          //et dest = `${home}-renamed-by-Drumee`;
          //renameSync(home, dest);
          break;
      }
    });
  }

  /**
   *
   */
  restart() {
    app.relaunch();
    app.exit(0);
  }

  /**
   *
   */
  checkSanity() {
    let session = this.currentEndpoint();
    if (!session) throw "Can not start without session";
    let domain = Path.join(global.USER_DATADIR, session.url);
    let home = Path.join(domain, session.username);
    if (/\/(nobody)$/.test(home)) {
      this.warn(
        "USER_HOME_DIR belong to nobody. Sync not allowed",
        home,
        domain
      );
      this.showMessageBox({ message: "Ooops! Something wrong happened" });
      return 0;
    }

    return new Promise((resolve, rejec) => {
      if (!existsSync(home)) {
        resolve(1);
        return;
      }
      let stat = statSync(home);
      if (!stat.isDirectory()) {
        const options = {
          type: "question",
          buttons: [LOCALE.LEAVE, LOCALE.RENAME, LOCALE.REMOVE],
          defaultId: 0,
          detail: home,
          title: LOCALE.RESOURCE_BUSY,
          message: LOCALE.ROOT_FOLDER_IS_FILE,
        };

        dialog
          .showMessageBox(null, options)
          .then(async (r) => {
            switch (r.response) {
              case 0:
                app.exit(1);
                return;
              case 1:
                let dest = `${home}-renamed-by-Drumee`;
                renameSync(home, dest);
                break;
              case 2:
                unlinkSync(home);
                break;
              default:
                app.exit(1);
                return;
            }
            resolve(r.response);
          })
          .catch((e) => {
            console.error("Caught error", e);
          });
      }
      resolve(10);
    });
  }

  /**
   * 
   */
  warmup() {
    this.refreshMenu();
    this.isReady = 1;
    this.trigger("prepared");
  }

  /***
   *
   */
  async start(cookie) {
    if (cookie && cookie.domain && cookie.value) {
      await session.defaultSession.cookies.set(cookie);
    }
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          //'Content-Security-Policy': ['default-src \'self\'']
        },
      });
    });
    if (!this.user || !this.user.isOnline()) {
      this.refreshMenu();
      this.debug("Scheduler not yet started");
      return;
    }
    await this.prepareMfs();
    this.debug("Start account", this.user.get(Attr.home_id));
  }


  /**
   *
   * @param {*} m
   */
  handleChange(m) {
    if (m.changed) {
      let new_lang = false;
      if (m.changed.lang) {
        global.LOCALE = require("../../locale")(m.changed.lang);
        new_lang = true;
      }
      if (m.changed.syncSettings || m.changed.settings) {
        this.refreshMenu();
      }
      if (new_lang || isObject(m.changed.organization)) {
        this.refreshMenu();
      }
    }
  }

  /** Opens a new session 1648179977
   *
   */
  async reset() {
    await this.deleteSession();
    const endpoint = this.currentEndpoint();
    await this.checkAuthorization(endpoint);
    this.relaunch();
  }

  /**
   *
   */
  reload() {
    this.db.close();
    this.db = new Db();
    this.user.clear();
    const endpoint = this.currentEndpoint();
    this.checkAuthorization(endpoint).then(() => {
      if (this.user.isOnline()) {
        if (this.scheduler) {
          this.scheduler.destroy();
        }
        this.scheduler = null;
        this.scheduler = new Scheduler();
      }

      webContents.send("account-change", this.bootstrap());
    });
  }


  /** Leave current session and switch into the new account, using store ccokie id
   *
   */
  async changeEndpoint(opt = {}) {
    const { sid } = opt;
    if (!sid) {
      this.debug("AAA:581 -- invalid data");
      return;
    }

    const endpoint = this.getEndpoint(sid) || {}
    if (!endpoint || !endpoint.uid) {
      this.debug(`AAA:584 -- endpoint not found from ${sid}`);
      return;
    }

    this.set({ sid });
    this.once("prepared", () => {
      webContents.send("endpoint-changed", this.bootstrap());
    })
    await this.prepare(endpoint);
  }

  /**
   *
   */
  async refreshMenu(params) {
    global.LOCALE = require("../../locale")(this.lang());
    if (!this.menu) {
      this.menu = new menuBuilder();
    }
    if (this.syncParams) {
      if (params) {
        this.syncParams.clear();
        this.syncParams.set(params);
      } else {
        params = this.syncParams.attributes;
      }
    }
    this.menu.build(params);
  }


  /**
   *
   * @param {*} name
   * @param {*} opt
   */
  service(name, opt) {
    this.debug("AAAA:425 SEND", name, opt);
    if (/^.+(\-web)\-.+/.test(name)) {
      webContents.send(name, opt);
    } else {
      switch (name) {
        case "menu-sync-control":
          this.syncParams.set(opt)
          this.refreshMenu();
          this.trigger(name, opt);
          break;
        case "menu-restart-app":
          this.restart();
          break;
        case "ransomeware-demo":
          this.ransomwareDemo();
          break;
        case "menu-user-change-endpoint":
          this.changeEndpoint(opt);
          break;
        case "menu-user-new-endpoint":
          webContents.send("endpoint-new");
          break;

        case "open-dev-tools":
          try {
            this.debug("OPENING DEV TOOLS");
            webContents.openDevTools({ mode: 'detach' })
          } catch (e) {
            console.warn("Failed to open dev tool", e)
          }
          break;

        default:
          this.debug("AAAA:523 TRIGGER OTHER", name, opt);
          this.trigger(name, opt);
      }
    }
  }

  /**
   *
   * @param {*} cookie
   */
  deleteSession() {
    return new Promise((resolve, reject) => {
      session.defaultSession.cookies
        .get({})
        .then((cookies) => {
          cookies.forEach((c) => {
            let url = "";
            url += c.secure ? "https://" : "http://";
            url += c.domain.charAt(0) === "." ? "www" : "";
            url += c.domain;
            url += c.path;
            session.defaultSession.cookies.remove(url, c.name, (error) => {
              if (error) reject(error);
            });
          });
          session.defaultSession.cookies.flushStore();
          resolve(cookies);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  /**
   *
   */
  lang() {
    return this.user.language();
  }
}
module.exports = __core_account;
