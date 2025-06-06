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
const _ = require('lodash');
const Utils = require('./core-utils');
const { ipcMain, dialog } = require('electron');

class __drumee_electron extends Utils {

  /**
   * 
   * @returns 
   */
  initialize(opt) {
    if (_.isString(opt)) {
      this.set(opt, opt);
    } else if (_.isObject(opt)) {
      for (var k in opt) {
        this.set(k, opt[k])
      }
    }


    if (this.methods) {
      for (var m of this.methods) {
        for (var k in m) {
          this[k] = m[k].bind(this);
        }
      }
    }
  }
  
  /**
   * 
   * @returns 
   */
  name() {
    return this.constructor.name;
  }

  /**
   * 
   */
  bindEvents() {
    this._eventsBound = 1;
    if (this.userEvents) {
      this._userHandlers = {};
      for (var c in this.userEvents) {
        let func = this.userEvents[c];
        if(this[func]) this[func] = this[func].bind(this);
        if (this._userHandlers[c]) {
          continue;
        }
        this._userHandlers[c] = (a) => {
          if (this._isDestroyed) {
            return;
          }
          try {
            this[func](a);
          } catch (e) {
            this.debug(`Failed to exceute ${func}`, e);
          }
        };
        if (_.isFunction(this[func])) {
          Account.on(c, this._userHandlers[c]);
        }
      }
    }

    if (this.webEvents) {
      this._webHandlers = {};
      for (var c in this.webEvents) {
        //this.debug(`AAA:70 -- Binding ${c}`);
        let func = this.webEvents[c];
        if(this[func]) this[func] = this[func].bind(this);
        if (this._webHandlers[c]) {
          this.debug(`AAA:73 ${c} has already a handler. skiping`);
          continue;
        }
        // this.debug("AAA:82 -- BINDING webEvents", c);
        this._webHandlers[c] = (e, a) => {
          if (this._isDestroyed) {
            this.debug("AAA:83 -- CALLING DESTROYED WEB HANDLER",
              this.cid, this._isDestroyed, c, func, a
            );
            return;
          }
          try {
            this[func](a);
          } catch (e) {
            this.debug(`Failed to exceute ${func}`, e);
          }
        };
        if (_.isFunction(this[func])) {
          ipcMain.on(c, this._webHandlers[c]);
        }
      }
    };
  }

  /**
   * 
   */
  unbindEvents() {
    if (_.isObject(this.webEvents)) {
      for (var c in this.webEvents) {
        if (this._webHandlers && this._webHandlers[c]) {
          this.debug("REMOVING CHANNEL", this.cid, c);
          ipcMain.off(c, this._webHandlers[c]);
          this._webHandlers[c] = null;
        }
      }
    }
    if (_.isObject(this.userEvents)) {
      for (var c in this.userEvents) {
        if (this._userHandlers && this._userHandlers[c]) {
          this.debug("REMOVING USER EVENT", this.cid, c);
          Account.off(c, this._userHandlers[c]);
          this._userHandlers[c] = null;
        }
      }
    }
    this._userHandlers = null;
    this._webHandlers = null;
    this.userEvents = null;
    this.webEvents = null;
  }

  /**
   * 
   */
  destroy() {
    this.debug("STOPPING....");
    this.unbindEvents();
    this._isDestroyed = true;
  }

  /**
   * 
   * @param {*} opt 
   */
  showMessageBox(opt) {
    this.debug('AAA:103', opt);
    const options = {
      type: 'error',
      buttons: [LOCALE.CLOSE, LOCALE.OK],
      detail: "",
      title: "No title",
      message: "no message",
      ...opt
    };
    if (options.type == 'error') console.trace();
    dialog.showMessageBox(null, options);
  }

  /**
   * 
   * @param {*} opt 
   */
  showErrorBox(opt) {
    if (_.isString(opt)) opt = { message: opt };
    const options = {
      type: 'error',
      buttons: [LOCALE.CLOSE],
      detail: "",
      title: LOCALE.ERROR_SERVER,
      message: "no message",
      ...opt
    };
    console.trace();
    dialog.showMessageBox(null, options);
  }

  /**
   * 
   * @param {*} opt 
   */
  confirm(opt) {
    // this.debug('AAA:123', opt);
    return new Promise((resolve, reject) => {
      const options = {
        type: 'question',
        buttons: [LOCALE.IGNORE, LOCALE.YES],
        defaultId: 0,
        detail: "",
        title: "No title",
        message: "no message",
        ...opt
      };
      dialog.showMessageBox(null, options).then((r) => {
        //this.debug('AAA:135', r);
        resolve(r);
      }).catch(reject);
    })
  }


  /**
   * 
   */
  url() {
    return "/";
  }

}

module.exports = __drumee_electron;

