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
const _a = require('../../lex/attribute');

/**
 * 
 */
const onFolderCreated = async function (evt) {
  let skip = this.shouldSkipSync(evt);
  this.debug('AAA:17 [onFolderCreated]', evt.filepath);
  if(skip) return skip;
  await this.requestMkdir(evt);
  return _a.terminated;
}


/**
 * 
 * @param {*} evt 
 */
const onFolderMoved = async function (evt) {
  let skip = this.shouldSkipSync(evt);
  if(skip) return skip;
  this.debug("AAAA:77 -- onFolderMoved", evt);
  let r = await this.requestMove(evt);
  return r;
}

/**
 * 
 * @param {*} evt 
 */
const onFolderDeleted = async function (evt) {
  let skip = this.shouldSkipSync(evt);
  if(skip) return skip;
  await this.requestTrash(evt);
  //this.removePendingEntity('local_deleted', evt);
  return _a.terminated;
}

/**
 * 
 * @param {*} evt 
 */
const onFolderRenamed = async function (evt) {
  //this.debug("AAAA:93 -- onFolderRenamed", evt);
  let skip = this.shouldSkipSync(evt);
  if(skip) return skip;
  await this.requestRename(evt);
  return _a.terminated;
}

/**
 * 
 * @param {*} evt 
 */
 const onFolderCloned = async function (evt) {
  let skip = this.shouldSkipSync(evt);
  if(skip) return skip;
  let res = await this.onFsCopy(evt, true);
  return res;
}


module.exports = {
  onFolderCreated,
  onFolderMoved,
  onFolderDeleted,
  onFolderRenamed,
  onFolderCloned
};
