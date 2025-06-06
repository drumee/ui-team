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

const Attr = require("../../lex/attribute");
const { isString } = require("lodash");

const { sync_mode, experimental, dev_mode } = require('../../args')
const __service = require("../service");
class __core_user extends __service {
  /**
   *
   * @param {*} e
   * @param {*} data
   */
  respawn(data) {
    let { uid, id } = data;
    this.set(data);
    for (var k of [Attr.profile, Attr.settings]) {
      if (isString(data[k])) {
        this.set(k, JSON.parse(data[k]));
      }
    }
    this.set(Attr.id, uid || id);
    this.set(Attr.uid, uid || id);
  }

  /**
   *
   * @returns
   */
  username() {
    return this.get(Attr.username) || "nobody";
  }

  /**
   *
   * @returns
   */
  isDevel() {
    let p = this.get(Attr.profile) || {};
    return p.devel || dev_mode;
  }

  /**
   *
   * @returns
   */
  isSyncExpert() {
    // return true;
    let p = this.get(Attr.profile) || {};
    return p.syncExpert || sync_mode === 'experimental';
  }

  /**
   *
   * @returns
   */
  isDemo() {
    let p = this.get(Attr.profile) || {};
    return p.demo || experimental;
  }

  /**
   *
   * @returns
   */
  isOnline() {
    if (global.CONNECTION_STATE === Attr.offline) return false;
    if (this.get(Attr.connected) || this.get(Attr.connection) == Attr.online) {
      this.set({ signed_in: 1 });
    }
    return this.get(Attr.signed_in);
  }

  /**
   *
   */
  language() {
    const { lang } = this.get(Attr.profile) || { lang: "en" };
    return lang;
  }
}

module.exports = __core_user;
