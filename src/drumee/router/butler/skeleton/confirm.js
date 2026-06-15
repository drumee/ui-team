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
const __message = function(_ui_, content, type) {
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
  // Based on builtins/window/confirm + the update prompt image: logo+close
  // header, left-aligned body, right-aligned Cancel(secondary)/Confirm(primary).
  // The `notice` modifier scopes the left/right alignment to this dialog so the
  // shared login/reconnect dialogs keep their centered layout.
  const a = Skeletons.Box.Y({
    className : `${fig}__main notice`,
    debug     : __filename,
    sys_pn    : "container",
    kids: [
      require('./header')(_ui_, _e.cancel),
      type ? Skeletons.Note({
        className : `${fig}__title`,
        content   : type
      }) : null,
      body,
      Skeletons.Box.X({
        className : `${fig}__buttons`,
        kids:[
          Skeletons.Note({
            className : `${fig}__button-secondary button`,
            content   : _ui_.mget(_a.cancel) || LOCALE.CANCEL,
            service   : _e.cancel,
            uiHandler : _ui_
          }),
          Skeletons.Note({
            className : `${fig}__button-danger button`,
            content   : _ui_.mget(_a.confirm) || LOCALE.YES,
            service   : _e.confirm,
            uiHandler : _ui_
          })
        ]
      })
    ].filter(Boolean)});
  return a;
};
module.exports = __message;
