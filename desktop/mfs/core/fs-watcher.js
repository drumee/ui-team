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

const { basename, dirname } = require("path");
const { existsSync, watch } = require("fs");
const Attr = require("../../lex/attribute");
const mfsUtils = require("../utils");
const { shortPath, utf8ify } = require("../../utils/misc");
const { isPending, unsetPending, clearPending, showPending } = require("./locker");
let START_TIMER = 0;
const { dev: dev_mode, trace_watcher } = require("../../args")

class Watcher extends mfsUtils {
  /**
   *
   */
  initialize(opt) {
    super.initialize(opt);

    this.source.clear();
    this.destination.clear();
    this.fsevent.clear();
    this.fslog.clear();

    this._done = true;
    this._moving = null;

    this.remote = {
      ...this.remote,
      ...require("../utils/remote")(this),
    };

    this.fsnode = {
      ...this.fsnode,
      ...require("../utils/fsnode")(this),
    };

    this.syncOpt = {
      ...this.syncOpt,
      ...require("../utils/sync-opt")(this),
    };

    this.fsevent = {
      ...this.fsevent,
      ...require("../utils/fsevent")(this),
    };

    this.fslog = {
      ...this.fslog,
      ...require("../utils/fslog")(this),
    };

    this.journal = {
      ...this.journal,
      ...require("../utils/journal")(this),
    };

    this.hash = {
      ...this.hash,
      ...require("../utils/hash")(this),
    };

    this.bindEvents();
    global.fsWatcher = this;
    this.timer = {};
    this.pending = {};
  }

  /**
   *
   */
  destroy() {
    super.destroy();
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * 
   * @param  {...any} args 
   * @returns 
   */
  trace(...args) {
    if (dev_mode && trace_watcher) {
      this.debug(...args);
    }
  }

  /**
   *
   */
  stop() {
    this.watcher.close();
  }

  /**
   *
   */
  getFiletype(filepath) {
    let rem = this.remote.row({ filepath }, Attr.filepath) || {};
    let filetype = null;
    if (rem) {
      if (/^(hub|folder|root)$/.test(rem.filetype)) {
        filetype = "folder";
      } else {
        filetype = "file";
      }
    }
    return filetype;
  }
  /**
   *
   */
  pause() {
    this._paused = 1;
  }

  /**
   *
   */
  resume() {
    this._paused = 0;
  }

  /**
   *
   */
  paused() {
    return this._paused;
  }

  /**
   * 
   */
  parentExists(evt) {
    let { inode, nodetype, filepath } = evt;
    filepath = dirname(filepath);
    let parent = this.remote.row({ filepath }, Attr.filepath);
    if (this.pending[inode]) clearInterval(this.pending[inode]);
    if (parent) return true;
    /** Wait for parent to exist */
    this.pending[inode] = setInterval(() => {
      parent = this.remote.row({ filepath }, Attr.filepath);
      if (parent) {
        clearInterval(this.pending[inode]);
        this.commit(evt);
      }
    }, 1000);
    return false;
  }

  /**
   *
   */
  nextState(nodes = [], state) {
    let next = nodes.shift();
    while (next) {
      if (next.eventtype != state) {
        return next.eventtype;
      }
      next = nodes.shift();
    }
    return state;
  }

  /**
   *
   */
  async commit(evt) {
    this.fslog.clearNode(evt);
    let { nodetype, eventtype, filepath } = evt;
    filepath = utf8ify(filepath);
    this.trace(`Committing ${evt.name} on ${filepath} ${evt.inode}`);
    if (/\.(created|changed)$/.test(evt.name)) {
      let stat = this.localFile(evt, Attr.stat);
      if (stat.nodetype == Attr.file) {
        let md5Hash = await this.hash.getMd5(stat);
        this.hash.upsert({
          ...stat.miniData,
          filepath,
          md5: md5Hash
        });
      }
    }
    mfsScheduler.log(evt);
    let trigger = `${nodetype}:${eventtype}`;
    this.trigger(trigger);
  }

  /**
   * 
   */
  addFsNode(stat) {
    let { filename } = stat.filepath.filename();
    let filepath = stat.filepath;
    let n = this.fsnode.row({ filepath }, Attr.filepath);
    if (n || !stat.ino) return;
    showPending(Attr.removed);
    this.fsnode.upsert({
      inode: stat.ino,
      filepath,
      filename,
      ext: "",
      nodetype: stat.nodetype,
      filesize: stat.size,
      birthtimeMs: stat.birthtimeMs,
      ctimeMs: stat.ctimeMs,
      mtimeMs: stat.mtimeMs,
    });
  }

  /**
   * 
   */
  dispatch(evt) {
    let { inode, nodetype, filepath } = evt;
    let events = this.fslog.getNodeEvents(evt, Attr.inode);
    let state;
    let next = events.shift();
    if (!next) return;
    let { eventtype } = next;
    while (next) {
      if (next.eventtype != eventtype) {
        state = next.eventtype;
        break;
      }
      next = events.shift();
    }

    if (state != eventtype) {
      state = eventtype;
    }
    evt.name = `${nodetype}.${state}`;
    switch (state) {
      case Attr.created:
      case Attr.changed:
        let filesize = this.fslog.getNodeMaxSize(evt);
        let stat = this.localFile(evt, Attr.node);
        if (nodetype == Attr.file) {
          if (stat.filesize > filesize && nodetype == Attr.file) {
            return;
          }
        } else {
          let remote = this.remote.row(evt, Attr.filepath);
          /* Fix me. When a directory is created, it looks like the watcher ignore it
           * We need to restart it
          */
          START_TIMER = setTimeout(() => {
            if (START_TIMER) {
              return
            }
            START_TIMER = 0;
            this.start();
          }, 5000)
          if (remote) {
            this.addFsNode(stat)
            return;
          }
          evt.name = `${nodetype}.created`;
        }
        let pending = isPending(Attr.created, filepath);
        if (pending && pending.filepath) evt = pending;
        this.updateNode(evt, stat);
        if (pending) {
          this.trace({ reason: `${filepath} is being created` });
          unsetPending(Attr.created, filepath)
          return;
        }
        break;

      case Attr.deleted:
      case Attr.removed:
        if (this.isPendingRemove(evt)) {
          this.trace("Locked", { filepath });
          return;
        }
        break;

      case Attr.renamed:
        if (isPending(Attr.renamed, inode, filepath)) {
          this.trace({ reason: `${filepath} is being renamed` });
          unsetPending(Attr.renamed, inode, filepath);
          return;
        }
        break;

      case Attr.moved:
        showPending(Attr.moved);
        if (isPending(Attr.moved, inode, filepath)) {
          this.trace({ reason: `${filepath} is being moved` });
          unsetPending(Attr.moved, inode, filepath);
          return;
        }
        break;

      case Attr.cloned:
        let { src } = evt.args;
        if (isPending(Attr.created, inode, filepath)) {
          this.trace({ reason: `${filepath} is being copied` });
          unsetPending(Attr.created, inode, filepath);
          return;
        }

        break;

      default:
        this.trace("AAA:291 -- UNEXPECTED EVENT", evt);
        return;
    }
    this.commit(evt);
  }

  /**
   * 
   */
  isPendingRemove(node) {
    let { filepath } = node;
    if (isPending(Attr.removed, filepath)) {
      this.removeNode(node);
      unsetPending(Attr.removed, filepath);
      return true;
    }
    return false;
  }


  /**
   * 
   */
  removeNode(node) {
    let { filepath } = node;
    if (filepath) {
      this.remote.remove(node, Attr.filepath);
      this.syncOpt.remove(node, Attr.filepath);
      this.fsnode.remove(node, Attr.filepath);
    }
  }

  /**
   * 
   * @returns 
   */
  isPendingUpload(node) {
    let { inode } = node;
    const lock = Local(Attr.uploaded);
    let request = lock.get(inode);
    if (request && request.abort) {
      lock.delete(inode);
      request.abort()
      return true;
    }
  }


  /**
   * 
   * @param {*} filename 
   * @returns 
   */
  handleEvents(filename) {
    let stat = this.localFile(filename, Attr.node);
    let node;
    let eventtype;
    let evt;
    let args = {};
    const { filepath } = stat;
    if (isPending(Attr.downloaded, filepath)) {
      this.trace({ reason: `${filepath} is being downloaded` });
      return;
    }
    if (isPending(Attr.media, filepath)) {
      this.trace({ reason: `${filepath} is being created` });
      return;
    }

    if (!stat.inode) {
      eventtype = Attr.deleted;
      node = this.fsnode.row({ filepath }, Attr.filepath);
      this.trace("AAA:349", { filepath, filename, node });
      if (!node) {
        this.trace("No record found for", stat, filepath);
        this.addFsNode(stat);
        clearPending(filepath);
        return;
      }
      evt = node;
      if (node.ext) evt.filename = `${node.filename}.${node.ext}`;
    } else {
      evt = stat;
      node = this.fsnode.row(stat, Attr.inode);
      let dbg = {};
      if (!node) {
        let remote = this.remote.row(stat, Attr.filepath);
        if (!remote) {
          eventtype = Attr.created;
        } else {
          eventtype = Attr.changed;
        }
      } else {
        let filename = node.filename;
        if (node.ext) filename = `${filename}.${node.ext}`;
        if (node.filepath == filepath) {
          if (node.mtimeMs == stat.mtimeMs) {
            return;
          }
          eventtype = Attr.changed;
        } else {
          if (filename == stat.filename) {
            eventtype = Attr.moved;
            let src = this.remote.row(node, Attr.filepath);
            let filepath = dirname(stat.filepath);
            let dest = this.remote.row({ filepath }, Attr.filepath);
            if (dest && src && dest.hub_id && src.hub_id != dest.hub_id) {
              eventtype = Attr.cloned;
            } else {
              eventtype = Attr.moved;
            }
          } else {
            eventtype = Attr.renamed;
            let remote = this.remote.row(stat, Attr.filepath);
            let old;
            if (remote) {
              eventtype = Attr.changed;
              evt = stat;
              dbg.remote = remote;
            } else {
              old = this.remote.row(node, Attr.filepath);
              if (!old) {
                eventtype = Attr.created;
              }
              dbg.old = old;
            }
            this.trace("AAA:408", { eventtype, node, remote, old })
          }
          if (/^(renamed|moved)/.test(eventtype)) {
            args = {
              src: node,
              dest: { ...stat }
            }
          }
        }
      }
    }
    let inode = evt.inode;
    if (!inode) {
      /** Skip non existing entity */
      return;
    }

    if (this.timer[inode]) {
      clearTimeout(this.timer[inode]);
      delete this.timer[inode];
      this.fslog.clearNode(evt);
    }

    evt.eventtype = eventtype;
    evt.args = { ...args, origin: "local" };
    this.fslog.upsert(evt);
    this.timer[inode] = setTimeout(() => {
      this.dispatch(evt);
    }, 1000);
  }


  /**
   *
   */
  start() {
    this.trace(`Preparing watch : ${this.workingRoot}`);
    if (!existsSync(this.workingRoot)) {
      this.trace(`COULD NOT WATCH NON EXISTING ENTRY`, this.workingRoot);
      reject();
    }
    if (this.watcher) {
      this.watcher.close();
    }
    try {
      this.watcher = watch(this.workingRoot,
        { encoding: 'utf8', recursive: true }, (e, filename) => {
          if (!filename) return;
          if (IGNORED.test(filename)) return;
          this.handleEvents(filename);
        });
    } catch (e) {
      this.warn("Failed to initialize wtacher", e);
    }
  }

  /**
   *
   * @param {*} args
   */
  fetchNode(args) {
    this.trace("AAAA:199 -- FETCH", args);
    if (/^(delete|remove|rename)/.test(args.eventtype)) return;
    if (!args.nid) args.nid = args.pid;
    let items = this.remote.show_node(args);
    for (var item of items) {
      if (!this.fsnode.row(item, Attr.filepath) || !this.localFile(item)) {
        if (/^(hub|folder)$/.test(item.filetype)) {
          setTimeout(() => {
            mfsScheduler.log({ ...item, name: "media.init" });
          }, (items.length + 1) * 300);
        }
      }
    }
  }

  /**
   *
   * @param {*} evt
   * @param {*} fseventId
   * @param {*} eventtype
   */
  async _resolveNewNode(e, resolve, reject) {
    let stat = this.localFile(e, Attr.stat);
    if (stat.isDirectory()) {
      e.nodetype = Attr.folder;
    } else {
      e.nodetype = Attr.file;
    }
    let rem = this.remote.row(e, Attr.filepath);
    let { ctimeMs, mtimeMs } = stat;
    e = { ...e, ctimeMs, mtimeMs };
    //this.trace("AAA:421 RESOLVE NEW NODE", stat, e);
    //this.trace("AAA:401 CREATED:", e.filepath);
    if (rem && rem.nid) {
      e.eventtype = Attr.modified;
      e.name = `${e.nodetype}.${e.eventtype}`;
    }
    if (e.nodetype == Attr.folder) {
      await mfsWorker.populateLocalNode(e.filepath);
    }
    this.oldFslog.upsert(e);
    if (stat.size > 0) {
      resolve(e);
    } else {
      // On Darwin platform, stream writing start with creating empty file.
      setTimeout(() => {
        stat = this.localFile(e, Attr.stat);
        if (stat.size > 0) {
          resolve(e);
        } else {
          // TO DO : handle genuine empty file (create media.touch)
          reject(e);
        }
      }, 1000);
    }
  }


  /**
   *
   * @param {*} evt
   */
  _clearDownloadLock(evt) {
    let filepath = evt.filepath;
    if (!isPending(Attr.downloaded, filepath)) return;
    this.fsevent.remove({ filepath }, Attr.filepath);
    setTimeout(() => {
      unsetPending(Attr.downloaded, filepath);
    }, 500);
  }

  /**
   *
   */
  async onFileClose(evt, rem, md5Hash) {
    //let loc = this.local.row(evt, Attr.nid);
    //let rem = this.remote.row(evt, Attr.nid);
    let stat = this.localFile(evt, Attr.stat);
    if (!stat.ino) {
      this.trace(`EEE:610 -- ENTITY_ERROR`, evt.filepath);
      this._clearDownloadLock(evt);
      this.trigger(`downloaded:${evt.filepath}`, evt);
      return;
    }

    // if (!loc) {
    //   loc = rem;
    // }
    let nodetype = Attr.file;
    if (this.isBranch(evt)) {
      nodetype = Attr.folder;
    }
    /** ********** TEMPORARILY DISABLED ******************
      if (!(permission.delete & evt.privilege) || !(permission.write & evt.privilege)) {
        let path = this.localFile(evt.filepath, Attr.location);
        this.trace("AAA:627:CHMOD", evt.privilege, path);
        try {
          Fs.chmodSync(path, Fs.constants.S_IRUSR | Fs.constants.S_IRGRP | Fs.constants.S_IROTH);
        } catch (e) {
        }
      }
    ****************** */
    let { filename, ext } = evt.filepath.filename();
    if (stat.isDirectory()) {
      filename = basename(filepath);
      ext = "";
    } else {
      this.hash.upsert({
        ...stat.miniData,
        filepath: evt.filepath,
        md5: md5Hash
      });
    }
    this.fsnode.upsert({
      inode: stat.ino,
      filepath: evt.filepath,
      filename,
      ext,
      filesize: stat.size,
      nodetype,
      birthtimeMs: stat.birthtimeMs,
      ctimeMs: stat.ctimeMs,
      mtimeMs: stat.mtimeMs,
    });

    // if (!loc) {
    //   this.trace("AAA:313 CAN NOT UPDATE LOCAL", evt, loc);
    //   this.trigger(`downloaded:${evt.filepath}`, evt);
    //   return;
    // }
    //this.trace("AAA:684:onFileClose", evt, loc, rem);
    // if (loc.nid && rem.nid) {
    //   loc.inode = stat.ino;
    //   loc.filesize = stat.size;
    //   loc.atimeMs = stat.atimeMs;
    //   loc.birthtimeMs = stat.birthtimeMs;
    //   loc.ctimeMs = stat.ctimeMs;
    //   loc.mtimeMs = stat.mtimeMs;
    //   loc.ctime = rem.ctime || loc.ctime;
    //   loc.mtime = rem.mtime || loc.mtime;
    //   this.local.upsert(loc);
    // }
    this._clearDownloadLock(evt);
    this.trigger(`downloaded:${evt.filepath}`, evt);
  }

  /**
   *
   * @param {*} type
   * @param {*} timeout
   * @returns
   */
  waitUntil(evt, type, timeout) {
    let filepath = shortPath(evt);
    let done = 0;
    let trigger = `${type}:${filepath}`;
    this.fsevent.remove({ filepath }, Attr.filepath);
    //this.trace("AAA:314 -- WAITING FOR", trigger);
    if (timeout === null) timeout = 3000;
    return new Promise(async (resolve, reject) => {
      if (timeout > 0) {
        setTimeout(() => {
          if (done) return;
          done = 1;
          resolve();
        }, timeout);
      }
      this.once(trigger, (e) => {
        this.trace("AAA:529 -- RECEIVED", trigger);
        if (done) return;
        done = 1;
        resolve(e);
      });
    });
  }
}
module.exports = Watcher;
