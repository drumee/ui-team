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
const event = {
  name: "event",
  columns :['name', 'filepath']
}
const remote = {
  name: "nid",
  columns :['nid']
}

const local = {
  name: "inode",
  columns :['inode', 'nid']
}

const fslog = {
  name: "inode",
  unique :['inode', 'eventtype', 'mtimeMs']
}

const fschangelog = {
  name: "inode",
  unique :['inode', 'event']
}


// const account = {
//   name: "domain",
//   columns :['url', 'uid']
// }

module.exports = { remote, local, event, fslog, fschangelog};
