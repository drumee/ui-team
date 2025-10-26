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
const __skl_hello = function(view) {
  const a = { 
    kind: KIND.box,
    flow: _a.vertical,
    className: 'u-jc-center u-ai-center welcome',
    styleOpt: {
      width: _K.size.full,
      height: _K.size.full,
      'min-height': '100vh',
      'min-width' : '100vw',
      background: '#ffffff'
    },
    kids: [
      SKL_Note(null, LOCALE.WELCOME_BACK, {className:'welcome__header1'}),
      SKL_Note(null, LOCALE.YOU_WILL_BE_ONLINE, {className:'welcome__header2 mt-16'}),
      SKL_SVG('welcome', {className:'welcome__icon mt-30'}, {
        width: 475,
        height: 354,
        padding: 0
      })
    ]
  };

  return a;
};
module.exports = __skl_hello;
