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
const argparse = require("argparse");

const parser = new argparse.ArgumentParser({
  description: "Drumee UI seeds parser ",
  add_help: true,
});

parser.add_argument("--app-base", {
  type: String,
  default: 'src/drumee',
  help: "App source base",
});

parser.add_argument("--from", {
  type: String,
  default: process.env.UI_SRC_PATH,
  help: "Source base",
});

parser.add_argument("--src-dir", {
  type: String,
  default: process.env.UI_SRC_PATH,
  help: "Source directory",
});

parser.add_argument("--verbose", {
  type: String,
  default: '',
  help: "Debuug",
});

parser.add_argument("--libs", {
  type: String,
  default: '',
  help: "Libs to walk through",
});



const args = parser.parse_args();
module.exports = args;
