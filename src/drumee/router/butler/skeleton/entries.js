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
const __skl_login_entries = function(_ui_) {
  const ident = { 
    kind        : KIND.entry_reminder,
    className   : `${_ui_.fig.family}__container-input mb-20 pb-12`,
    //ui          : _ui_
    service     : _e.submit, 
    placeholder : LOCALE.EMAIL_OR_IDENT,
    require     : "email_or_id",
    sys_pn      : "ref-ident",
    preselect   : 1
  };
    
  const password = { 
    kind        : KIND.entry_reminder,
    className   : `${_ui_.fig.family}__container-input mb-20 pb-12`,
    uiHandler   : _ui_,
    service     : _e.submit, 
    type        : _a.password,
    placeholder : LOCALE.PASS_PHRASE,
    require     : "any",
    sys_pn      : "ref-password",
    shower      : 1
  };
    // handler : 
    //   part  : _ui_
      
  const a = [
    Skeletons.Box.Y({
      className : `${_ui_.fig.family}__container-entries`,
      kids        : [
        ident,
        password
      ]
    }),
    Skeletons.Wrapper.Y({
      name      : "error",
      // ui        : _ui_
      className : `${_ui_.fig.family}__error absolute u-jc-center`
    })
  ];
  return a;
};
module.exports = __skl_login_entries;
