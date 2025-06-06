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
const { dialog, app } = require('electron');
const { autoUpdater } = require("electron-updater");
const _a = require('../../lex/attribute');
const Path = require('path');
const Os = require('os');
const { verbose, dev: dev_mode, fakeVersion } = require("../../args")

let readyToInstall = false;
let updateAvailable = false;
let isUpdating = false;
let downloaded = {};
let CURRENT = {};

function debug(...args) {
  if (/update/.test(verbose > 2)) {
    console.log("UPDATER: ", ...args);
  }
}

autoUpdater.on('checking-for-update', () => {
  debug('Checking for update... ', global.CUR_VERSION, app.getVersion());
})

/** ----------  */
autoUpdater.on('update-available', (info) => {
  debug('Update available.', info);
  updateAvailable = true;
})

/** ----------  */
autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater. ' + err);
  isUpdating = false;
})

/**
 * 
 */
async function downloadUpdate() {
  await autoUpdater.downloadUpdate();
  return updateStatus();
}

/** ----------  */
autoUpdater.on('download-progress', (p) => {
  downloaded = p;
  let log_message = "**** Download speed: " + p.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + p.percent + '%';
  log_message = log_message + ' (' + p.transferred + "/" + p.total + ')';
  debug(log_message);
  if (p.percent >= 100) {
    isUpdating = false;
    updateAvailable = true;
    readyToInstall = true;
  } else {
    isUpdating = true;
    updateAvailable = false;
    readyToInstall = false;
  }
  webContents.send("main-updates-progress", p)

})


/** ----------  */
autoUpdater.on('update-downloaded', (info) => {
  debug('Update downloaded', info, app.getVersion());
  // readyToInstall = true;
  // isUpdating = false;
  // CURRENT = info;
  webContents.send("main-new-version", {
    ...info, ...updateStatus()
  })

  //  promptUpdate(info);
});

/**
 * 
 * @param {*} info 
 */
function promptUpdate(info = {}) {
  webContents.send("main-new-version", {
    current: app.getVersion(),
    next: info
  })
}


function checkForUpdates(args) {
  let res = {};
  debug(`********* CHECKING NEW UPDATES ********. Current version=${global.CUR_VERSION}`);
  if (dev_mode && fakeVersion) {
    return {
      readyToInstall: true,
      version: fakeVersion,
    }
  }
  return new Promise((resolve, reject) => {
    if (isUpdating) {
      console.log("isUpdating...");
      res = {
        readyToInstall,
        updateAvailable,
        isUpdating
      };
      return resolve(res);
    }
    autoUpdater.checkForUpdates().then((info) => {
      if (!info) {
        debug('********* NO UPDATES ******');
        return resolve(updateStatus(args));
      }
      debug('********* UPDATES CHECKED ******', info);
      resolve({ ...info.updateInfo, ...updateStatus(args) })
    }).catch((e) => {
      debug("AAA:175", e);
      resolve({ error: e });
    })
  })
}

/**
 * 
 */
async function showVersion() {
  let { main_domain } = Account.bootstrap();

  let { webVersion, desktopVersion, commit } = require("../../../dist-web/index.json");
  let info = await checkForUpdates();
  if (info && info.version) {
    desktopVersion = info.version;
  }
  let message = `
    Web UI Version: ${webVersion}
    Desktop Application Version: ${desktopVersion}
    Web Commit Id: ${commit}
    Plateform : ${main_domain}
    Chromium : ${process.versions.chrome}
    Electron : ${process.versions.electron}
    Node : ${process.versions.node}
    `;
  const options = {
    type: 'info',
    title: 'Drumee',
    message
  };
  debug("VERSION", options);
  dialog.showMessageBox(null, options);
}

/**
 * 
 */
async function checkVersion(quiet = 1) {
  let options = { type: _a.info };
  let info = await checkForUpdates();
  console.log("AAA:196 -- checkVersion", info);
  if (info && info.version) {
    if (isUpdating) {
      options.message = LOCALE.UPDATE_ALREADY_PENDING.format(info.version);
    } else {
      options.message = LOCALE.ALREADY_UP_TO_DATE.format(info.version);
    }
  } else {
    let { desktopVersion } = require("../../../dist-web/index.json");
    options.message = `Update information not available. Build version=${desktopVersion} `;
  }

  if (quiet) return;
  dialog.showMessageBox(null, options).then(async (r) => {
  })
}

/**
 * 
 * @returns 
 */
function quitAndInstall() {
  console.log("AAA:215 -- quitAndInstall", updateStatus());
  // app.quit();
  //if(!readyToInstall) return ;
  app.needToInstall = true;
  let ok = false;
  try {
    autoUpdater.quitAndInstall(false, true);
    console.log("AAA:222 -- RESTARTING", updateStatus());
    ok = true;
  } catch (e) {
    ok = false;
    console.log("AAA:234 -- Failed to install", e);
  }
  if (ok) return;
  setTimeout(() => {
    app.quit();
  }, 60 * 1000);
  return { isUpdating }
}

/**
 * 
 * @returns 
 */
function updateStatus(args) {
  return { readyToInstall, isUpdating, updateAvailable, ...args };
}

/**
 * 
 * @returns 
 */
function checkAppImage() {
  let appImage = Path.join(__dirname, 'dist');
  debug(process.arch, appImage, app.arch);
  debug(Os.arch(), Os.cpus(), app.getName(), app.getAppPath());
  debug(Os.platform(), Os.release(), Os.version(), Os.type());
}
module.exports = { quitAndInstall, checkVersion, downloadUpdate, showVersion, checkAppImage, checkForUpdates };
