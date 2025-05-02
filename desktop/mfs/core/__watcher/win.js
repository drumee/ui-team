/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/utils/watchFiles.js
 * TYPE : Skelton
 * ===================================================================**/
const Chokidar = require("chokidar");
const Path = require('path');
const Fs = require('fs');
const _a = require('../../lex/attribute');
const _ = require('lodash');
const mfsUtils = require('../utils');
const { shortPath } = require('../../utils/sync-flags');
const queue = [];
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
    this.scheduler = opt.scheduler;

    this._done = true;
    this._moving = null;

    let local = require('../utils/local')(this);
    this.local = {
      ...this.local,
      ...local
    };

    let remote = require('../utils/remote')(this);
    this.remote = {
      ...this.remote,
      ...remote
    };

    let fsnode = require('../utils/fsnode')(this);
    this.fsnode = {
      ...this.fsnode,
      ...fsnode
    };

    let fsevent = require('../utils/fsevent')(this);
    this.fsevent = {
      ...this.fsevent,
      ...fsevent
    };

    let fslog = require('../utils/fslog')(this);
    this.fslog = {
      ...this.fslog,
      ...fslog
    };


    this.bindEvents();
    global.fsWatcher = this;
    this.timer = {};
  }


  /**
  * 
  */
  destroy() {
    super.destroy();
    if (this.watcher) {
      this.watcher.close().then(() => {
        this.debug("Chokidar closed");
      })
      this.watcher = null;
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
    let rem = this.remote.row({ filepath }, _a.filepath) || {};
    let filetype = null;
    if (rem) {
      if (/^(hub|folder)$/.test(rem.filetype)) {
        filetype = 'folder';
      } else {
        filetype = 'file';
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
  start() {
    this.debug(`Preparing watch : ${this.workingRoot}`);
    return new Promise((resolve, reject) => {
      if (!Fs.existsSync(this.workingRoot)) {
        this.debug(`COULD NOT WATCH NON EXISTING ENTRY`, this.workingRoot);
        reject();
      }
      let watcher = Chokidar.watch(this.workingRoot, {
        ignored: IGNORED,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        },
        atomic: true,
      });
      watcher.on('ready', () => {
        this.debug(`Start watching : ${this.workingRoot}`);
        watcher.on('raw', async (eventtype, path, data) => {
          if (ARGV.debugWatcher) this.debug("AAA:103", eventtype, path, data);
          if (this.paused()) return;
          this.preProcessEvent(eventtype, path, data)
            .then((evt) => {
              this.debug("AAA:150", evt);
              let { lastInsertRowid } = this.fsevent.insert(evt);
              this._logEvent(evt, lastInsertRowid, eventtype);
            }).catch((e) => {
              if (ARGV.verbose) {
                if (e.reason) {
                  this.debug("AAA:156 -- SKIPPED EVENT", e.reason);
                } else {
                  this.debug("AAA:158 -- SKIPPED EVENT", e);
                }
              }
            });
        });

        watcher.on('error', (error) => {
          this.debug('Watcher got error', error);
        });
        resolve(watcher);
        this._ready = 1;
      });
      this.watcher = watcher;
    })

  }

  /**
   * 
   */
  preProcessEvent(eventtype, path, data) {
    return new Promise((resolve, reject) => {
      let watchedPath = data.watchedPath || data.path;
      if (!watchedPath || !path) {
        //this.debug("Invalid input!!!", watchedPath, path);
        reject({ reason: `invalid ${watchedPath}` });
        return;
      }

      let filename = Path.basename(path);
      if (IGNORED.test(filename)) return reject({ reason: `ignored ${path}` });

      let dir = this.localFile(watchedPath, _a.relative);
      let filepath = Path.join('/', dir, filename);
      let realpath = Path.join(watchedPath, filename);
      this.debug("AAA:102", eventtype, watchedPath, filename);
      let nodetype = data.type;
      let timestamp = new Date().getTime();
      Fs.stat(watchedPath, (error, stat) => {
        if (error) {
          this.debug("AAA:115", error);
          switch (error.code) {
            case 'ENOENT':
              filepath = this.localFile(watchedPath, _a.relative);
              let tag = `${filepath}-delete`;
              if (this.timer[tag]) {
                return reject({ reason: `${tag} is being queued [222]` });
              }
              this.timer[tag] = setTimeout(() => {
                this._deleteNode(filepath, resolve, reject);
                delete  this.timer[tag];
              }, 300);
              break;
            default:
              //this.debug("AAA:112 -- UNPRCOESSED EVENT", error);
              reject({ reason: `irrevelent error code ${error.code}` });
          }
        } else {
          if (stat.isDirectory()) {
            realpath = Path.join(watchedPath, filename);
          } else {
            realpath = watchedPath;
          }
          filepath = this.localFile(realpath, _a.relative);
          if (pendingDownloads.get(filepath)) {
            reject({ reason: `${filepath} is being downloaded` });
            return;
          }
          this.debug("AAA:244: FILEPATH", filepath, stat.isDirectory());
          Fs.stat(realpath, (error, stat) => {
            if (error) {
              return this._deleteNode(filepath, resolve, reject);
            }
            if (stat.isDirectory()) {
              nodetype = 'folder';
            } else {
              nodetype = 'file';
            }
            this.debug("AAA:173: NODETYPE", filepath, pendingDownloads.get(filepath), pendingDownloads.keys());
            if (pendingDownloads.get(filepath)) {
              // this.debug("AAA:148:PENDING", pendingDownloads.get(filepath));
              reject({ reason: `${filepath} is being downloaded` });
            } else {
              //this.debug("AAA:167", s, log);
              this.fslog.upsert({ ...stat, inode: stat.ino, nodetype, eventtype, filepath, timestamp });
              let tag = `${filepath}-${eventtype}`;
              if (this.timer[tag]) {
                return reject({ reason: `${tag} is being queued [277]` });
              }
              this.timer[tag] = setTimeout(() => {
                let r = this.fslog.getEvent(stat, nodetype, timestamp);
                delete this.timer[tag];
                if (r.skipped) {
                  return reject(r);
                }
                r.stat = stat;
                r.name = `${r.nodetype}.${r.eventtype}`;
                switch (r.eventtype) {
                  case 'renamed':
                    this._renameNode(r);
                    resolve(r);
                    break;
                  case 'moved':
                    this._moveNode(r);
                    resolve(r);
                    break;
                  case 'created':
                  case 'modified':
                    resolve(r);
                    break;
                  default:
                    reject(r)
                    return
                }
                this.fslog.clear(stat);
              }, 300);
            }
          });
        }
      });
    })
  }


  /**
   * 
   * @param {*} evt 
   * @param {*} stat 
   * @param {*} evtType 
   */
  _logEvent(evt, fseventId, eventtype) {

    this.debug("AAAA:226", evt, fseventId);
    setTimeout(() => {
      let n = `${eventtype}:${evt.filepath}`;
      this.debug("AAAA:250 -- TRIGGER ", n);
      this.trigger(n);
    }, 100);

    if (ARGV.fsevent == 'dryrun') return;
    //this.trigger('fs-event', evt);
    // this._clearDownloadLock(evt);
    let changes = this.fsevent.changeRate();
    if (changes && changes.length > 1) {
      evt.sanity = 'change';
      //this.debug("AAAA:226", changes);
    }
    let deletions = this.fsevent.removeRate();
    if (deletions && deletions.length > 5) {
      evt.sanity = 'delete';
      //this.debug("AAAA:226", changes);
    }
    let eventId = mfsScheduler.log(evt);
    if (eventId) {
      this.fsevent.setEventId(eventId, fseventId);
    }

  }



  /**
   * 
   * @param {*} evt 
   */
  _clearDownloadLock(evt) {
    let filepath = evt.filepath;
    if (!pendingDownloads.get(filepath)) return;
    this.fsevent.remove({ filepath }, _a.filepath);
    setTimeout(() => {
      pendingDownloads.delete(filepath);
    }, 500);
  }

  /**
   * 
   */
  _deleteNode(filepath, resolve, reject) {
    let loc = this.local.row({ filepath }, _a.filepath) || {};
    let fsnode = this.fsnode.row({ filepath }, _a.filepath) || {};
    let evt = { ...loc, ...fsnode, eventtype: 'deleted' };
    evt.stat = fsnode;
    evt.name = `${evt.nodetype}.${evt.eventtype}`;
    if (!evt.inode) {
      return reject({ reason: `Orphaned node ${filepath}` });
    }
    this.local.remove(evt, _a.filepath);
    this.remote.remove(evt, _a.filepath);
    if (evt.nodetype = 'folder') {
      this.local.deleteDirectory(evt);
      this.remote.deleteDirectory(evt);
    };
    resolve(evt);
  }


  /**
   * 
   */
  _moveNode(args) {
    let { nodetype, src, dest } = args;

    if (!dest.nid) {
      this.local.renameNode(src, dest);
      return false;
    }
    this.remote.renameNode(src, dest);
    this.local.renameNode(src, dest);
    if (/^folder$/i.test(nodetype)) {
      let manifest = this.remote.manifest(args.nid);
      for (var item of manifest) {
        let re = new RegExp('^' + src.filepath);
        let filepath = item.filepath.replace(re, '');
        filepath = Path.join(dest.filepath, filepath);
        this.remote.renameNode(item, { ...item, filepath });
        this.local.renameNode(item, { ...item, filepath });
      }
    };
    this.fsnode.nodeRenamed(src.filepath, dest.filepath);

  }


  /**
   * 
   */
  _renameNode(args) {
    let { nodetype, src, dest } = args;

    if (!dest.nid) {
      this.local.renameNode(src, dest);
      return false;
    }
    if (!src.nid) {
      return false;
    }

    //this.debug("AAA:208", media, src, dest);
    this.remote.renameNode(src, dest);
    this.local.renameNode(src, dest);
    if (/^folder$/i.test(nodetype)) {
      let manifest = this.remote.manifest(src.nid);
      for (var item of manifest) {
        //this.debug("AAAA:301", item);
        let re = new RegExp('^' + src.filepath);
        let filepath = item.filepath.replace(re, '');
        filepath = Path.join(dest.filepath, filepath);
        this.remote.renameNode(item, { ...item, filepath });
        this.local.renameNode(item, { ...item, filepath });
      }
    };
    this.fsnode.nodeRenamed(src.filepath, dest.filepath);
  }

  /**
   * 
   */
  async onFileClose(evt) {
    let loc = this.local.row(evt, _a.nid);
    let rem = this.remote.row(evt, _a.nid);
    let stat = this.localFile(evt, _a.stat);
    if (!loc) {
      loc = rem;
    }
    this.debug("AAA:684:onFileClose", evt)
    this.fsnode.upsert({
      inode: stat.ino,
      filepath: evt.filepath,
      filetype: evt.filetype,
      timestamp: new Date().getTime(),
      ctimeMs: stat.ctimeMs,
      mtimeMs: stat.mtimeMs
    });
    if (!loc) {
      this.debug("AAA:313 CAN NOT UPDATE LOCAL", evt, loc);
      this.trigger(`downloaded:${evt.filepath}`, evt);
      return;
    }
    if (!loc.inode || loc.filesize != stat.filesize || loc.mtimeMs != stat.mtimeMs) {
      loc.inode = stat.ino;
      loc.filesize = stat.filesize;
      loc.atimeMs = stat.atimeMs;
      loc.ctimeMs = stat.ctimeMs;
      loc.mtimeMs = stat.mtimeMs;
      loc.ctime = rem.ctime || loc.ctime;
      loc.mtime = rem.mtime || loc.mtime;
      this.local.upsert(loc);
      this._clearDownloadLock(evt);
    } else {
      //this.debug("AAA:313 ALREADY UP TO DATE", evt, loc);
    }
    this.trigger(`downloaded:${evt.filepath}`, evt);
  }

  /**
 * 
 * @param {*} type 
 * @param {*} timeout 
 * @returns 
 */
  waitUtil(evt, type, timeout) {
    let filepath = shortPath(evt);
    let done = 0;
    let trigger = `${type}:${filepath}`
    this.fsevent.remove({ filepath }, _a.filepath);
    this.debug("AAA:314 -- WAITING FOR", trigger);
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
        this.debug("AAA:529 -- RECEIVED", trigger);
        if (done) return;
        done = 1;
        resolve(e);
      });
    })
  }

}
module.exports = Watcher;
