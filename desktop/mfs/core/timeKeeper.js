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
const __service = require("../../core/service");
const Attr = require("../../lex/attribute");
let TIME_DIFF = 0;
class timeKeeper extends __service {
  initialize(opt) {
    super.initialize(opt);
    this.syncTime().then(() => {
      setInterval(this.syncTime.bind(this), 600000)
    })
  }

  /**
   * 
   * @param {*} samples 
   * @returns 
   */
  async syncTime(samples = 3) {
    const diffs = [];

    for (let i = 0; i < samples; i++) {
      try {
        const diff = await this.calculateSingleDiff();
        diffs.push(diff);
      } catch (error) {
        console.error('Error in time sync:', error);
      }

      // Small delay between samples
      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate median to filter outliers
    diffs.sort((a, b) => a - b);
    TIME_DIFF = diffs[Math.floor(diffs.length / 2)];
    return TIME_DIFF;
  }

  /**
   * 
   * @returns 
   */
  async calculateSingleDiff() {
    const t1 = Date.now();

    const response = await this.postService("bootstrap.getSyncTimes", { t1 })
    const { t2, t3 } = response || {};
    if (!t2 || !t3) {
      this.debug("Server error")
      return 0;
    }

    const t4 = Date.now();

    // Calculate time difference
    let delta = ((t2 - t1) + (t3 - t4)) / 2;
    return delta;
  }

  /**
   * 
   * @returns 
   */
  getServerTime() {
    return Date.now() + TIME_DIFF;
  }

  /**
 * 
 * @returns 
 */
  getTimeOffset() {
    return TIME_DIFF;
  }
}

module.exports = timeKeeper;
