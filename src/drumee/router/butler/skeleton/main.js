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
const __skl_login = function(_ui_) {
  let a;
  const cross_options = {
    height  : 48,
    width   : 48,
    padding : 16
  };

  const top_bar = {
    kind: KIND.box,
    flow: _a.vertical, 
    className: "u-ai-center",
    kids: [
      Skeletons.Note(LOCALE.LOG_IN, `${_ui_.fig.family}__title mb-14`)
    ]
  };

  return a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__main`,
    debug       : __filename,
    kids        : [
      top_bar,
      Skeletons.Box.Y({
        className : "u-ai-center",
        styleOpt  : {
          width   : 300,
          height  : _a.auto
        },
        kids      : require('./entries')(_ui_) 
      }),
      Skeletons.Box.Y({
        className : "u-ai-center",
        justify   : _a.right,
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__button btn u-jc-center go`,
            //ui        : _ui_ 
            service   : "log-in",
            content   : LOCALE.GO
          })
        ]
      }),
      Skeletons.Box.X({
        className : "u-jc-sb",
        styleOpt  : {
          width   : 220
        },
        kids      : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__button link forgot-pw`,
            //ui        : _ui_ 
            href      : "#/welcome/reset", 
            content   : LOCALE.Q_FORGOT_PASS_PHRASE
          }),
          Skeletons.Note({
            className : `${_ui_.fig.family}__button link no-account`,
            href      : "#/welcome/signup", 
            content   : LOCALE.Q_NO_ACCOUNT
          })
        ]
      })
    ]});
};
module.exports = __skl_login;
