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
const { dialog } = require("electron");

let PENDING = {
  local: {
    fifo: [],
    option: null,
    repeat: false
  },
  remote: {
    fifo: [],
    option: null,
    repeat: false
  },
}



/**
 *
 */
async function _confirmOverwrite(pending) {
  let { fifo, option, repeat } = pending;
  let item = fifo[0];
  //this.debug("AAA:24 _confirmOverwrite", fifo.length, item, option, repeat);
  if (!item || !item.filepath) {
    return;
  }
  switch (option) {
    case "local":
      if (repeat) {
        while (fifo.length) {
          item = fifo.shift();
          item.name = "file.modified";
          this.debug("AAA:34 _confirmOverwrite", item, option, repeat);
          if (!item || !item.filepath) {
            break;
          }
          this.local.bindEntity(item);
          mfsScheduler.log(item);
        }
        return;
      } else {
        item = fifo.shift();
        item.name = "file.modified";
        this.local.bindEntity(item);
        mfsScheduler.log(item);
      }
      pending.option = null;
      break;
    case "cloud":
      if (repeat) {
        let q = {};
        while (fifo.length) {
          let item = fifo.shift();
          item.name = "media.write";
          if (!item || !item.nid) {
            continue;
          }
          if(q[item.nid]) continue;
          q[item.nid] = 1;
          mfsScheduler.log(item);
        }
        return;
      } else {
        item = fifo.shift();
        item.name = "media.write";
        mfsScheduler.log(item);
      }
      pending.option = null;
      break;

    case "later":
      return;
  }

  if (!fifo.length) {
    return;
  }

  let buttons = [LOCALE.LOCAL_VERSION, LOCALE.CLOUD_VERSION, LOCALE.CHOOSE_LATER];
  //this.debug("AAA:171", buttons);
  return new Promise((resolve, reject) => {
    const options = {
      type: "question",
      buttons,
      defaultId: 0,
      detail: item.filepath,
      title: LOCALE.WARNING,
      checkboxLabel: LOCALE.APPLY_ON_NEXT_DELETION,
      message: LOCALE.LOCAL_VERSION_EXISTS,
    };

    //this.debug("187", options);
    dialog
      .showMessageBox(null, options)
      .then(async (r) => {
        this.debug("AAAA:130", r, pending.option);
        switch (r.response) {
          case 0:
            pending.option = "local";
            if (r.checkboxChecked) {
              pending.repeat = true;
            } else {
              pending.repeat = false;
            }
            break;
          case 1:
            pending.option = "cloud";
            if (r.checkboxChecked) {
              pending.repeat = true;
            } else {
              pending.repeat = false;
            }
            break;
          case 2:
            pending.option = "later";
            break;
          default:
            pending.option = null;
        }
        await this._confirmOverwrite(pending);
        resolve(pending.option);
      })
      .catch(reject);
  });
}




/**
 *
 */
function confirmOverwrite(evt, bound) {
  let pending = PENDING[bound]
  if (!pending) {
    this.debug(`Bound ${bound} is not expected`);
    return;
  }
  let { fifo } = pending;
  fifo.push(evt);
  if (fifo.length > 1) {
    return;
  }
  return this._confirmOverwrite(pending);
}


module.exports = { confirmOverwrite, _confirmOverwrite }
