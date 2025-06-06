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
const { renameSync, copyFileSync, existsSync } = require('fs');
const { dirname, join } = require('path');
const { setPending, showPending } = require("./locker");

/**
 * 
 * @param {*} evt 
 */
const onFsAdd = function (evt) {
  let remote = this.remote.row(evt, _a.nid);
  // let local = this.local.row(evt, _a.nid);
}

/**
 * 
 * @param {*} evt 
 */
const onFsRemove = async function (evt) {
  let stat = this.localFile(evt, _a.stat);
  //this.debug("AAA:29 - onFsRemove", evt, stat);
  //this.removePendingEntity('local_created', evt);
  //this.local.removeNode(evt);
  this.remote.removeNode(evt);
  this.fsnode.removeNode(evt);
  this.syncOpt.removeNode(evt);
  if (!stat.inode) {
    //this.debug("AAA:33 -- NO FILE TO BE REMOVED", evt);
    return _a.terminated;
  }
  if (/^(.|.+\/.+| )$/.test(evt.filename)) {
    console.error("ERR:37 Invalid filename", evt);
    return _a.failed;
  }
  this.localFile(evt, _a.delete);
  return _a.terminated;
}


/**
 * 
 * @param {*} evt 
 */
const onFsRename = async function (evt) {
  let args = this.event.parseArgs(evt);
  let { src, dest } = args;
  if (!src || !dest) {
    this.debug("AAA:145 - Source/destination corrupted.", src, dest, evt);
    return _a.failed;
  }


  let src_node = this.localFile(src, _a.node);
  if (!src_node.inode) {
    this.fsnode.removeNode(src);
    return _a.terminated;
  }

  let dest_node = this.localFile(dest, _a.node);
  if (dest_node.inode) {
    // To do : if file -> error, if oflder move inside
  }

  setPending(_a.renamed, evt, dest.inode);

  try {
    renameSync(src_node.realpath, dest_node.realpath);
  } catch (e) {
    this.debug("ERROR -- AAAA:92", e);
    return _a.failed;
  }

  this.remote.rename(evt);
  this.fsnode.rename(src, dest);

  return _a.terminated;
}

/**
 * 
 * @param {*} evt 
 */
const onFsMove = async function (evt) {
  let { src, dest } = this.event.parseArgs(evt);
  if (!src || !dest) {
    this.debug("AAA:88 - Source/destination corrupted.", src, dest, evt);
    return _a.failed;
  }

  let src_node = this.localFile(src, _a.node);
  if (!src_node.inode) {
    this.fsnode.removeNode(src);
    return _a.terminated;
  }

  if (!dest.realpath) {
    dest.realpath = this.localFile(dest, _a.location);
  }
  let dest_dir = dirname(dest.filepath);
  let stat = this.localFile(dest_dir, _a.stat);
  setPending(_a.moved, evt, dest.filepath);
  showPending(_a.moved);
  if (!stat.inode || !stat.isDirectory()) {
    this.localFile(dest_dir, _a.mkdir);
    await fsWatcher.waitUntil({ filepath: dest_dir }, 'created', 0);
    stat = this.localFile(dest_dir, _a.stat);
    this.fsnode.upsert(stat);
  }

  //this.debug("AAA:128 - onFsMove", { src_node, src, dest });
  try {
    renameSync(src_node.realpath, dest.realpath);
  } catch (e) {
    this.debug("AAA:128 - onFsMove", { error: e });
    this.event.setError(evt, e);
    evt.error = e;
    return _a.failed;
  }
  // this.local.move(src, dest);
  this.remote.move(src, dest);
  this.fsnode.move(src_node, dest);

  return _a.terminated;
}

/**
 * When moving local files between two different hubs, we trigger 
 * a remote copy.
 * Locally, since files have already moved, we copy back destination to source and trigger media.copy
 * @param {*} evt 
 */
const onFsCopy = async function (evt) {
  let { src, dest } = this.event.parseArgs(evt);

  if (!src || !dest) {
    this.debug("AAA:134 -- source or destination empty", src, dest, evt);
    return _a.failed;
  }

  let target = this.localFile(src, _a.node);

  setPending(_a.moved, evt, target.filepath);
  //this.debug("AAA:151", src, this.fsnode.row(src, _a.filepath, _a.inode));
  renameSync(dest.realpath, target.realpath);


  await this.requestMove(evt);
  return _a.terminated;
}


/**
 * 
 * @param {*} evt 
 */
const onFsChange = function (evt) {
  this.debug("AAAA:144 -- onFsChange ???", levt);
}

/**
 * 
 * @param {*} evt 
 * @returns 
 */
const onFsMkDir = async function (evt) {
  if (!this.isBranch(evt)) {
    this.debug("AAA:281 -- File should not be called from here", evt);
    return "wrong_state";
  }

  if (this.isNodeUpToDate(evt)) {
    return _a.skip;
  }

  let remote = this.remote.row(evt, _a.nid, _a.filepath);
  if (!remote) {
    this.remote.upsert(evt);
  }
  let node = this.localFile(evt, _a.node);


  const fsnode = this.fsnode.row(evt, _a.filepath);
  if (!fsnode) {
    this.fsnode.upsert(node);
  }
  return _a.terminated
}

module.exports = {
  onFsAdd,
  onFsMkDir,
  onFsRemove,
  onFsRename,
  onFsChange,
  onFsMove,
  onFsCopy,
};
