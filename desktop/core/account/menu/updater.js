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
const { ipcMain, app, dialog } = require('electron');
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const _a = require('../../../lex/attribute');
const __core = require('../../../core');
class __updater extends __core {

  /**
   * Init Auto Update events
   * @param {*} win 
  
   * @returns 
   */
  initialize(opt) {
    //let webContents = opt.webContents;
    super.initialize(opt);
    this._downloading = false;
    this._readyToInstall = false;

    /** ----------  */
    autoUpdater.on('checking-for-update', () => {
      this._downloading = false;
      this.debug('Checking for update... ', app.getVersion());
      webContents.send("updater-web-checking", {
        version: app.getVersion()
      })
    })

    /** ----------  */
    autoUpdater.on('update-available', (info) => {
      this.debug('Update available.');
      webContents.send("updater-web-available", {
        version: app.getVersion(),
        info
      });
      // setTimeout(() => {
      //   this.debug('OPEN Update available.');
      //   webContents.send("updater-web-available", { version: app.getVersion(), info: info });
      // }, 3000);

    })

    /** ----------  */
    autoUpdater.on('update-not-available', (info) => {
      this.debug('Update not available.', info);
      this._downloading = false;
      webContents.send("updater-web-not-available", {
        version: app.getVersion(),
        info
      });
    })

    /** ----------  */
    autoUpdater.on('error', (err) => {
      this.debug('Error in auto-updater. ' + err);
      this._downloading = false;
      if(Account.user.isDevel()){
        if(/code signature/i.test(err)){
          this._readyToInstall;
          return;
        }
      }
      webContents.send("updater-web-error", {
        version: app.getVersion(),
        error: err
      });
    })

    /** ----------  */
    autoUpdater.on('download-progress', (p) => {
      this._downloading = true;
      let log_message = "Download speed: " + p.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + p.percent + '%';
      log_message = log_message + ' (' + p.transferred + "/" + p.total + ')';
      this.debug(log_message);
      webContents.send("updater-web-download-progress", {
        version: app.getVersion(), info: p
      });
    })

    /** ----------  */
    autoUpdater.on('update-downloaded', (info) => {
      this.debug('Update downloaded');
      webContents.send("updater-web-download-ended", {
        version: app.getVersion(),
        info
      });
      this._downloading = false;
      this._readyToInstall = true;
    });


    /** ----------  */
    ipcMain.on('web-updater-download', (e, arg) => {
      if (this._downloading) {
        this.showMessageBox({
          type: 'info',
          message: LOCALE.DOWNLOADING,
          detail: `${e.updateInfo.path} (${e.updateInfo.releaseDate})`
        })

        this.debug("AAA:94 -- ALREADY DOWNLOADING....");
        return;
      }
      this._downloading = true;
      this.debug("AAA:98 -- START DOWNLOADING....");
      autoUpdater.downloadUpdate();
    });

    // /** ----------  */
    ipcMain.on('web-updater-quit+install', (e, arg) => {
      if (!this._readyToInstall) {
        this.debug("Not ready yet.");
        return;
      }
      this.debug("AAA:105 -- RESTART AFTER INSTALL ....");
      app.isQuiting = true;
      autoUpdater.quitAndInstall(false, true);
    });


    this.checkVersion(opt);

  }

  /**
   * 
   * @returns 
   */
  isDownloading() {
    return this._downloading;
  }

  /**
   * 
   */
  checkVersion(opt = {}) {
    //this.debug("AAAA:90 -- checking new version...", opt)
    if(global.IS_UPDATING){
      const options = {
        type: _a.info,
        message: LOCALE.UPDATE_ALREADY_PENDING,
      };
      dialog.showMessageBox(null, options).then(async (r) => {
        this.alertPending = 0;
        switch (r.response) {
          case 0:
            app.isQuiting = true;
            autoUpdater.quitAndInstall(false, true);
            break;
          default:
        }
      })
      return;
    }
    log.transports.file.level = "debug"
    autoUpdater.scheduler = log
    webContents.send('updater-web-start', {});
    autoUpdater.checkForUpdates().then(e => {
      console.log('Checking for update. Manually download 24', e);
      if (e.versionInfo.version == e.versionInfo.updateInfo) {
        this.showMessageBox({
          type: _a.info,
          title: LOCALE.NO_UPDATE,
          message: LOCALE.ALREADY_UP_TO_DATE.format(e.versionInfo.version),
          detail: `${e.updateInfo.path} (${e.updateInfo.releaseDate})`
        })
      }
    }).catch((e) => {
      this.debug("AAA:151", e)
      this.showMessageBox({
        type: _a.error,
        title: LOCALE.NO_UPDATE,
        message: LOCALE.TRY_AGAIN,
        detail : e.code
      })
    })
  }
}

module.exports = __updater;
