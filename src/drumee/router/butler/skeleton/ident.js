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
const _ident = function(_ui_) {

  const entry = Skeletons.Entry({
    name        : _a.email,
    className   : "input--inline input--small",
    placeholder : LOCALE.EMAIL_OR_IDENT,
    require     : "email_or_id",
    sys_pn      : "ref-ident",
    preselect   : 1,
    error_box   : require("./tooltips")(_ui_),
    mode : _a.interactive, 
    service     : _e.check
    //ui          : _ui_ 
  });

  const reminder = Skeletons.Note({
    content   : LOCALE.EMAIL_OR_IDENT,
    className : `${_ui_.fig.family}__label ph-reminder mb-26`,
    sys_pn    : "reminder"
    //ui        : _ui_ 
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__container-input mb-20 pb-12`,
    kids        : [entry, reminder]
  });
  return a;
};
module.exports = _ident;
