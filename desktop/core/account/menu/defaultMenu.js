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
const { app } = require('electron');
const { showVersion, checkVersion } = require('../../minishell/auto-update');
const { local_bundle, debug_update } = require("../../../args")

/**
 * Default Menu bar before login.
 * @returns {*}
 */
const defaultMenu = () => {
  let menu = [];
  let submenu = [
    { type: 'separator' },
    {
      label: LOCALE.RESTART_APP, click: () => {
        Account.service('menu-restart-app', {});
      }
    },
    {
      label: LOCALE.QUIT, click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ];
  if (!local_bundle || debug_update) {
    submenu.unshift({
      label: LOCALE.CHECK_UPDATE,
      click: () => {
        checkVersion(0);
      }
    });
  }
  submenu.unshift({ label: LOCALE.ABOUT, click: showVersion });
  menu = [{ label: 'Drumee', submenu }];
  if (Account.user && Account.user.isOnline()) {
    let logout = {
      label: LOCALE.LOGOUT, click: () => {
        webContents.send('menu-web-logout');
      }
    };
    submenu.splice(4, 0, logout)
    menu = [{ label: 'Drumee', submenu }];
  }
  return menu;
};


module.exports = defaultMenu;
