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

const Attr = require('../../../lex/attribute');

const SYNC_CTRL_SIGNAL = "menu-sync-control";

/**
 * 
 * @param {*} title 
 * @param {*} message 
 * @returns 
 */
async function showConfirm(title, message) {
  const { dialog } = require('electron');
  let options = {
    buttons: [LOCALE.YES, LOCALE.NO],
    message: message,
    title: title
  }
  let response = await dialog.showMessageBox(options)
  return response;
}

/**
 * 
 * @param {*} title 
 * @param {*} message 
 * @returns 
 */
async function showConfirmNewMode(title, message, tips) {
  const { dialog } = require('electron');
  let detail = "";
  if (global.mfsWorker) {
    let { used_size, disk_free } = await mfsWorker.getDiskUsage();
    detail = `${tips.format(used_size)} ` + 
      LOCALE.YOUR_DISK_CAPACITY.format(disk_free);
  }
  let options = {
    buttons: [LOCALE.YES, LOCALE.NO],
    message,
    detail,
    title,
  }
  let response = await dialog.showMessageBox(options)
  return response;
}


/**
 * 
 * @param {*} effective 
 * @param {*} direction 
 * @returns 
 */
function getSyncDirection(effective, direction) {
  if (effective) {
    return [
      {
        label: LOCALE.LOCAL_TO_CLOUD,
        type: "radio",
        checked: (direction == Attr.upstream),
        click: async () => {
          if ((direction !== Attr.upstream)) {
            let result = await showConfirm(LOCALE.LOCAL_TO_CLOUD, LOCALE.DO_REALLY_CHANGE);
            if (result.response === 1)
              Account.refreshMenu();
            if (result.response === 0) {
              global.webContents.send(SYNC_CTRL_SIGNAL, { info: true, direction: Attr.upstream });
              Account.service('menu-sync-control', { direction: Attr.upstream });
            }
          }
        }
      },
      {
        label: LOCALE.CLOUD_TO_LOCAL,
        type: "radio",
        checked: (direction == Attr.downstream),
        click: async () => {
          if ((direction !== Attr.downstream)) {
            let result = await showConfirm(LOCALE.CLOUD_TO_LOCAL, LOCALE.DO_REALLY_CHANGE);
            if (result.response === 1)
              Account.refreshMenu();
            if (result.response === 0) {
              global.webContents.send(SYNC_CTRL_SIGNAL, { info: true, direction: Attr.downstream });
              Account.service('menu-sync-control', { direction: Attr.downstream });
            }
          }
        }
      },
      {
        label: LOCALE.BOTH_WAYS,
        type: "radio",
        checked: (direction == Attr.duplex),
        click: async () => {
          if ((direction !== Attr.duplex)) {
            let result = await showConfirm(LOCALE.BOTH_WAYS, LOCALE.DO_REALLY_CHANGE);
            if (result.response === 1)
              Account.refreshMenu();
            if (result.response === 0) {
              global.webContents.send(SYNC_CTRL_SIGNAL, { info: true, direction: Attr.duplex });
              Account.service('menu-sync-control', { direction: Attr.duplex });
            }
          }
        }
      }
    ]
  }
  let enabled = false;
  return [
    {
      enabled,
      label: LOCALE.LOCAL_TO_CLOUD,
    }, {
      enabled,
      label: LOCALE.CLOUD_TO_LOCAL,
    }, {
      enabled,
      label: LOCALE.BOTH_WAYS,
    }
  ];
}

const getSyncMode = (effective, mode) => {
  if (effective) {
    return [
      { type: "separator" },
      {
        label: LOCALE.SELECTIVE,
        type: "radio",
        checked: (mode == Attr.onTheFly),
        click: async () => {
          if ((mode !== Attr.onTheFly)) {
            let result = await showConfirmNewMode(
              LOCALE.CHANGE_SYNC_MODE, 
              LOCALE.SWITCH_TO_SELECTIVE_SYNC,
              LOCALE.SELECTIVE_SYNC_TIPS
            );
            if (result.response === 1)
              Account.refreshMenu();
            if (result.response === 0) {
              Account.service('menu-sync-control', { mode: Attr.onTheFly });
            }
          }
        }
      },
      {
        label: LOCALE.FULL,
        type: "radio",
        checked: (mode == Attr.full),
        click: async () => {
          if ((mode !== Attr.full)) {
            let result = await showConfirmNewMode(
              LOCALE.CHANGE_SYNC_MODE, 
              LOCALE.SWITCH_TO_FULL_SYNC,
              LOCALE.FULL_SYNC_TIPS
            );
            if (result.response === 1)
              Account.refreshMenu();
            if (result.response === 0) {
              global.webContents.send(SYNC_CTRL_SIGNAL, { full: true });
              Account.service('menu-sync-control', { mode: Attr.full });
            }
          }
        }
      },
      { type: "separator" },
    ]
  }
  let enabled = false;
  return [
    { type: "separator" },
    {
      label: LOCALE.SELECTIVE,
      enabled,
    },
    {
      label: LOCALE.FULL,
      enabled,
    },
    { type: "separator" },
  ]
}

/**
 * 
 */
function syncMenu(opt) {
  let { effective, mode, direction } = opt;
  let label = LOCALE.SYNC_ON;
  if (effective) {
    label = LOCALE.TURN_OFF;
  } else {
    label = LOCALE.TURN_ON;
  }
  let control = {
    label: LOCALE.SYNCHRONIZATION,
    submenu: [
      {
        label,
        click: async () => {
          let msg = LOCALE.CONFIRM_ENABLE_SYNC;
          if (effective) {
            msg = LOCALE.CONFIRM_DISABLE_SYNC;
          }
          let result = await showConfirm(LOCALE.SELECTIVE, msg);
          if (result.response === 0) {
            effective = effective ^ 1;
            Account.service(SYNC_CTRL_SIGNAL, { effective });
          }
        }
      },
      { type: "separator" },
    ]
  }
  if (!/^(upstream|downstream|duplex)$/.test(direction)) direction = Attr.duplex;
  if (!/^(full|onTheFly)$/.test(mode)) mode = Attr.onTheFly;

  let syncDir = [];


  let modeMenu = getSyncMode(effective, mode);

  if (Account.user && Account.user.isSyncExpert()) {
    syncDir = getSyncDirection(effective, direction);
    modeMenu.push({
      label: LOCALE.SHOW_SYNC_DIFF,
      click: () => {
        Account.service('menu-show-sync-diff', {});
      }
    })
  }

  modeMenu.push({
    label: LOCALE.HELP,
    click: () => {
      Account.service('show-sync-help-in-web-render', {});
    }
  });


  control.submenu = [...control.submenu, ...syncDir, ...modeMenu];
  let display = {
    label: LOCALE.ROOT_FOLDER,
    submenu: [
      {
        label: LOCALE.DISPLAY,
        click: () => {
          Account.service('menu-show-homedir', {});
        }
      },
      { type: "separator" },
      {
        label: LOCALE.RESET_SYNC,
        click: () => {
          Account.service('menu-sync-reset', {});
        }
      },

    ]
  }
  return [control, display]
}

module.exports = syncMenu;
