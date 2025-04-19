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
const _a = require("../../lex/attribute");
const _ = require("lodash");

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
    for (var k of [_a.profile, _a.settings]) {
      if (_.isString(data[k])) {
        this.set(k, JSON.parse(data[k]));
      }
    }
    this.set(_a.id, uid || id);
    this.set(_a.uid, uid || id);
    // Once a session is devel, keep the state
    if (this.isDevel()) {
      ARGV.dev = true;
    }

    // Once a session is devel, keep the state
    if (this.isDemo()) {
      ARGV.demo = true;
    }
  }

  /**
   *
   * @returns
   */
  username() {
    return this.get(_a.username) || "nobody";
  }

  /**
   *
   * @returns
   */
  isDevel() {
    let p = this.get(_a.profile) || {};
    return p.devel || ARGV.dev;
  }

  /**
   *
   * @returns
   */
  isSyncExpert() {
    // return true;
    let p = this.get(_a.profile) || {};
    return p.syncExpert || ARGV.syncExpert;
  }

  /**
   *
   * @returns
   */
  isDemo() {
    let p = this.get(_a.profile) || {};
    return p.demo || ARGV.demo;
  }

  /**
   *
   * @returns
   */
  isOnline() {
    if (global.CONNECTION_STATE === _a.offline) return false;
    if (this.get(_a.connected) || this.get(_a.connection) == _a.online) {
      this.set({ signed_in: 1 });
    }
    return this.get(_a.signed_in);
  }

  /**
   *
   */
  language() {
    const { lang } = this.get(_a.profile) || { lang: "en" };
    return lang;
  }
}

module.exports = __core_user;
