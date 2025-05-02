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
const Path = require('path');
const _a = require('../lex/attribute');
const _ = require('lodash');
const Fs = require('fs');
const mfsUtils = require('./utils');
const { dialog } = require('electron');

/***********************************
 * 
 ***********************************/
class Media extends mfsUtils {

  /**
  * 
  */
  isDirectory(item) {
    let s = this.localFile(item, _a.stat);
    return (s.ino && s.isDirectory());
  }


  /**
  * 
  */
  cancelSync(data) {
    this.debug("AAA:17", data);
    if (request && _.isFunction(request.getUploadProgress)) {
      this.debug("AAA:19", request.getUploadProgress());
    }
  }

  /**
  * 
  * @param {*} d -- Node data 
  * @returns 'https://remote.file.url/file/d.nid/d.hub_id&changed'
  */
  getNodeUrl(d) {
    let url = Account.bootstrap().mfsRootUrl + `file/orig/${d.nid}/${d.hub_id}`;
    let changed = Math.abs(d.changed) || Math.abs(d.mtime - d.ctime);
    if (changed && !_.isNaN(changed)) {
      url = `${url}?c=${changed}`;
    }
    return url;
  }

  /**
   * 
   * @param {*} dirname 
   * @returns 
   */
  isEmptyDir(arg) {
    let path;
    if (_.isObject(arg)) {
      path = this.localFile(arg, _a.absolute);
    } else {
      path = arg;
    }
    //this.debug("AAA:177", arg, path);
    return new Promise((resolve, reject) => {
      Fs.readdir(path, function (err, files) {
        if (err) {
          reject(err)
        } else {
          if (!files.length) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    })
  }


  /**
   * 
   * @param {*} location 
   */
  checkFile(data) {
    let location = this.localFile(data, _a.location);
    return new Promise(async (resolve, reject) => {
      //this.debug("AAA:530 -- checkFile", data);
      let diskFree = await this.diskFree();
      if (!diskFree) {
        this.scheduler.pause();
        return reject(message)
      }
      if (!this.diskSpace) {
        return reject(`
        Target *${location}* is outside of safe location ${USER_HOME_DIR}!`
        );
      }
      if (this.isSafeLocation(location)) {
        let dirname = Path.dirname(location);
        if (!Fs.existsSync(dirname)) {
          Fs.mkdirSync(dirname, { recursive: true });
        }
        if (Fs.existsSync(location)) {
          let stat = Fs.lstatSync(location);
          if (stat.isDirectory()) {
            return reject(`
            Target *${location}* is a directory. Won't download!`
            );
          }
        }
        resolve(location);
      } else {
        reject(`
        Target *${location}* is outside of safe location ${USER_HOME_DIR}!`
        );
      }
    })
  }

  /**
   * 
   * @param {*} l 
   * @returns 
   */
  isSafeLocation(l) {
    let re = USER_HOME_DIR.replace(/[\/\\]/g, '');
    let val = l.replace(/[\/\\]/g, '');
    let safe_loc = new RegExp(`^${re}`);
    return safe_loc.test(val);
  }

  /**
   * 
   * @param {*} evt 
   * @returns 
   */
  shouldSkipSync(evt) {
    if (this.syncOpt.rootSettings().direction == _a.downstream) return _a.terminated;
    let { force } = this.event.parseArgs(evt);
    if (force) return null;
    switch (evt.sync) {
      case 0: 
      case -1:
        return _a.ignored;
      case 1:
        return null;
      default:
        if (this.syncOpt.getNodeState(evt) ) {
          return null;
        }
        return _a.ignored;
      }
  }

  /**
  * 
  * @returns 
  */
  checkPermission(item, p) {
    if (!item || !item.privilege & p) return 'PERMISSION_DENIED';
    return null;
  }



  /**
 * 
 */
  nop() {
    return _a.synced;
  }


  /**
   * 
   * @param {*} parent 
   * @returns 
   */
  getParentFlags(parent) {
    while (parent && parent.filepath) {
      let filepath = Path.dirname(parent.filepath)
      parent = this.getMedia({ filepath });
      if (!parent) return this.defaultFlags();
      if (parent.flags != null) return parent.flags;
    }
    return this.defaultFlags();
  }

  /**
   * 
   */
  normalizePathFromArgs(args) {
    let filepath = null;
    if (_.isString(args)) {
      filepath = args;
    } else if (args.dest) {
      filepath = args.dest;
      args.filepath = args.dest;
    } else if (args.filepath) {
      filepath = args.filepath;
    }
    return filepath;
  }


  /**
   * 
   * @param {*} d 
   */
  async dispatch(evt) {
    let name = evt.name;
    let fn = this.stateMachine[name];
    let state = null;
    if (fn && this[fn]) {
      try {
        let eventName = `${name}:${evt.filepath}`
        this.debug(`[dispatching] [${evt.id}] ${eventName} -> ${fn} ownpath=${evt.ownpath}`);
        state = await this[fn](evt);
        this.trigger(eventName, evt);
      } catch (e) {
        state = 'failed';
        if (e.error == 'EBUSY') {
          const options = {
            type: 'info',
            buttons: [LOCALE.OK],
            defaultId: 0,
            title: LOCALE.FILE_LOCKED,
            message: LOCALE.FILE_X_IS_BUSY.format(evt.filepath),
          };
          dialog.showMessageBox(null, options).then(async (r) => { });
          return;
        }
        this.debug(`Failed to run (${fn}):`, evt.name, evt.filepath);
        this.debug("------------------------------------------------");
        this.debug(e);
        this.debug("------------------------------------------------");
      }
    } else {
      state = _a.skip;
    }
    return state;

  }



  /**
   * 
   */
  handleFecthError(detail) {
    this.showMessageBox({
      type: _a.error,
      title: LOCALE.NETWORK_ERROR,
      message: LOCALE.DOWNLOAD_ERROR.format(path),
      detail,
    });
  }


  /**
* 
* @param {*} d -- Node data 
* @returns 'https://remote.file.url/file/d.nid/d.hub_id&changed'
*/
  getNodeUrl(d) {
    let url = Account.bootstrap().mfsRootUrl + `file/orig/${d.nid}/${d.hub_id}`;
    let changed = Math.abs(d.changed) || Math.abs(d.mtime - d.ctime);
    if (changed && !_.isNaN(changed)) {
      url = `${url}?c=${changed}`;
    }
    return url;
  }


  /**
  * 
  * @param {*} d -- Node data 
  * @returns {filepath: '/path/to/local/file', url:'https://remote.file.url/file/...', ...}
  */
  async getNodeLocation(d) {
    let nid = d.nid;
    if (d.file_path && !d.filepath) d.filepath = d.file_path;
    if (!d.filepath) {
      let l = await this.readData(d, _a.nid);
      if (_.isEmpty(l)) {
        l = await this.readData(_a.filepath, d.filepath);
      }
      nid = nid || l.nid;
      if (!_.isEmpty(l)) {
        d.filepath = d.filepath || l.filepath;
      }
    }
    let filepath;
    //this.debug("AAA:250", this.workingRoot, d);
    filepath = d.filepath || Path.join(this.workingRoot, d.filepath);
    if ([_a.hub, _a.folder].includes(d.filetype)) {
      let re = new RegExp(`\.(${d.nid}|${d.ext})$`)
      filepath = filepath.replace(re, '');
      d.isBranch = 1;
    }

    // let url = `https://${d.vhost}${d.filepath}`;
    let url = Account.bootstrap().mfsRootUrl + `file/orig/${d.nid}/${d.hub_id}`;
    let changed = d.mtime - d.ctime;
    if (changed && !_.isNaN(changed)) {
      url = `${url}?c=${changed}`;
    }
    filepath = filepath.toString("utf8");
    return { ...d, filepath, url, changed, nid: d.nid };
  }

}
module.exports = Media;
