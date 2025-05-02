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
const { desktopCapturer, systemPreferences } = require("electron");


const __service = require('../service');
class MinishellBridge extends __service {

  initialize(opt) {
    super.initialize(opt);

    this.webEvents = {
      'bridge-minishell': 'exec',
    }
    this.bindEvents();
  }

  /**
  * 
  */
  async getMediaAccess(type) {
    if (!systemPreferences.askForMediaAccess) {
      return true;
    }
    type = 'microphone';
    if (/^camera/i.test(type)) {
      type = 'camera';
    } else if (/^screen/i.test(type)) {
      type = 'screen';
    }
    let res = await systemPreferences.askForMediaAccess(type);
    this.debug("AAAA:32", res);
    return res;
  }

  /**
 * 
 */
  async getScreenSources(types) {

    let sources = await desktopCapturer.getSources({ types });
    let res = sources.map(source => {
      let url = source.thumbnail.toDataURL();
      if (url.replace(/^data:.+base64,/, '').length) {
        return {
          id: source.id,
          display_id: source.display_id,
          name: source.name,
          url: source.thumbnail.toDataURL()
        };
      }
      return null;
    }).filter((e) => {
      if (e) this.debug("AAA:233", e.name, e.id);
      return e;
    });
    //this.debug("AAA:233", res);
    return res;
  }

  /**
   * 
   */
  async getScreenAccess(args) {
    return this.getScreenSources(args);
  }

}

module.exports = MinishellBridge;

