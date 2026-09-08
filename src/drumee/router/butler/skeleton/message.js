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
/**
 * @param {Object} [opt]
 * @param {Boolean} [opt.closable=true]  false drops the header X, leaving the
 *        primary button as the single way out. Both fire _e.close, so they
 *        already did the same thing; a caller that gives closing a MEANING
 *        (Butler.say's callback) wants one control, not two.
 */
const message = function(_ui_, content, type, opt = {}) {
  const fig = _ui_.fig.family;
  let body;
  if (_.isString(content)) {
    body = Skeletons.Note({
      className : `${fig}__message ${type}`,
      content
    });
  } else {
    body = content;
  }
  // Based on builtins/window/confirm + the image: logo+close header, left-aligned
  // body, right-aligned primary Close. `notice` scopes alignment to this dialog.
  const a = Skeletons.Box.Y({
    className : `${fig}__main notice`,
    debug     : __filename,
    sys_pn    : "container",
    kids: [
      require('./header')(_ui_, _e.close, opt),
      type ? Skeletons.Note({
        className : `${fig}__title`,
        content   : type
      }) : null,
      body,
      Skeletons.Box.X({
        className : `${fig}__buttons`,
        kids:[
          Skeletons.Note({
            className : `${fig}__button-primary button`,
            content   : LOCALE.CLOSE,
            service   : _e.close,
            uiHandler : _ui_
          })
        ]
      })
    ].filter(Boolean)});
  return a;
};
module.exports = message;
