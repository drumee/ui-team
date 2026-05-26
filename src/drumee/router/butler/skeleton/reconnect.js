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
const _reconnect = function (ui, vhost, title) {
  let { email } = Visitor.profile();
  const fig = ui.fig.family;

  const body = {
    kind: "welcome_signin",
    sys_pn: "reconnect-popup",
    uiHandler: [ui],
    partHandler: [ui],
    reconnect: 1,
    vhost,
    uid: Visitor.id,
    email,
    reconnect_title: title,
    dataset: {
      mode: "reconnect",
    },
  };

  return Skeletons.Box.Y({
    className: `${fig}__reconnect main`,
    debug: __filename,
    sys_pn: "raw-content",
    kids: [
      Skeletons.Box.X({
        className: `${fig}__reconnect close`,
        kids: [Preset.Button.Close(ui, "close-reconnect")],
      }),
      body,
    ],
  });
};
module.exports = _reconnect;
