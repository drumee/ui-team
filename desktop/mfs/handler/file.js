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
const { dialog } = require("electron");
const { join, basename } = require("path");
const { unsetPending, setPending, showPending } = require("../core/locker");

/**
 *
 */
function getDestination(evt) {
  let parent = this.getParent(evt);
  let pid = parent.nid;
  if (parent.filetype == Attr.hub) {
    pid = parent.home_id;
  }
  let filename = evt.filename;
  if (evt.ext) {
    filename = `${evt.filename}.${evt.ext}`;
  }
  let dest = {
    hub_id: parent.hub_id || Account.user.get(Attr.id),
    nid: evt.nid || pid,
    pid,
    filename: evt.filename,
    ownpath: join(parent.ownpath, filename),
    filepath: evt.filepath,
    filetype: evt.filetype,
    ext: evt.ext,
    privilege: evt.privilege || parent.privilege,
  };
  if (dest.ext == null && !this.isBranch(evt)) {
    dest.ext = filepath.filename().ext;
  }

  return dest;
}

/**
 *
 */
async function onFileCreated(evt) {
  let skip = this.shouldSkipSync(evt);
  if (skip) return skip;
  let stat = this.localFile(evt, Attr.stat);
  if (!stat.inode) {
    this.debug("[onFileCreated] Adding empty file. Ignored", evt);
    return Attr.ignored;
  }
  if (evt.eventtype == Attr.created) {
    evt.replace = 0;
    evt.phase = "uploading";
  } else {
    evt.phase = "replacing";
    evt.replace = 1;
  }
  this.remote.ensureOwnpath(evt);
  try {
    let { isDirectory } = await this.requestUpload(evt);
    if (isDirectory) {
      return Attr.isDirectory;
    }
    return Attr.terminated;
  } catch (e) {
    unsetPending(Attr.media, evt.filepath);
    // evt.dontRetry = 1;
    this.debug(`[onFileCreated] FAILED. retry=${evt.retry}`, e);
    return Attr.failed;
  }
}

/**
 *
 */
function showWarningMessage(evt, message) {
  this.showMessageBox({
    type: "error",
    buttons: [LOCALE.OK],
    detail: evt.filepath,
    message,
    title: LOCALE.UNABLE_TO_SYNC,
  });
}

/**
 *
 */
function handleChangeConflict(evt) {
  const options = {
    type: "question",
    buttons: [LOCALE.SYNC_FROM_CLOUD, LOCALE.SYNC_FROM_LOCAL],
    defaultId: 0,
    detail: USER_HOME_DIR,
    title: LOCALE.REMOTE_FILE_NEWER.format(evt.filepath),
    message: LOCALE.REMOTE_FILE_NEWER.format(evt.filepath),
  };
  return new Promise((resole, reject) => {
    dialog.showMessageBox(null, options).then((r) => {
      switch (r.response) {
        case 0:
          mfsScheduler.log({ ...evt, name: "media.change" });
          break;
        case 1:
          mfsScheduler.log({
            name: "file.modified",
            filepath: evt.filepath,
            filename: null,
          });
          break;
        default:
          resole(true);
      }
    });
  });
}

/**
 *
 * @param {*} evt
 * @returns
 */
async function onFileChanged(evt) {
  let skip = this.shouldSkipSync(evt);
  if (skip) return skip;
  let { hub_id, nid } = evt;
  let remote = this.remote.row(evt, Attr.filepath);
  if (!remote) {
    /** No need to check lock since remote doesn't exists */
    evt.eventtype = Attr.created;
    return this.onFileCreated(evt);
  }
  if (!hub_id) {
    ({ hub_id } = this.getParent(evt));
  }
  if (!hub_id) {
    this.debug("failed to find destination hub for", evt);
    return Attr.terminated;
  }
  let stat = this.localFile(evt, Attr.stat);
  let md5Hash = await this.hash.getMd5(stat);
  if (md5Hash && md5Hash == remote.md5Hash) {
    this.debug(`AAA:161 Skipped: ${evt.filepath} unchanged md5Sum ${md5Hash}`);
    return Attr.terminated;
  }

  let r = await this.requestLock(evt);
  if (!r || r.error) {
    let message = LOCALE.UNABLE_TO_SYNC;
    if (r && r.error) {
      let reason = LOCALE[r.reason] || LOCALE[r.error] || r.reason || r.error;
      message = `${message} + (${reason})`;
    }
    return Attr.failed;
  }
  if (!r.writable) {
    this.debug("NOT WRITABLE", r);
    let name = `${r.locked.firstname} ${r.locked.lastname}`;
    this.showWarningMessage(evt, name);
    return Attr.failed;
  }
  return this.onFileCreated(evt);
}

/**
 *
 * @param {*} evt
 */
async function onFileMoved(evt) {
  let skip = this.shouldSkipSync(evt);
  if (skip) return skip;
  let args = this.event.parseArgs(evt);
  let { src, dest } = args;
  if (!src || !dest) return Attr.failed;

  setPending(Attr.moved, evt, src.filepath);
  showPending(Attr.moved);

  await this.requestMove(evt);
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
async function onFileDeleted(evt) {
  let skip = this.shouldSkipSync(evt);
  if (skip) return skip;
  await this.requestTrash(evt);
  //this.removePendingEntity("local_deleted", evt);
  return Attr.terminated;
}

/**
 *
 * @param {*} evt
 */
async function onFileRenamed(evt) {
  let skip = this.shouldSkipSync(evt);
  if (skip) return skip;
  await this.requestRename(evt);
  return Attr.terminated;
}

module.exports = {
  onFileCreated,
  onFileChanged,
  onFileMoved,
  onFileDeleted,
  onFileRenamed,
  handleChangeConflict,
  showWarningMessage,
  getDestination,
};
