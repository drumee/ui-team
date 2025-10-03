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
const { isString, isArray, isNaN } = require("lodash");
const { resolve, dirname, basename } = require("path");
const {
  createReadStream, mkdirSync, existsSync, createWriteStream, statSync, rmSync
} = require("fs");
const { permission } = require("../../lex/constants");
const { net, dialog } = require("electron");
let ACTIVITY = 0;
let LAST_SENT = 0;
let PENDING_DELETION = [];
let DELETION_OPTION = null;
const { setPending, unsetPending } = require("./locker");
const { utf8ify } = require("../../utils/misc");
const { createHash } = require('crypto');


/**
 * 
 * @param {*} evt 
 * @returns 
 */
async function requestRename(evt) {
  let { src, dest } = this.event.parseArgs(evt);
  //this.removePendingEntity('local_renamed', evt);
  if (!src || !dest) {
    this.debug("AAA:42 - invalid data.", evt, src, dest);
    return Attr.failed;
  }

  src = this.remote.row(src, Attr.filepath);
  if (!src) {
    this.debug("AAA:48 - Source. Wrong state was called.", evt, src);
    return Attr.failed;
  }

  let s = this.canModify(src);
  if (s != Attr.ok) return s;

  if (!this.isBranch(src)) {
    let lock = await this.requestLock(src, dest);
    if (
      !lock ||
      !lock.writable ||
      (lock.locked && lock.locked.uid != Account.user.get(Attr.id))
    ) {
      this.debug("Failed to get remote lock", lock);
      return Attr.terminated;
    }
  }

  let service = SERVICES.media.rename;
  let { filename } = this.mfsFilename(dest);

  let opt = {
    filename: encodeURI(filename),
    nid: src.nid,
    hub_id: src.hub_id,
    eventId: evt.id,
  };

  setPending(Attr.media, "media.rename", src.nid);
  return new Promise(async (resolve, reject) => {
    this.postService(service, opt, { async: 1 })
      .then((data) => {
        //this.local.rename(data);
        this.remote.rename(data);
        this.fsnode.rename(src, dest);
        resolve(Attr.terminated);
      })
      .catch((e) => {
        this.debug("RENAME_ERROR", e, { src, dest });
        resolve(Attr.failed);
      });
  });
}

/**
 * 
 */
function setChoiceTime() {
  choiceTimer = setTimeout(() => {
    DELETION_OPTION = null;
    choiceTimer = 0;
  }, 60000);
}


/**
 * 
 */
async function removeMultiple() {
  // for (let i of PENDING_DELETION) {
  //   this.debug("AAA:265 ", i.filepath);
  // }

  let item = PENDING_DELETION.shift();
  let deduplicate = {};
  while (item && item.nid) {
    if (deduplicate[item.nid]) {
      item = PENDING_DELETION.shift();
      continue;
    }
    await this._sendTrashRequest(item);
    deduplicate[item.nid] = 1;
    item = PENDING_DELETION.shift();
  }
}

/**
 * 
 */
async function ignoreMultiple(resolve, reject) {
  let item = PENDING_DELETION.shift();
  while (item && item.nid) {
    await this._ignoreItem(item, resolve);
    item = PENDING_DELETION.shift();
  }
}

/**
 *
 */
async function _confirmDelete(evt) {
  if (!evt || !evt.filepath) return;
  //setChoiceTime();
  switch (DELETION_OPTION) {
    case "ignore-multiple":
      while (PENDING_DELETION.length) {
        let item = PENDING_DELETION.shift();
        if (!item || !item.nid) {
          break;
        }
        this._ignoreItem(item, resolve);
      }
      return
    case "remove-multiple":
      await this.removeMultiple();
      return
  }
  return new Promise((resolve, reject) => {
    const options = {
      buttons: [LOCALE.NO, LOCALE.YES],
      detail: evt.filepath,
      title: LOCALE.WARNING,
      defaultId: 0,
      checkboxLabel: LOCALE.APPLY_ON_NEXT_DELETION,
      message: LOCALE.DELETION_OPTION,
      type: "question",
    };
    dialog
      .showMessageBox(null, options)
      .then(async (r) => {
        switch (r.response) {
          case 0:
            if (r.checkboxChecked) {
              DELETION_OPTION = "ignore-multiple";
              this.ignoreMultiple(resolve, reject);
            } else {
              if (DELETION_OPTION == "ignore-single") {
                let item = PENDING_DELETION.shift();
                if (!item || !item.nid) {
                  break;
                }
                this._ignoreItem(item, resolve);
                await this._confirmDelete();
                DELETION_OPTION = "ignore-single";
              }
            }
            break;
          case 1:
            if (r.checkboxChecked) {
              DELETION_OPTION = "remove-multiple";
              this.removeMultiple();
            } else {
              if (!DELETION_OPTION || DELETION_OPTION == "remove-single") {
                let item = PENDING_DELETION.shift();
                if (!item || !item.nid) {
                  return resolve();
                }
                await this._sendTrashRequest(item);
                await this._confirmDelete();
              } else {
                this.removeMultiple();
              }
              DELETION_OPTION = "remove-single";
            }
            break;
        }
        resolve(DELETION_OPTION);
      })
      .catch(reject);
  });
}

/**
 * 
 */
function _onTrashCompleted(data) {
  if (!isArray(data)) {
    data = [data];
  }
  for (let node of data) {
    this.remote.removeNode(node);
    this.fsnode.removeNode(node);
    //this.local.removeNode(node);
  }

}
/**
 *
 * @param {*} evt
 */
async function _sendTrashRequest(args) {
  let list = [];
  let hub_id = null;
  if (isArray(args)) {
    hub_id = args[0].hub_id;
    for (let item of args) {
      list.push({ hub_id: item.hub_id, nid: item.nid });
    }
  } else {
    hub_id = args.hub_id;
    list = [{ hub_id, nid: args.nid }];
  }
  let opt = {
    service: SERVICES.media.trash,
    hub_id,
    nid: list,
  };
  for (let node of list) {
    setPending(Attr.trashed, node, node.nid);
  }
  try {
    let data = await this.postService(SERVICES.media.trash, opt);
    this._onTrashCompleted(data);
  } catch (e) {
    this.debug("[254] TRASH FAILED", e);
  }
  return Attr.terminated;
}

/**
 *
 * @param {*} item
 * @param {*} resolve
 */
function _ignoreItem(item, resolve) {
  this.syncOpt.changeNodeSettings(item, 0);
  this.sendMediaActivity({
    ...item,
    state: 0,
    phase: "sync-state",
  });
  resolve(Attr.terminated);
}

/**
 *
 * @param {*} evt
 * @returns
 */
function requestTrash(evt) {
  const remote = this.remote.row(evt, Attr.filepath);
  if (!remote || !remote.hub_id) {
    //this.debug("Remote not found", evt);
    return Attr.terminated;
  }
  let s = this.canDelete(remote);
  if (s != Attr.ok) {
    if (s == Attr.hub) {
      this.showErrorBox({
        title: LOCALE.CANNOT_DELETE,
        message: LOCALE.USE_MANAGER_TO_DELETE,
        detail: evt.filepath,
      });
      s = Attr.permission_denied;
    }
    return s;
  }
  const { id, args, inode } = evt;
  let rem = { ...remote, id, args, inode };
  PENDING_DELETION.push(rem);
  if (PENDING_DELETION.length > 1) {
    return;
  }
  return new Promise(async (resolve, reject) => {
    if (this.event.parseArgs(evt).force) {
      this._sendTrashRequest(rem, resolve);
      return;
    }
    PENDING_DELETION.push(rem);

    let response = await this._confirmDelete(rem);
    this.debug("AAA:255 -- TRASH CHOICE ", response);
    if (!response) return;
    switch (response) {
      case "remove-pending":
        this._sendTrashRequest(rem, resolve);
        break;
      case "remove-single":
        this._sendTrashRequest(rem, resolve);
        break;
      case "ignore-pending":
        this._ignoreItem(rem, resolve);
        break;
      case "ignore-single":
        this._ignoreItem(rem, resolve);
        break;
    }
    await this._confirmDelete(rem);
    return resolve();
  })
}

/**
 *
 * @param {*} evt
 * @returns
 */
async function requestMove(evt) {
  let service, action;
  let { src, dest } = this.event.parseArgs(evt);

  //this.removePendingEntity('local_moved', evt);
  let target = this.remote.row({ filepath: dirname(dest.filepath) }, Attr.filepath);
  let s = this.canMove(src, target);
  if (s != Attr.ok) return s;
  let { nid, hub_id } = this.remote.row(src, Attr.filepath);
  let pid = target.nid;
  if (target.ownpath == '/' || target.hub_id == target.nid) {
    pid = target.home_id;
  }
  let recipient_id = target.hub_id;
  if (hub_id == recipient_id) {
    service = SERVICES.media.move;
    action = Attr.move;
    setPending(Attr.media, "media.move", src.nid);
  } else {
    service = SERVICES.media.copy;
    action = Attr.copy;
    setPending(Attr.media, "media.copy", src.nid);
  }
  let socket_id = await Account.ensureSocketUp()
  let opt = {
    nid,
    pid,
    hub_id,
    action,
    recipient_id,
    notify: 1,
    socket_id,
  };

  return new Promise(async (resolve, reject) => {
    try {
      let data = await this.postService(service, opt);
      if (isArray(data)) data = data[0];
      this._sendEvent({ ...data, name: evt.name });
      let src = { ...data.__oldItem };
      let dest = { ...data.__newItem };
      delete dest.__newItem;
      delete dest.__oldItem;
      data.args = { src, dest };
      if (action == Attr.move) {
        this.remote.move(src, dest);
        //this.local.move(src, dest);
        this.fsnode.move(src, dest);
      } else {
        await this.onMediaCopy(data);
      }
      resolve(Attr.terminated);
    } catch (e) {
      this.debug("requestMove failed", e);
      reject(Attr.failed);
    }
  });
}

/**
 *
 * @param {*} evt
 * @returns
 */
async function requestLock(evt, dest) {
  let remote = this.remote.row(evt, Attr.nid, Attr.filepath);
  if (this.isBranch(evt) || !remote) return remote;
  let file = this.localFile(evt, Attr.absolute);
  if (!file && dest) {
    file = this.localFile(dest.filepath, Attr.absolute);
    if (!file) return { writable: 1 };
  }

  let args = {
    nid: evt.nid || remote.nid,
    hub_id: evt.hub_id || remote.hub_id,
  };

  let service = SERVICES.media.get_lock;
  let r = null;
  try {
    r = await this.postService(service, args);
  } catch (e) {
    this.warn("requestLock failed", e);
    r = e;
  }
  try {
    let md = JSON.parse(r.metadata);
    let lock = JSON.parse(md.lock);
    r.locked.changed = remote.mtime != lock.mtime;
  } catch (e) { }
  return r;
}

/**
 * 
 * @param {*} src_path 
 * @param {*} dest 
 */
async function checkTree(evt, dest) {
  let base = this.localFile(evt, Attr.absolute);
  let list = await this.walkDir(base);
  delete evt.id;
  for (var node of list) {
    let filepath = this.localFile(node, Attr.relative);
    let parent = dirname(filepath);
    let remote = this.remote.row({ filepath }, Attr.filepath);
    if (remote) continue;
    let { ext, filename } = this.mfsFilename(node);
    evt.filepath = filepath;
    evt.ext = ext;
    evt.filename = filename;
    evt.args = { path: parent };
    if (this.isBranch(node)) {
      evt.name = 'folder.created';
    } else {
      evt.name = 'file.created';
    }
    mfsScheduler.log(evt);
  }
}


/**
 *
 * @param {*} evt
 * @returns
 */
async function requestMkdir(evt) {
  const socket_id = Account.get(Attr.socket_id);
  let stat = this.localFile(evt, Attr.stat);
  if (!stat.isDirectory()) {
    this.debug("[468] NOT A DIRECTORY", evt);
    return Attr.failed;
  }

  let dest = this.getParent(evt);
  if (!dest || !dest.hub_id || !dest.ownpath) {
    this.warn("[174] INVALID DESTINATION !!!", { dest, evt });
    return Attr.failed;
  }

  let s = this.canWrite(dest);
  if (s != Attr.ok) return s;

  if (dest.filetype == Attr.hub) dest.nid = dest.home_id;
  let { hub_id } = dest;
  if (!evt.ownpath) {
    this.warn("[484] INVALID OWNPATH", evt);
    return Attr.failed;
  }
  let args = {
    nid: dest.home_id,
    hub_id,
    ownpath: encodeURI(utf8ify(evt.ownpath)),
    notify: 1,
    socket_id
  };
  setPending(Attr.media, evt, evt.filepath);
  let data = await this.postService(SERVICES.media.make_dir, args);
  let fsnode = this.fsnode.row(evt, Attr.inode, Attr.filepath);
  if (fsnode && fsnode.filepath) {
    data.filepath = fsnode.filepath;
  }
  data.effective = this.syncOpt.getNodeState(data);
  //this.local.upsert({ ...fsnode, ...data });
  this.remote.upsert(data);
  //this.syncOpt.getNodeSettings(data);
  this._sendEvent({ ...data, name: evt.name });
  setTimeout(() => {
    unsetPending(Attr.media, evt.filepath);
  }, 3000);
  let filepath = dirname(data.filepath);
  let parent = this.remote.row({ filepath }, Attr.filepath);
  if (!parent) {
    let node = this.localFile(filepath, Attr.node);
    if (node && node.nodetype == Attr.folder) {
      mfsScheduler.log({ ...node, name: "folder.created" });
    }
  }

  return Attr.terminated;
}

/**
 *
 */
function onUploadSuccess(evt, attr, md5Hash) {
  let { ctime, mtime } = attr;
  let md = attr.metadata || {};
  if (isString(md)) {
    try {
      md = JSON.parse(attr.metadata);
      attr.md5Hash = md.md5Hash;
    } catch (e) { }
  }
  this.debug(`metadata=${md.md5Hash}, in=${md5Hash}`);
  attr.md5Hash = md.md5Hash || md5Hash;

  if (attr.filepath) attr.file_path = attr.filepath;
  if (!attr.inode || !attr.birthtimeMs) {
    let s = this.localFile(evt, Attr.stat);
    if (s.data) {
      attr = { ...attr, ...s.data, ctime, mtime };
    }
  }
  evt.inode = attr.inode;
  if (/^(hub|folder)$/.test(attr.filetype)) {
    attr.nodetype = Attr.folder;
  } else {
    attr.nodetype = Attr.file;
  }
  //this.local.upsert(attr);
  attr.effective = this.syncOpt.getNodeState(attr);
  attr.changed = 0;
  this.remote.upsert(attr);
  this.fsnode.upsert(attr);
  this._sendEvent(attr);
  const { filepath } = evt;
  unsetPending(Attr.uploaded, filepath);
  unsetPending(Attr.media, filepath);
  if (md5Hash) {
    let { miniData } = this.localFile(evt, Attr.stat);
    let locFile = {
      ...miniData,
      filepath,
      md5: md5Hash
    }
    if (locFile.inode) this.hash.upsert(locFile);
  }
  this.debug(`${filepath} sucessfuly uploaded`);
}

/**
 *
 */
function onDownloadSuccess(evt, md5Hash) {
  return new Promise(async (resolve, reject) => {
    let { nid, hub_id } = evt;
    this.postService(SERVICES.media.get_node_attr, { nid, hub_id })
      .then((attr) => {
        let md = attr.metadata;
        if (!attr.md5Hash && md) {
          if (md.md5Hash) {
            attr.md5Hash = md.md5Hash || md5Hash;
          } else {
            try {
              md = JSON.parse(attr.metadata);
              attr.md5Hash = md.md5Hash || md5Hash;
            } catch (e) { }
          }
        }
        if (attr.filepath) attr.file_path = attr.filepath;
        attr.effective = this.syncOpt.getNodeState(attr);
        attr.changed = 0;
        this.remote.upsert(attr);

        let { miniData } = this.localFile(evt, Attr.stat);
        if (miniData) {
          let { filepath } = attr;
          this.hash.upsert({
            ...miniData,
            filepath,
            md5: md5Hash
          });

          this.fsnode.upsert({
            ...attr,
            ...miniData,
          });
        }

        resolve(attr);
      })
      .catch((e) => {
        this.debug("ERRRO:266 -- ERROR", e);
        reject(null);
      });
  });
}

/**
 *
 * @param {*} evt
 * @param {*} opt
 * @returns
 */
function requestUpload(evt) {
  const socket_id = Account.get(Attr.socket_id);
  let stat = this.localFile(evt, Attr.node);
  return new Promise(async (resolve, reject) => {
    if (!stat.nodetype) {
      return reject({ fileNotFound: true });
    }
    if (stat.nodetype == Attr.folder) {
      return resolve({ isDirectory: true });
    }
    let error = this.checkSanity(evt);
    if (error) {
      console.error("Failed to checkSanity", filepath, error);
      return reject(error);
    }
    if (!socket_id) {
      return reject("No socket id");
    }
    let loaded = 0;

    let s = this.canWrite(evt);
    if (s != Attr.ok) return reject(s);

    let filename = basename(evt.filepath);
    let activity = {
      hub_id: evt.hub_id,
      filename,
      tartget: evt.filepath,
      filesize: stat.size,
      total: stat.size,
      notify: 1,
      single: 1,
      phase: evt.phase,
    };
    this._sendActivity(activity);
    const localStream = createReadStream(stat.realpath);
    let hash = createHash('md5');
    let url = `${Account.bootstrap().svc}media.upload`;
    const request = net.request({
      url,
      method: "POST",
      useSessionCookies: true,
    });

    let params = {
      filesize: stat.size,
      socket_id,
      upload: 1,
      notify: 1,
      filename: encodeURI(filename),
      createOrReplace: 1,
    };
    let remote = this.remote.row(evt, Attr.filepath);

    if (remote && remote.nid) {
      let { nid, hub_id, ownpath, home_id } = remote;
      params = {
        ...params,
        nid: home_id,
        hub_id,
        ownpath,
      };
    } else {
      let { nid, hub_id, ownpath } = evt;
      params = {
        ...params,
        nid,
        hub_id,
        ownpath: ownpath.unixPath(),
      };
    }
    params.ownpath = encodeURI(utf8ify(params.ownpath));
    let md5Hash = null;
    let buffer = "";
    let res = {};
    const data = JSON.stringify(params);
    this.debug(`Uploading ${evt.filepath} using ${url}`, params);
    request.setHeader("x-param-xia-data", data);
    request.setHeader("x-param-session-type", 'regular');
    setPending(Attr.uploaded, request, evt.filepath);
    setPending(Attr.media, evt, evt.filepath);
    request.on("response", (response) => {
      response.on("end", (e) => {
        try {
          let r = JSON.parse(buffer);
          res = r.data || r;
        } catch (e) {
          console.error(`Failed to parse response`, buffer);
          reject({ __statusCode: 0, error: buffer.toString() });
        }
        switch (response.statusCode) {
          case 200:
            delete evt.ctime;
            delete evt.mtime;
            let attr = {
              ...stat,
              ...evt,
              ...res,
              inode: stat.ino,
            }
            this.onUploadSuccess(evt, attr, md5Hash);
            resolve({
              ...res,
              __statusCode: response.statusCode,
              inode: stat.ino,
            });
            break;
          default:
            reject({ data, ...res, __statusCode: response.statusCode });
        }
      });
      response.on("data", (chunk) => {
        buffer = buffer + chunk;
      });
    });
    request.on("error", (e) => {
      this.debug(`CAUGHT ERROR: `, e);
    })
    localStream.on("data", (chunk) => {
      loaded = loaded + chunk.length;
      this.task.keepalive(evt);
      this._sendActivity({
        ...activity,
        phase: "progress",
        loaded,
        total: stat.size,
        progress: loaded / stat.size,
      });
      request.write(chunk);
      hash.update(chunk);
    });
    localStream.on("end", () => {
      this.task.keepalive(evt, "idle"); // Prevent task from bieng removed before termination
      this._sendActivity({
        ...activity,
        phase: "uploaded",
      });
      md5Hash = hash.digest('hex');
      request.end();
    });
  });
}

/**
 *
 * @param {*} evt
 * @param {*} dest
 */
function _updateLocalItem(evt, dest, resolve) {
  let stat = this.localFile(dest, Attr.stat);

  evt.effective = this.syncOpt.getNodeState(evt);
  this.remote.upsert({
    ...evt,
    filesize: stat.size,
  });
  resolve(Attr.terminated);
}

/**
 *
 */
function _sendActivity(opt) {
  let now = new Date().getTime();
  if (opt.progress < 99 && now - LAST_SENT < 1000) {
    return;
  }
  LAST_SENT = now;
  this.sendMediaActivity({ events: ACTIVITY++ % 2, ...opt });
}

/**
 *
 */
function _sendEvent(opt) {
  webContents.send("mfs-event", { ...opt, origin: "mfs" });
}

/**
 * 
 * @param {*} response 
 */
async function _handleDownloadResponse(response, dest, evt, activity, resolve, reject) {
  let localStream = null;
  let size = parseInt(response.headers["content-length"]);
  if (response.headers["content-range"]) {
    let [a, b] = response.headers["content-range"].split("/");
    size = parseInt(b) || 10000000000;
  }
  let loaded = 0;
  switch (response.statusCode) {
    case 200:
      let hash = createHash('md5');
      try {
        localStream = createWriteStream(dest);
        localStream.on("close", async (e) => {
          let md5Hash = hash.digest('hex');
          let remote = await this.onDownloadSuccess(evt, md5Hash);
          await fsWatcher.onFileClose(evt, remote, md5Hash);
          this.task.keepalive(evt, "closed");
          resolve(Attr.terminated);
        });
      } catch (e) {
        this.warn("Failed to check file", e);
        return reject(e);
      }
      if (!localStream) {
        return reject({ error: "Cannot write into local file" });
      }
      response.on("data", (chunk) => {
        loaded = loaded + chunk.length;
        this.task.keepalive(evt);
        try {
          localStream.write(chunk);
          hash.update(chunk);
        } catch (e) {
          this.debug("EEE:595", e);
        }
        if (isNaN(size)) size = loaded;
        activity.activity = activity;
        this._sendActivity({
          ...activity,
          phase: "progress",
          progress: 100 * (loaded / size),
          loaded,
          total: size,
        });
      });
      response.on("end", () => {
        localStream.end();
        this.debug(`Writting into ${dest}`);
        this.task.keepalive(evt, "idle");
        this._sendActivity({
          ...activity,
          phase: Attr.downloaded,
        });
      });
      break;
    default:
      let error = `Failed to download (${response.statusCode}) ${dest}`
      console.error(`[ERR:506]  (${error})`);
      localStream.abort();
      return reject({ error });
  }
}

/**
 * 
 * @param {*} location 
 */
async function _checkFile(evt) {
  let location = this.localFile(evt, Attr.location);
  return new Promise(async (resolve, reject) => {
    //this.debug("AAA:530 -- checkFile", data);
    let diskFree = await this.diskFree();
    if (!diskFree) {
      this.scheduler.pause();
      return reject(message)
    }
    if (!this.diskSpace) {
      return reject(`
        Target *${location}* is outside of safe location ${USER_HOME_DIR}!`
      );
    }
    if (this.isSafeLocation(location)) {
      let parent = dirname(location);
      if (!existsSync(parent)) {
        this.debug("Creating parent dir", parent)
        try {
          mkdirSync(parent, { recursive: true });
        } catch (e) {
          this.debug("Failed to download", e);
        }
        await fsWatcher.waitUntil(evt, `created`, 0);
      } else {
        let { nodetype } = this.localFile(parent, Attr.node)
        if (nodetype != Attr.folder) {
          this.debug(`Removing parent path ${parent} because it is not a directory`)
          rmSync(parent)
          await fsWatcher.waitUntil(evt, Attr.removed, 0);
        }
      }
      if (existsSync(location)) {
        let stat = statSync(location);
        if (stat.isDirectory()) {
          this.debug(`Removing target ${location} because it is a directory`)
          rmSync(location, { recursive: true })
        }
      }
      resolve(location);
    } else {
      reject(`
        Target *${location}* is outside of safe location ${USER_HOME_DIR}!`
      );
    }
  })
}

/**
 *
 * @param {*} url
 * @param {*} target
 * @returns
 */
function requestDownload(evt) {
  return new Promise((resolve, reject) => {
    let error = this.checkPermission(evt, permission.download);
    if (error) {
      return reject(error);
    }

    let loaded = 0;
    let total = evt.filesize || 0;
    let activity = {
      ...evt,
      phase: "downloading",
      target: evt.filepath,
      loaded,
      total,
    };
    this._checkFile(evt)
      .then(async (dest) => {
        setPending(Attr.downloaded, evt.nid, evt.filepath);
        // let dir = dirname(dest);
        // if (!existsSync(dir)) {
        //   this.debug("Creating parent dir", dest)
        //   try {
        //     mkdir(dir, { recursive: true });
        //   } catch (e) {
        //     this.debug("Failed to download", e);
        //   }
        //   await fsWatcher.waitUntil(evt, `created`, 0);
        // } else {
        //   let { nodetype } = this.localFile(dir, Attr.node)
        //   if (nodetype != Attr.folder) {
        //     this.debug(`Removing ${dir} because it is not a directory`)
        //     rmSync(parent)
        //     await fsWatcher.waitUntil(evt, Attr.removed, 0);
        //   }
        // }
        let url = this.getNodeUrl(evt);
        const request = net.request({ url, useSessionCookies: true });
        request.setHeader("x-param-session-type", 'regular');
        setPending(Attr.downloaded, request, evt.filepath);
        this._sendActivity(activity);
        this.debug(`Downloading ${url}`, evt.filepath);
        request.on("response", async (response) => {
          if (response.statusCode == 200) {
            await this._handleDownloadResponse(response, dest, evt, activity, resolve, reject)
          }
        });
        request.on("error", (response) => {
          console.error("[ERR:701]", response);
          reject(response);
        });
        request.on("abort", (response) => {
          this.debug("[ABORTED:705]", response);
          reject(response);
        });
        request.end();
      })
      .catch((e) => {
        this.debug("[911] Download failed", e);
        switch (e.code) {
          case "EBUSY":
            this.webAlert(LOCALE.FILE_X_IS_BUSY.format(evt.filepath));
            break;
          case "EACCESS":
            break;
        }
        return reject(e);
      });
  });
}

/**
 *
 * @param {*} filepath
 * @param {*} opt
 * @returns
 */

module.exports = {
  _confirmDelete,
  _ignoreItem,
  _onTrashCompleted,
  _sendActivity,
  _sendEvent,
  _sendTrashRequest,
  _handleDownloadResponse,
  _updateLocalItem,
  _checkFile,
  checkTree,
  ignoreMultiple,
  onDownloadSuccess,
  onUploadSuccess,
  removeMultiple,
  requestDownload,
  requestLock,
  requestMkdir,
  requestMove,
  requestRename,
  requestTrash,
  requestUpload,
  // requestHome
};
