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
const { shell } = require("electron");
const updater = require('./auto-update');
const __bridge = require('./bridge');

/**
 * 
 * @param {*} data 
 */

class Minishell extends __bridge {

  /* 
  * @returns 
  */
  async exec(opt) {
    let { channel, args } = opt;
    let command = args.shift();
    let res = {};
    switch (command) {
      case 'screen.getAccess':
        res = await this.getScreenSources(args);
        break;

      case 'media.getAccess':
        res = await this.getMediaAccess(args[0]);
        break;
      case 'window.maximze':
        win.show();
        if (!win.isMaximized()) {
          win.maximize();
        }
        break;
      case 'window.minimize':
        win.minimize();
        break;
      case 'window.hide':
        if (process.platform == 'darwin') {
          win.hide();
        } else {
          win.minimize();
        }
        break;
      case "open.link":
        if (!/^http/.test(args.href)) {
          args.href = `https://${args.href}`;
        }
        res = shell.openExternal(args.href);
        break;

      case 'updater.checkForUpdates':
      case 'updater.quitAndInstall':
      case 'updater.showVersion':
      case 'updater.checkVersion':
        let [x, fn] = command.split('.');
        if (updater[fn]) {
          res = await updater[fn](...args)
        }
        break;
      case "debug.pending":
        const { showPending } = require("../../mfs/core/locker");
        showPending(args.name, args.opt);
        break;
      case "debug.ownpath":
        res = mfsScheduler.remote.ensureOwnpath(args[0]);
        break;
      case "debug.getNodeSettings":
        res = mfsScheduler.syncOpt.getNodeSettings(args[0]);
        break;
      case "debug.sql":
        res = {};
        let opt = args.shift();
        console.log("AAA:89 INPUT", opt);
        if (opt.rows) {
          res.rows = MFS_DB.getRows(opt.rows);
        }
        if (opt.row) {
          res.row = MFS_DB.getRow(opt.rows);
        }
        if (opt.run) {
          res.run = MFS_DB.run(opt.run);
        }
        break;
    }
    webContents.send(channel, res);
  }
}

module.exports = Minishell;

