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
const _reconnect = function (_ui_, vhost) {
  let { email } = Visitor.profile();
  let body = {
    kind: "welcome_signin",
    sys_pn: "reconnect-popup",
    uiHandler: [_ui_],
    partHandler: [_ui_],
    reconnect: 1,
    vhost,
    uid: Visitor.id,
    email,
    dataset: {
      mode: "reconnect",
    },
  }

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__reconnect main`,
    debug: __filename,
    sys_pn: "raw-content",
    kids: [
      Preset.Button.Close(_ui_, "close-reconnect"),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__reconnect header`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__reconnect title`,
            content: LOCALE.SESSION_EXPIRED
          })
        ]
      }),
      body
    ]
  });
  return a;
};
module.exports = _reconnect;
