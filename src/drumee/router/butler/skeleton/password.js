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
const _password = function(_ui_) {

  const options = {
    width   : 23,
    height  : 23,
    padding : 0
  };
  const ph = _ui_.mget(_a.placeholder) || LOCALE.PASS_PHRASE;

  const entry = Skeletons.Entry({
    name        : _a.password,
    type        : _a.password,
    className   : "input--inline input--small",
    placeholder : LOCALE.EMAIL_OR_IDENT,
    require     : "email_or_id",
    sys_pn      : "ref-password",
    mode : _a.interactive, 
    service     : 'check-password',
    require     : "any",
    uiHandler   : _ui_ 
  });

  const icon = Skeletons.Button.Icon({
    ico       : "desktop_hidepassword",
    className : `${_ui_.fig.family}__icon show-password`,
    service   : "show-password",
    uiHandler : _ui_,
    state     : 1
  }, options); 

  const reminder = Skeletons.Note({
    content   : ph,
    className : `${_ui_.fig.family}__label ph-reminder mb-26`,
    sys_pn    : "reminder",
    uiHandler : _ui_ 
  });

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__container-input mb-20`,
    kids        : [entry, icon, reminder]
  });
  return a;
};
module.exports = _password;
