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
const message = function(_ui_, content, type) {
  let body;
  if (_.isString(content)) {
    body = Skeletons.Note({
      className : `${_ui_.fig.family}__message ${type} my-30`,
      content,
      service   : _e.close
    });
  } else { 
    body = content;
  }
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug     : __filename, 
    sys_pn : "container",
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title mb-20`,
        content   : type
      }),
      body, 
      Skeletons.Box.X({
        kids:[
          Skeletons.Note({
            className : `${_ui_.fig.family}__button action u-jc-center overflow-text go`,
            content   : LOCALE.CLOSE,
            service   : _e.close 
            // ui        : _ui_
          })
        ]
      })
    ]});
  return a;
};
module.exports = message;
