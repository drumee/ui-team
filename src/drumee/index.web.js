/**
 * @license
 * Copyright 2025 Thidima SA. All Rights Reserved.
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

const STYLE = "color: green; font-weight: bold;"

const App = require('./drumee');
window.Drumee = new App();
if ((window.__filename == null)) {
  window.__filename = null;
}
window.DrumeeMFS = require('./core/mfs');
window.DrumeeMediaInteract = require('builtins/media/interact');

/**
 * 
 */
$(document).ready(function () {
  console.log(`Staring Drumee Web...`);
  console.log(`Build commit=%c${__COMMIT__}, mode=${__BUILD__}`, STYLE);
  console.log(`UI version=%c${Drumee.version} (000)`, STYLE);
  Drumee.loadSprites();
  Drumee.start();
  const event = new Event('drumee:app:started');
  event.root = this.content;
  document.dispatchEvent(event);

});
