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
const __core = require('.');

class CoreDialog extends __core{


  /**
   * 
   * @param {*} msg 
   */
  webAlert(msg) {
    webContents.send('ipc-web-alert', msg);
  }


  /**
   * 
   * @param {*} win 
   * @param {*} filePath 
   */
  modalMessage (message){
    let promptWindow = new BrowserWindow({
      parent: global.win,
      modal: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    promptWindow.on('close', function () {
      promptWindow = null
    })

    promptWindow.once('ready-to-show', () => {
      promptWindow.show();
    });
  }
}

module.exports = CoreDialog;

