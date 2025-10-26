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
const __viewer_body = function (view) {
  const a = [
    Skeletons.Box.Y({ sys_pn: 'body_left' }),
    Skeletons.Box.Y({
      sys_pn: _a.center, className: view.fig.family + "__body"
    }),
    Skeletons.Box.Y({ sys_pn: 'body_right' })
  ];
  return a;
};
module.exports = __viewer_body;
