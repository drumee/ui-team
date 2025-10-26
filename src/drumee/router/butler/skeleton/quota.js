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
const _upgrade = function (_ui_, args) {
  const {content, title} = args;
  const body = Skeletons.Box.Y({
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__message info my-30`,
        content
      }),
    ]
  });

  let okBtn = LOCALE.OK;
  let okBtnSedrvice = _a.close;
  
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug: __filename,
    sys_pn: "container",
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Note({
        className: `${_ui_.fig.family}__title mb-20`,
        content: title || LOCALE.DRUMEE_THANKS || "Congratulations for using Drumee"
      }),
      body,
      Skeletons.Box.X({
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__button u-jc-center overflow-text go`,
            content: okBtn,
            service: okBtnSedrvice
            // ui        : _ui_
          })
        ]
      })
    ]
  });
  return a;
};
module.exports = _upgrade;
