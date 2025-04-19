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
const { Menu } = require('electron');
const defaultMenu = require('./defaultMenu');
const _a = require('../../../lex/attribute');
const { showVersion, checkVersion } = require('../../minishell/auto-update');

const __core = require('../../../core');
class __drumee_menu extends __core {
 
  /**
   * 
   */
  isEmpty() {
    return !this.template;
  }


  // const dev = process.argv.indexOf('--dev') !== -1;
  /**
   * Menu builder for APP.
   * @param {*} online 
   */
  async build(syncParams) {
    let accounts = require('./accounts')();
    let menu = defaultMenu();
    menu = menu.concat(accounts);
    if(syncParams){
      let sync = require('./sync')(syncParams);
      if(sync){
        menu = menu.concat(sync);
      }
    }

    menu.push({
      label: LOCALE.EDIT,
      submenu: [
        { label: LOCALE.UNDO, role: 'undo' },
        { label: LOCALE.REDO, role: 'redo' },
        { type: 'separator' },
        { label: LOCALE.CUT,role: 'cut' },
        { label: LOCALE.COPY, role: 'copy' },
        { label: LOCALE.PASTE,role: 'paste' }
      ]
    })
    if (ARGV.dev) {
      let submenu = [
        {
          label: "Dev Tool", click: () => {
            Account.service('open-dev-tools', {});
          },
        },
        { type: "separator" },
        { role: "forceReload" },
        { role: "reload" },
        { type: "separator" },
        {
          label: LOCALE.SHOW_SYNC_DIFF,
          click: () => {
            Account.service('menu-show-sync-diff', {});
          }
        },
        { type: "separator" },
      ];
      menu.push({
        label: "Developers",
        submenu
      })
    }

    if (ARGV.demo) {
      menu.push({
        label: "Demo",
        submenu:[
          {
            label: "Ransomeware", click: () => Account.service('ransomeware-demo', {  }),
          },  
        ]
      })
    }

    let help = {
      label: LOCALE.HELP,
      submenu: [
        { label: LOCALE.ABOUT, click: showVersion }
      ]
    };

    if (Account.user && Account.user.isOnline()) {
      help.submenu.push({
        label: LOCALE.HELPDESK,
        click: () => {
          Account.service('menu-web-show-helpdesk', {})
        }
      })
    }
    if (!ARGV['local-bundle'] || ARGV['debug-update']) {
      help.submenu.push({
        label: LOCALE.CHECK_UPDATE,
        click: () => {
          checkVersion(0);
        }
      });
    }
    menu.push(help);
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
    this.template = menu;
  }
}
module.exports = __drumee_menu;
