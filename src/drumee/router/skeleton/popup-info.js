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
const __skl_popup_info = function(view, message) {
  const yes_opt = { 
    contentClass : _C.margin.auto,
    className    : 'popup__btn popup__btn--remove-page popup__btn--success',
    service      : _e.close
  };
  const a = Skeletons.Box.Y({
    debug : __filename,
    className : "popup__inner popup__inner--small pb-24 pt-30 px-40 u-jc-center u-ai-center",
    kids: [
      SKL_Note(_e.close, message, {
        className:"popup__header popup__header--remove-page mb-8"
      }),
      SKL_Box_H(view, {kids:[SKL_Note(null, LOCALE.OK, yes_opt)]})
    ]});
  return a;
};
module.exports = __skl_popup_info;
