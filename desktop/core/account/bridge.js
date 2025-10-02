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
const _ = require("lodash");
const Attr = require("../../lex/attribute");
const { nobody } = require("../../lex/constants");
const Scheduler = require("../../mfs/scheduler");
const {
  dialog,
  app,
  shell,
  Notification,
  Menu,
  nativeImage,
} = require("electron");
const { existsSync } = require("fs");

const Jsonfile = require("jsonfile");
const Path = require("path");
const __service = require("../service");
class __core_account extends __service {
  initialize(opt) {
    super.initialize(opt);

    this.webEvents = {
      "account-bootstrap": "bridge_bootstrap",
      "account-change-domain": "bridge_changeEndpoint",
      "account-change-endpoint": "bridge_changeEndpoint",
      "account-change-account": "bridge_changeAccount",
      "account-get-sync-settings": "bridge_syncSettings",
      "account-list-endpoints": "bridge_listEndpoints",
      "account-open-home": "bridge_openHome",
      "account-show-menu": "bridge_showMenu",
      "account-refresh-menu": "bridge_refreshMenu",
      "account-remove-endpoint": "bridge_removeEndpoint",
      "account-reset": "bridge_reset",
      "account-set-notification": "bridge_setNotificationCount",
      "account-set": "bridge_set",
      "account-show-notification": "bridge_showNotification",
      "account-signed-in": "bridge_gotSignedIn",
      "account-signed-out": "bridge_gotSignedOut",
      "account-update": "bridge_update",
      "account-user-settings": "bridge_userSettings",
      "account-yp-env": "bridge_yp_env",
    };

    this.bindEvents();
  }

  /**
   *
   */
  acknowledge(channel, data) {
    const endpoint = this.currentEndpoint();
    this.checkAuthorization(endpoint)
      .then(() => {
        webContents.send(channel, res);
        // this.reload();
      })
      .catch((e) => {
        this.debug("AAA:13 Failed while running bridge response", e);
        webContents.send(channel, res);
        this.showMessageBox({
          type: Attr.error,
          message: LOCALE.INTERNAL_ERROR,
          detail: e.toString("utf8"),
        });
      });
  }

  /**
   *
   * @param {*} opt
   */
  bridge_bootstrap(opt) {
    let { channel, args } = opt;
    if (this.isReady) {
      global.webContents.send(channel, this.bootstrap(args));
    } else {
      this.once("prepared", () => {
        global.webContents.send(channel, this.bootstrap());
      })
    }
  }

  /**
   *
   * @param {*} opt
   */
  bridge_yp_env(opt) {
    let { channel, args } = opt;
    let env = this.get("yp_env") || this.bootstrap();
    try {
      if (!env) {
        env = Jsonfile.readFileSync(this.envFile);
      }
    } catch (e) {
      const options = {
        type: "info",
        buttons: [LOCALE.OK],
        defaultId: 0,
        title: LOCALE.ERROR_SERVER,
        message: LOCALE.TIPS_OFFLINE,
      };

      dialog.showMessageBox(null, options).then((r) => {
        app.exit(0);
      });
    }
    webContents.send(channel, env);
  }


  /**
   *
   * @param {*} opt
   */
  async bridge_refreshMenu(opt) {
    let { channel, args } = opt;
    this.refreshMenu();
    webContents.send(channel, {});
  }

  /**
    *
    * @param {*} opt
    */
  bridge_showMenu(opt) {
    let { channel, args } = opt;
    let menu = require("./menu/sync")(this.syncParams)[0]
    let x = Menu.buildFromTemplate([menu]);
    x.popup();
    webContents.send(channel, {});
  }


  /**
   *
   * @param {*} opt
   */
  bridge_set(opt) {
    let { channel, args } = opt;
    this.set(args);
    webContents.send(channel, args);
  }

  /**
   *
   * @param {*} opt
   */
  bridge_relaunch(opt) {
    let { channel, args } = opt;
    this.relaunch(args);
    webContents.send(channel, {});
  }


  /**
   *
   * @param {*} opt
   */
  bridge_gotSignedIn(opt) {
    let { channel, args } = opt;
    this.respawn(args);
    this.refreshMenu();
    this.debug("AAA:150 bridge_gotSignedIn", args)
    if (this.user.isOnline()) {
      if (this.scheduler) {
        this.scheduler.destroy();
      }
      this.scheduler = new Scheduler();
    }
    webContents.send(channel, {});
  }

  /**
   *
   * @param {*} opt
   */
  async bridge_gotSignedOut(opt) {
    let { channel, args } = opt;
    this.user.set({ signed_in: 0, uid: nobody, id: nobody });
    await this.prepare()
    webContents.send(channel, {});
  }

  /**
   *
   * @param {*} opt
   */
  async bridge_changeEndpoint(opt) {
    let { channel, args } = opt;
    let cur = this.currentEndpoint() || {};
    let currentSid = cur.sid;
    let { user, organization, keysel } = args;
    if (!user || !user.id || !organization) {
      this.warn("Error@212: Could not cange endpoint from", args);
      webContents.send(channel, {});
      return;
    }
    let { domain, main_domain } = user;
    domain = domain || main_domain;
    args.sid = args.sid || currentSid || this.bootstrap().sid;
    const { host } = this.respawn(args);
    if (!host) {
      this.warn("New endpoint didn't provide host");
      webContents.send(channel, {});
      return;
    }
    if (!keysel) {
      keysel = Attr.regsid;
    }
    let cookie = {
      url: `https://${host}`,
      value: args.sid,
      name: keysel,
      path: "/",
      httpOnly: true,
      domain
    };
    await this.start(cookie);
    webContents.send(channel, this.bootstrap());
  }

  /**
   *
   * @param {*} opt
   */
  bridge_reset(opt) {
    let { channel, args } = opt;
    this.forget(args);
    this.acknowledge(channel);
  }

  /**
   *
   * @param {*} opt
   */
  async bridge_showNotification(opt) {
    let { channel, args } = opt;
    if (!args || !args.body) {
      webContents.send(channel, args);
      return;
    }
    if (args.icon) {
      var crypto = require("crypto");
      let hash = crypto
        .createHash("md5")
        .update(args.icon)
        .digest("base64")
        .replace(/[\/=]/g, "");
      console.log(hash); // 9b74c9897bac770ffc029102a200c5de
      let avatar = Path.resolve(
        app.getPath("appData"),
        "drumee",
        "avatar",
        `${hash}.png`
      );
      if (!existsSync(avatar)) {
        await this.downloadToFile(args.icon, avatar);
      }
      const image = nativeImage.createFromPath(avatar);
      args.icon = image;
    }
    const n = new Notification({
      ...args,
      silent: false,
    });
    n.show();
    webContents.send(channel, args);
  }

  /**
   *
   * @param {*} opt
   */
  bridge_resync(opt) {
    let { channel, args } = opt;
    this.local.clear();
    this.reload();
  }

  /**
   *
   * @param {*} opt
   */
  bridge_userSettings(opt) {
    let { channel, args } = opt;
    if (!this.user.isOnline()) {
      webContents.send(channel, {
        offline: 1,
        online: 0,
        connection: "offline",
      });
    } else {
      webContents.send(channel, {
        online: 1,
        offline: 0,
        connection: "online",
      });
    }
  }

  /**
   *
   * @param {*} opt
   */
  bridge_syncSettings(opt) {
    let { channel, args } = opt;
    webContents.send(channel, this.settings());
  }

  bridge_setNotificationCount(opt) {
    let { channel, args } = opt;
    if (app.dock && app.dock.setBadge) {
      if (args && args.count) {
        app.dock.setBadge(args.count.toString());
      } else {
        app.dock.setBadge("");
      }
    }
    webContents.send(channel, args);
  }

  /**
   *
   * @param {*} opt
   */
  bridge_openHome(opt) {
    let { channel, args } = opt;
    let info = this.info();
    if (!info) throw "Can not start without info";

    let domain = Path.join(global.USER_DATADIR, info.url);
    let home = Path.join(domain, info.username);
    if (/\/(nobody)$/.test(home)) {
      this.showMessageBox({ message: "Ooops! Something wrong happened" });
      this.warn("USER_HOME_DIR belong to nobody. Sync not allowed");
    } else {
      shell.openPath(home);
      win.minimize();
    }

    webContents.send(channel, this.info());
  }

  /**
   *
   * @returns
   */
  bridge_listEndpoints(opt) {
    let { channel, args } = opt;
    let endpoints = this.endpoints();
    webContents.send(channel, endpoints);
  }


  /**
   *
   * @returns
   */
  async bridge_changeAccount(opt) {
    let { channel, args } = opt;
    await this.changeAccount(args);
    webContents.send(channel, args);
  }


  /**
   *
   * @returns
   */
  bridge_removeEndpoint(opt) {
    let { channel, args } = opt;
    if (args) {
      this.forget(args);
    }
    webContents.send(channel, args);
  }

  /**
   *
   * @returns
   */
  bridge_update(opt) {
    let { channel, args } = opt;
    if (args.language) {
      global.LOCALE = require("../../locale")(args.language);
      if (this.user) this.user.set(args);
      this.refreshMenu();
    }
    this.set(args);
    webContents.send(channel, args);
  }
}
module.exports = __core_account;
