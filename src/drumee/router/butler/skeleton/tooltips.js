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
const __login_help = function(manager) {
  const pas_icon_options = { 
    width   : 23,
    height  : 23,
    padding : 4.5
  };

  const cross = SKL_SVG("cross", {
    className : "entry-form__icon"
    // bubble    : 1
    // state     : 0
  }, pas_icon_options); 

  const a = Skeletons.Box.Y({
    className: "input-details",
    kidsOpt : {
      active : 0
    },
    kids:[cross]
  });
  return a;
};
module.exports = __login_help;
