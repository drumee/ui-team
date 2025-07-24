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

const Attr = require("../../lex/attribute");
const { copyFileSync, existsSync } = require('fs');
const { shell } = require("electron");
const { dialog } = require("electron");
const { isAbsolute, join, dirname } = require("path");
const { showPending, isPending, setPending, unsetPending } = require("../core/locker");

/**
 *
 * @param {*} evt
 * @returns
 */
function _skipMediaSync(evt) {
  if (evt.filepath == "/") return Attr.ignored;
  const { direction, effective } = this.syncOpt.getNodeSettings(evt);
  if (!effective) {
    if (evt.name == "media.open") {
      return null;
    }
    return Attr.terminated;
  }
  if (direction == Attr.upstream) return Attr.terminated;
  if ([0, -1].includes(effective)) {
    let { syncEnabled, force } = this.event.parseArgs(evt);
    if (syncEnabled || force) return null;
    return Attr.ignored;
  }
  return null;
}

/**
 *
 */
async function onMediaInit(evt) {
  let skip = this._skipMediaSync(evt);
  let stat = this.localFile(evt, Attr.stat);
  if (skip) return skip;

  if (this.isBranch(evt)) {
    return await this.onFsMkDir(evt);
  }

  if (isPending(Attr.uploaded, stat.inode)) {
    return Attr.skip;
  }

  if (isPending(Attr.downloaded, evt.filepath)) {
    return Attr.skip;
  }

  let remote = this.remote.row(evt, Attr.filepath, Attr.nid);
  if (!remote) {
    return Attr.skip;
  }

  if (!stat.ino) {
    let res = await this.onMediaNew(evt);
    return res;
  }

  let md5Hash = await this.hash.getMd5(stat);
  let { filename, ext, filepath } = stat;
  if (md5Hash && md5Hash == remote.md5Hash) {
    if (!this.event.parseArgs(evt).force) {
      this.fsnode.update(Attr.inode, "changed", 0);
      return Attr.synced;
    }
  }
  return "conflict-local";

  // let local = this.local.row(evt, Attr.filepath, Attr.nid);
  let hash = await this.hash.getMd5(evt);
  this.debug(`70: Remote md5=${remote.md5Hash}`, hash)
  if (!local) {
    if (!stat.ino) {
      res = await this.onMediaNew(evt);
      return res;
    } else {
      let md5Hash = await this.hash.getMd5(stat);
      let { filename, ext, filepath } = stat;
      if (md5Hash && md5Hash == remote.md5Hash) {
        if (!this.event.parseArgs(evt).force) {
          this.local.upsert({
            ...remote,
            ...stat.miniData,
            filename,
            ext,
            filepath,
          });
          return Attr.synced;
        }
      }
      return "conflict-local";
    }
  }
  let unchanged = remote.md5Hash && remote.md5Hash == local.md5Hash;
  let sameTime = remote.mtime == local.mtime;
  if (unchanged && sameTime) {
    this.debug(`Remote md5=${remote.md5Hash}`, this.hash.getMd5(evt))
    if (!this.event.parseArgs(evt).force) return Attr.synced;
  }
  res = await this.onMediaNew(evt);
  return res;
}

/**
 *
 * @param {*} evt
 * @returns
 */
async function onMediaChange(evt) {
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
async function onMediaCopy(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  let { src, dest } = this.event.parseArgs(evt);
  let srcBase = dirname(src.filepath);
  let destBase = dirname(dest.filepath);
  let re = new RegExp('^' + destBase);

  if (this.isBranch(dest)) {
    let manifest = await this.postService(SERVICES.media.manifest, {
      nid: dest.nid,
      hub_id: dest.hub_id,
    })
    if (!manifest[0]) return Attr.terminated;
    for (let node of manifest[0]) {
      this.remote.upsert(node);
      let destNode = this.localFile(node, Attr.node);
      if (this.isBranch(node)) {
        this.localFile(destNode, Attr.mkdir);
      } else {
        let filepath = node.filepath.replace(re, "");
        filepath = join(srcBase, filepath);
        let srcNode = this.localFile({ filepath }, Attr.node);
        if (existsSync(srcNode.realpath)) {
          setPending(Attr.created, destNode, filepath);
          copyFileSync(srcNode.realpath, destNode.realpath);
        } else {
          await this._fetchFile(node);
          continue;
        }
      }
      let { miniData } = this.localFile(destNode, Attr.stat);
      this.local.upsert({ ...node, ...miniData });
      this.fsnode.upsert({ ...destNode, ...miniData });
    }
  } else {
    let srcNode = this.localFile(src, Attr.node);
    let destNode = this.localFile(dest, Attr.node);
    const { filepath, inode } = destNode;
    setPending(Attr.created, destNode, filepath, inode);
    copyFileSync(srcNode.realpath, destNode.realpath);
    this.remote.upsert({ ...dest });
    let { miniData } = this.localFile(dest, Attr.stat);
    this.local.upsert({ ...dest, ...miniData, nodetype: Attr.file });
    this.fsnode.upsert({ ...destNode, ...miniData, nodetype: Attr.file });
  }
  return Attr.terminated;
}

/**
 * Current source and destination shall be deeted by current task
 * Recreate new ones for next task
 *
 * @param {*} evt
 * @param {*} src
 * @param {*} dest
 */
function _relogEvent(evt, src, dest) {
  let eventId = mfsScheduler.log(evt);
  src.eventId = eventId;
  this.source.upsert(src);

  dest.eventId = eventId;
  if (!dest.hub_id) dest.hub_id = src.hub_id;
  if (!dest.home_id) dest.hub_id = src.home_id;
  this.destination.upsert(dest);
  src = this.source.row(evt, Attr.eventId);
}

/**
 *
 * @param {*} evt
 */
async function onMediaMove(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  let { src, dest } = this.event.parseArgs(evt);
  if (!src || !dest) {
    this.debug("AAAA:127 -- FAILED onMediaMove", { evt, src, dest });
    return Attr.failed;
  }
  let stat = this.localFile(src, Attr.stat);
  if (!stat.inode) {
    mfsScheduler.log({ ...dest, name: "media.init" });
    return Attr.terminated;
  }
  showPending(Attr.moved);
  if (isPending(Attr.moved, src.filepath)) {
    this.debug(`${evt.filepath} is being moved by local`);
    setTimeout(() => {
      unsetPending(Attr.moved, src.filepath);
    }, 2000);
    return
  }

  mfsScheduler.log({ ...evt, name: "fs.move" });
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
function onMediaRename(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  if (isPending(Attr.media, evt.nid)) {
    this.debug(`${evt.filepath} is being renamed by local`);
    setTimeout(() => {
      unsetPending(Attr.media, evt.nid);
    }, 2000);
    return
  }
  let args = this.event.parseArgs(evt);
  let { src, dest } = args;
  if (!src || !dest) return;

  mfsScheduler.log({ ...evt, name: "fs.rename" });
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
function onMediaRemove(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  showPending(Attr.trashed);
  showPending(Attr.removed);

  if (isPending(Attr.trashed, evt.nid)) {
    //this.debug({ LOCKED: evt.nid }, evt);
    unsetPending(Attr.trashed, evt.nid);
    this.remote.removeNode(evt);
    return Attr.terminated;
  }

  if (!this.syncOpt.getNodeState(evt)) {
    this.syncOpt.remove(evt);
  } else {
    mfsScheduler.log({ ...evt, name: "fs.remove" });
  }
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
async function _fetchFile(evt) {
  if (evt.isalink && evt.filetype != Attr.hub) {
    return Attr.skip;
  }
  if (this.isNodeUpToDate(evt)) {
    this.debug(`[skipped] ${evt.filepath} is already up to date`);
    return Attr.skip;
  }
  try {
    await this.requestDownload(evt);
  } catch (e) {
    console.trace();
    console.log(e, evt)
    if (e.error == "EACCES") {
      const options = {
        type: "info",
        buttons: [LOCALE.CLOSE],
        defaultId: 0,
        detail: evt.filepath,
        title: LOCALE.PERMISSION_DENIED,
        message: LOCALE.FILE_NOT_SAVED,
      };
      dialog.showMessageBox(null, options);
    }
  }
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
async function onMediaNew(evt) {
  if (!evt.filetype) {
    let remote = this.remote.row(evt, Attr.filepath);
    evt.filetype = remote.filetype;
    if (!evt.filetype) {
      this.debug("Could not get filetype. Skipped", remote, evt)
      return Attr.skip;
    }
  }
  if (this.isBranch(evt)) {
    let { hubEvent } = this.event.parseArgs(evt);
    if (evt.filetype == Attr.hub && hubEvent == "media.new") {
      let data = await this.postService(SERVICES.media.manifest, {
        nid: evt.home_id,
        hub_id: evt.hub_id,
      });
      if (!data || !data[0]) return Attr.terminated;
      const root = { ...evt, filesize: 0 };
      this._updateRemote(data, { ...root, basedir: evt.filepath });
      return Attr.terminated;
    }

    let res = await this.onFsMkDir(evt);
    return res;
  }
  let res = await this._fetchFile(evt);
  return res;
}

/**
 *
 * @param {*} evt
 */
async function onMediaWrite(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  if (this.isBranch(evt)) {
    this.debug("AAA:301 onMediaWrite not applicable on folder", evt);
    return;
  }
  res = await this.requestDownload(evt);
  return res;
}

/**
 *
 * @param {*} evt
 */
async function onMediaUpdate(evt) {
  let skip = this._skipMediaSync(evt);
  if (skip) return skip;
  let res = await this._fetchFile(evt);
  return res;
}

/**
 *
 */
async function onMediaAttributes(evt) {
  let data = await this.fetchService(SERVICES.media.get_node_attr, evt);
  let local = this.local.row(data, Attr.nid);
  return Attr.terminated;
}

/**
 * 
 * @param {*} data 
 * @param {*} opt 
 * @returns 
 */
function _updateRemote(data, opt = {}) {
  if (!data || !data[0]) return;
  const { basedir, root } = opt;
  let populate = this.db.populate("remote");
  const transaction = this.db.transaction((rows) => {
    populate.run(root);
    for (const rem of rows) {
      if (!rem.filepath) continue;
      if (rem.ext == null) continue;
      if (IGNORED.test(rem.filename)) continue;
      if (basedir) rem.filepath = join(basedir, rem.filepath);
      if (!isAbsolute(rem.filepath)) rem.filepath = `/${rem.filepath}`;
      if (/hub|folder/.test(rem.filetype)) rem.filesize = 0;
      populate.run(rem);
    }
  });
  transaction(data[0]);
}

/**
 *
 */
async function showNode(args) {
  let skip = this._skipMediaSync(args);
  if (skip) return skip;
  if (!this.isBranch(args)) return Attr.skip;

  let { hub_id, nid } = args;
  if (args.filetype == Attr.hub) {
    let r = this.remote.row(args, Attr.filepath);
    if (!r || !r.home_id) return Attr.skip;
    nid = r.home_id;
    hub_id = args.hub_id;
  }
  let stat = this.localFile(args, Attr.stat);
  if (!stat || !stat.inode) {
    await this.onFsMkDir({ ...args });
    this.syncOpt.changeNodeSettings(args, 1);
  }
  let items = [];
  try {
    items = await this.fetchService(SERVICES.media.show_node_by, {
      hub_id,
      nid,
    });
  } catch (e) {
    this.debug("EEE:364 caught error", e);
    items = this.remote.show_node(args);
  }

  /**
   * 
   * @param {*} item 
   * @param {*} index 
   * @param {*} name 
   */
  function pushLog(item, index, name) {
    setTimeout(() => {
      mfsScheduler.log({ ...item, name });
    }, index * 300);
  }

  let i = 0;
  for (var item of items) {
    let node = this.fsnode.row(item, Attr.filepath, Attr.inode);
    i++;
    if (!node) {
      pushLog(item, i, "media.init");
    } else {
      let rem = this.remote.row(item, Attr.nid);
      if (rem && !this.isBranch(rem)) {
        let md5Hash = await this.hash.getMd5(this.localFile(rem, Attr.node));
        if (rem.md5Hash && rem.md5Hash == md5Hash) continue;
      }
      pushLog(item, i, "media.init");
    }
  }

  let nodes = this.fsnode.unsyncedChildren(args);
  for (var item of nodes) {
    i++;
    if (item.nodetype == Attr.folder) {
      pushLog(item, i, "folder.created");
    } else if (item.nodetype == Attr.file) {
      pushLog(item, i, "file.created");
    }
  }
  return Attr.terminated;
}

/**
 *
 * @param {*} item
 * @returns
 */
async function onMediaOpen(args) {
  let filepath = this.normalizePathFromArgs(args);
  let location = this.localFile(filepath, Attr.absolute);
  let res = "";
  if (!this.isBranch(args)) {
    if (!location) {
      await this.requestDownload(args);
    }
    location = this.localFile(filepath, Attr.absolute);
    res = await shell.openPath(location);
  } else {
    if (!location) {
      let event_id = mfsScheduler.log({ ...args, name: "media.init" });
      this.callback.insert({
        event_id,
        func: "openFile",
        args: JSON.stringify(args),
      });
    } else {
      res = shell.openPath(location);
    }
    this.showNode(args);
  }
  if (res != "") {
    this.debug("TODO send message to render to fallback into builtins/viewer");
  }
  return Attr.terminated;
}

module.exports = {
  onMediaAttributes,
  onMediaChange,
  onMediaCopy,
  onMediaInit,
  onMediaMove,
  onMediaRemove,
  onMediaRename,
  onMediaOpen,
  onMediaNew,
  onMediaWrite,
  onMediaUpdate,
  showNode,
  _fetchFile,
  _relogEvent,
  _skipMediaSync,
  _updateRemote,
};
