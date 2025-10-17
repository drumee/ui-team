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
const __router_main = function (_ui_) {

  const family = `${_ui_.fig.family}`;
  function skeletons(name, type='Wrapper', flow='Y'){
    return Skeletons[type][flow]({
      className: `${family}__${name}`,
      sys_pn: name,
    })
  }
  
  return Skeletons.Box.Y({
    className: `${family}__main`,
    sys_pn: 'main',
    kids: [
      skeletons('header'),
      skeletons('body', 'Box', 'Y'),
      skeletons('wallpaper', 'Box', 'Y'),
      skeletons('footer'),
      skeletons('modal'),
      skeletons('context'),
      skeletons('dialog'),
      skeletons('tooltips'),
      skeletons('hidden'),
      skeletons('fixed-box'),
  
      Skeletons.Box.Y({
        className: `${family}__sentry`,
        kids: [
          { sys_pn: 'butler', kind: "butler", wrapper: 1 },
          { sys_pn: 'websocket', kind: KIND.ws_channel }
        ]
      })
    ]
  })
};
module.exports = __router_main;
