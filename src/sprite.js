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


function loadSprite() {
  function create_el(content, type) {
    const el = document.createElement(_K.tag.div);
    el.style = "display:none !important";
    el.className = `svg-sprite-${type}`;
    el.style.cssText = "display:none !important";
    el.innerHTML = content;
    document.body.insertBefore(el, document.body.childNodes[0]);
  }
  let raw = require('../icons/sprites/raw.sprite.txt').default;
  let normalized = require('../icons/sprites/normalized.sprite.txt').default;
  create_el(raw, 'raw');
  create_el(normalized, 'normalized');
}
document.addEventListener('readystatechange', () => {
  if (document.readyState == 'complete') {
    console.log(`Loading Sprite...`);
    loadSprite()
    const event = new Event('drumee:bootstraping');
    event.name = 'sprite'
    document.dispatchEvent(event);
  }
}, false);