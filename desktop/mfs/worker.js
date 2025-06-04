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

const { basename, isAbsolute } = require("path");
const Fs = require("fs");
const Attr = require("../lex/attribute");
const FsWatcher = require("./core/fs-watcher");
const TimeKeeper = require("./core/timeKeeper");
const Changelog = require("./changelog");
const IGNORED =
  /\.tmp$|\.db$|\~.+$|^__|Thumbs.db|.DS_Store|__MACOSX|.thumbnails|.swp/;
const _ = require("lodash");
const { permission, privilege } = require("../lex/constants");
const diskSpace = require("check-disk-space").default;
const Filesize = require("filesize");

const Media = require("./media");
const { sizeOfpending, pendingLocks } = require("./core/locker");
const { shell, app } = require("electron");
const HOME_REG = new RegExp(app.getPath('home'))
/**
 * App main window will get created from the ready action.
 */
class Worker extends Media {
  /**
   */
  initialize(opt) {
    if (!USER_DOMAIN_DIR || !USER_HOME_DIR) {
      throw "Undefined MFS ROOT";
    }

    this.methods = [
      require("./handler/folder"),
      require("./handler/file"),
      require("./handler/media"),
      require("./handler/conflict"),
      require("./core/fs-watcher"),
      require("./core/fs-runner"),
      require("./core/request"),
    ];

    this.webEvents = {
      "mfs-show-node": "showNode",
      "mfs-sync-item": "onSyncItem",
      "mfs-apply-remote": "takeRemoteItem",
      "mfs-show-sync-diff": "showSyncDifferences",
      "worker-delete-local": "deleteLocalFile",
      "worker-get-disk-usage": "getDiskUsage",
      "worker-disable-item": "disableItemSync",
      "worker-enable-item": "enableItemSync",
      "worker-get-sync-params": "getSyncParams",
      "worker-get-changelog": "getChangelog",
      "worker-get-unsynced-items": "getUnsyncedItems",
      "worker-set-sync-params": "setSyncParams",
      "worker-sync-all": "syncAll",
      "worker-sync-item": "syncItem",
      "worker-sync-pause": "pause",
      "worker-sync-resume": "resume",
      "worker-sync-resync": "resync",
      "worker-abort-sync": "aborSync",
      "worker-get-env": "getEnv",
      "worker-show-homedir": "menu_show_homedir",
    };

    this.userEvents = {
      "menu-show-sync-diff": "getSyncDifference",
      "menu-sync-control": "menu_sync_control",
      "menu-show-homedir": "menu_show_homedir",
    };

    this.stateMachine = {
      "folder.cloned": "onFsCopy",
      "folder.created": "onFolderCreated",
      "folder.deleted": "onFolderDeleted",
      "folder.moved": "onFolderMoved",
      "folder.renamed": "onFolderRenamed",
      "file.cloned": "onFsCopy",
      "file.created": "onFileCreated",
      "file.deleted": "onFileDeleted",
      "file.modified": "onFileChanged",
      "file.changed": "onFileChanged",
      "file.moved": "onFileMoved",
      "file.renamed": "onFileRenamed",
      "fs.add": "onFsAdd",
      "fs.mkdir": "onFsMkDir",
      "fs.remove": "onFsRemove",
      "fs.rename": "onFsRename",
      "fs.move": "onFsMove",
      "request.file": "requestDownload",
      "local-gone": "clearLocal",
      "local-missing": "onMediaNew",
      "local-removed": "localRemoved",
      "local.outdated": "onMediaUpdate",
      "media.attributes": "onMediaAttributes",
      "media.change": "onMediaWrite",
      "media.browse": "showNode",
      "media.copy": "onMediaCopy",
      "media.init": "onMediaInit",
      "media.make_dir": "onMediaNew",
      "media.mk_dir": "onMediaNew",
      "media.move": "onMediaMove",
      "media.new": "onMediaNew",
      "media.open": "onMediaOpen",
      "media.remove": "onMediaRemove",
      "media.rename": "onMediaRename",
      "media.replace": "onMediaUpdate",
      "media.restore_into": "onMediaNew",
      "media.trash": "onMediaRemove",
      "media.update": "onMediaChange",
      "media.write": "onMediaWrite",
      "remote-deleted": "remoteDeleted",
      "remote-newer": "todo",
      synced: "nop",
    };

    super.initialize(opt);
    this.home_id = Account.user.get(Attr.home_id);
    this.hub_id = Account.user.get(Attr.hub_id);
    global.MFS_HOME_ID = this.home_id;
    this.timestamp = new Date().getTime().toString();

    // this.local = {
    //   ...this.local,
    //   ...require("./utils/local")(this),
    // };

    this.event = {
      ...this.event,
      ...require("./utils/event")(this),
    };

    this.fsnode = {
      ...this.fsnode,
      ...require("./utils/fsnode")(this),
    };

    this.hash = {
      ...this.hash,
      ...require("./utils/hash")(this),
    };

    //let remote = require("./utils/remote")(this);
    this.remote = {
      ...this.remote,
      ...require("./utils/remote")(this),
    };

    let task = require("./utils/task")(this);
    this.task = {
      ...this.task,
      ...task,
    };

    let syncOpt = require("./utils/sync-opt")(this);
    this.syncOpt = {
      ...this.syncOpt,
      ...syncOpt,
    };

    this.bindEvents();
    global.mfsWorker = this;
    this.set({
      total_size: 0,
      used_size: 0,
    });

    this.Changelog = new Changelog();
    this.TimeKeeper = new TimeKeeper();
    this.watcher = new FsWatcher({
      home_id: this.home_id,
      db: this.db,
      user: Account.user,
    });
  }

  /**
   *
   */
  destroy() {
    if (this.watcher) {
      this.watcher.destroy();
    }
    super.destroy();
  }

  /**
   *
   */
  async prepare(force = 0) {
    this.debug("AAA:198 -- PREPARING WORKER");
    if (!Account.user.isOnline()) {
      this.warn("[178] POPULATE NOT ALLOWED IN ANOMYNOUS CONTEXT");
      return false;
    }
    if (this._populated && !force) {
      return
    }

    if (ARGV.dev) {
      if (ARGV.reset) {
        this.clearPendingEntities();
        this.syncOpt.resetTables();
        this.remote.resetTables();
        if (Fs.existsSync(USER_HOME_DIR)) {
          Fs.rmSync(USER_HOME_DIR, { recursive: true });
        }
        if (!Fs.existsSync(USER_HOME_DIR)) {
          Fs.mkdirSync(USER_HOME_DIR, {
            recursive: true,
          });
        }
      }
      if (ARGV.resync) {
        this.clearPendingEntities();
      }
    }
    await this.populateRemote();
    await this.populateLocal();
    this.remote.initChangesList();
    //this.fsnode.purgeZombies();
    this.fsnode.initChangesList();
    this.syncOpt.initDefaults();
    this._populated = 1;
    this.trigger('populated');
  }

  _sendEnv(channel, data) {
    if (!channel) return;
    let localRoot = USER_HOME_DIR.replace(HOME_REG, '');
    data.settings.localRoot = localRoot.replace(/^\/+/, '~');
    webContents.send(channel, data);
  }

  /**
   * 
   */
  getEnv(opt = {}) {
    let { channel } = opt;
    const populated = this._populated;
    const settings = this.syncOpt.rootSettings();
    settings.engine = settings.effective;
    const data = {
      populated,
      settings,
    }
    if (!populated || settings.pending) {
      this.once('populated', () => {
        this._sendEnv(channel, data)
      });
    } else {
      this._sendEnv(channel, data)
    }
    return data;
  }

  /**
   *
   */
  async startSyncEngine(opt = {}) {
    this.debug("AAA:274", this.syncOpt.rootSettings())
    let { channel, args } = opt;
    if (!Account.user.isOnline()) {
      this.debug("AAA:125 -- POPULATE NOT ALLOWED IN ANOMYNOUS CONTEXT");
      return false;
    }
    await this.prepare();
    /** Wait for Account.socket_id */
    this.syncInitialChanges();
    this.watcher.start();
  }


  /**
   *
   */
  syncInitialChanges() {
    let { engine, effective } = this.syncOpt.rootSettings();
    let changes = this.remote.getChangesList();
    let localRemoved = this.fsnode.getRemovedEntities();
    this.debug("AAA:294", localRemoved)
    let newLocal = this.fsnode.getNewEntities();
    let newRemote = this.remote.getNewEntities();
    this.debug("AAA:297", newRemote)
    newLocal.map((e) => {
      this.takeLocalItem(e, Attr.created)
    })
    newRemote.map((e) => {
      this.takeRemoteItem(e, Attr.created)
    })
    localRemoved.map((e) => {
      this.takeLocalItem(e, Attr.deleted)
    })
    changes.map((e) => {
      if (e.locMtime > e.mtime) {
        this.takeLocalItem(e, Attr.changed)
      } else {
        this.takeRemoteItem(e, Attr.changed);
      }
    })

    this.debug("AAAA:1187 syncInitialChanges", engine, effective, newLocal, newRemote)

  }

  /**
   *
   */
  // stop() {
  //   if (this.watcher) {
  //     this.watcher.stop();
  //   }
  // }

  /**
   *
   */
  // pause(opt) {
  //   let { channel, args } = opt;
  //   if (this.watcher) {
  //     this.watcher.pause();
  //   }
  //   webContents.send(channel, args);
  // }

  /**
   *
   */
  // resume(opt) {
  //   let { channel, args } = opt;
  //   if (this.watcher) {
  //     this.watcher.resume();
  //   }
  //   if (channel) {
  //     webContents.send(channel, args);
  //   }
  // }

  /**
   *
   */
  // restart() {
  //   this.start();
  //   this.watcher.start();
  // }

  /**
   *
   */
  async checkLocalFiles() {
    let items = await this.walkDir(this.workingRoot);
    this.debug(`AAA:169 Scanning ${this.workingRoot} `);
    let nodetype;
    for (let f of items) {
      let stat = f.stat;
      if (!stat) {
        continue;
      }
      let { filename, ext } = f.filepath.filename();
      if (stat.isDirectory()) {
        nodetype = Attr.folder;
        filename = basename(f.filepath);
        ext = "";
      } else {
        nodetype = Attr.file;
      }
      let filepath = f.filepath;
      this.fsnode.upsert({
        filename,
        ext,
        filepath,
        inode: stat.ino,
        filesize: stat.size,
        nodetype,
        timestamp: new Date().getTime(),
        atimeMs: stat.atimeMs,
        birthtimeMs: stat.birthtimeMs,
        ctimeMs: stat.ctimeMs,
        mtimeMs: stat.mtimeMs,
      });

      // let rem = this.remote.row(f, Attr.filepath);
      // if (!rem) {
      //   continue;
      // }
      // let hash = this.hash.row(f, Attr.filepath) || {};
      // if (rem.md5Hash && rem.md5Hash == hash.md5) continue;
      // this.local.upsert({
      //   ...rem,
      //   inode: stat.ino,
      //   filename,
      //   ext,
      //   filepath,
      //   filesize: stat.size,
      //   atimeMs: stat.atimeMs,
      //   birthtimeMs: stat.birthtimeMs,
      //   mtimeMs: stat.mtimeMs,
      //   ctimeMs: stat.ctimeMs,
      // });
    }
  }

  /**
   *
   */
  async checkMFS() {
    deprecated
    // this._populated = 0;
    // ARGV.resync = 0;
    // await this.checkLocalFiles();
    // return this.statesSummary();
  }

  /**
   *
   */
  async showSyncDifferences(opt) {
    let { channel, args } = opt;
    this.debug("aaa:375", r)

    // let r = await this.checkMFS();
    // this.debug("aaa:375", r)
    webContents.send(channel, args);
  }

  /**
   *
   * @returns
   */
  isReady() {
    return this._ready;
  }
  /**

   * 
   * @param {*} data 
   */
  async populateRemote() {
    this.remote.prepare();
    let nid = Account.user.get(Attr.home_id);
    let home_id = nid;
    let hub_id = Account.user.get(Attr.hub_id);
    let opt = {
      filepath: "/",
      ownpath: "/",
      filename: "",
      filetype: "root",
      md5Hash: null,
      filesize: this.directorySize,
      nid,
      home_id,
      pid: "0",
      effective: this.syncOpt.getNodeState({ filepath: '/' }),
      hub_id,
      privilege: privilege.owner,
      isalink: 0,
      status: Attr.active,
      ctime: Math.round(new Date().getTime() / 1000),
      mtime: Math.round(new Date().getTime() / 1000),
    };
    this.remote.upsert(opt);
    let data = null;
    try {
      data = await this.postService(SERVICES.media.manifest, {
        nid,
        hub_id,
      });
    } catch (e) {
      this.warn("[399] -- Failed to read manifest from server");
      this.set({ error: "FAILED_GET_MANIFEST" });
    }
    if (!data || _.isArray(!data[0])) {
      this.warn("[403] -- Failed to read manifest from server");
      return;
    }

    const populate = this.db.populate("remote");
    this.set(data[1]);
    this.set(data[4]);
    const transaction = this.db.transaction((rows) => {
      for (const row of rows) {
        if (row.ext == null || !row.filepath || row.pid == "0") continue;
        if (row.filetype == Attr.hub) {
          row.ownpath = "/";
        }
        if (IGNORED.test(row.filename)) continue;
        let absolute = isAbsolute(row.filepath);
        row.filepath = row.filepath.unixPath();
        if (!absolute) row.filepath = `/${row.filepath}`;
        row.effective = this.syncOpt.getNodeState(row);
        row.changed = null;
        if (/hub|folder/.test(row.filetype)) row.filesize = this.directorySize;
        populate.run(row);
      }
    });
    transaction(data[0]);
  }

  /**
   *
   * @param {*} data
   */
  async populateTrash() {
    this.trash.clear();
    let data = await this.postService(SERVICES.media.show_bin, {
      nid: Account.user.get(Attr.home_id),
      hub_id: Account.user.get(Attr.hub_id),
      page: -1,
    });
    if (!data) return;
    let populate = this.db.populate("trash");
    const transaction = this.db.transaction((rows) => {
      for (const rem of rows) {
        if (IGNORED.test(rem.filename)) continue;
        populate.run(rem);
      }
    });
    transaction(data);
  }

  /**
   *
   */
  populateLocalNode(base_dir) {
    return new Promise(async (resolve, reject) => {
      let root = this.localFile(base_dir, Attr.absolute);
      let items = await this.walkDir(root);
      const transaction = this.db.transaction((rows) => {
        try {
          this.populateLocalEntries(rows);
        } catch (e) {
          this.debug("Failed to populateLocalEntries ", e)
        }
      });
      transaction(items);
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   *
   */
  async populateLocal() {
    this.createLocalBase();
    return new Promise(async (resolve, reject) => {
      let diskFree = await this.diskFree();
      if (!diskFree) {
        return;
      }

      let items = await this.walkDir(this.workingRoot);
      const transaction = this.db.transaction((rows) => {
        this.populateLocalEntries(rows);
      });
      transaction(items);
      this._ready = 1;
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  /**
   *
   * @param {*} rows
   * @param {*} populate
   */
  populateLocalEntries(rows) {
    let inode;
    let nodetype, filesize;
    let timestamp = new Date().getTime();
    this.inodes.clear();
    let fsnode = this.db.populate("fsnode");
    let inodes = this.db.populate("inodes");
    for (const i of rows) {
      let { filepath, stat } = i;
      if (!stat.ino) {
        continue;
      }
      inode = stat.ino; // Actual inode
      inodes.run({ inode });
      let changed = 0;
      let { filename, ext } = filepath.filename();
      if (this.isDirectory(i)) {
        filename = basename(filepath);
        ext = "";
      }

      let { mtimeMs } = this.fsnode.row(stat.miniData, Attr.inode) || {};
      if (mtimeMs == stat.mtimeMs) {
        /** No changed since last start */
        continue;
      } else {
        /** preserve mtime until next start or set by syncer */
        stat.miniData.mtimeMs = mtimeMs || stat.miniData.ctimeMs;
        changed = 1;
        let opt = {
          realpath: i.realpath,
          filepath: i.filepath,
          filesize: stat.size,
          mtimeMs: stat.mtimeMs,
          inode: stat.ino
        };
        if (!stat.isDirectory()) {
          this.hash.getMd5(opt)
        }
      }

      filesize = stat.size;
      if (stat.isDirectory()) {
        nodetype = Attr.folder;
      } else {
        nodetype = Attr.file;
      }
      timestamp = Math.ceil(stat.miniData.mtimeMs / 1000);
      /** Clean filepath with white space char */
      if (/^ | +$/.test(filename)) {
        let re = null;
        if (ext) {
          re = new RegExp(`/${filename}.${ext}$`);
        } else {
          re = new RegExp(`/${filename}$`);
        }
        filename = filename.trim();
        filepath = filepath.replace(re, `/${filename}`);
        if (ext) {
          filepath = `${filepath}.${ext}`;
        }

        try {
          let src_path = this.localFile(i.filepath, Attr.absolute);
          let dest_path = this.localFile(filepath, Attr.location);
          Fs.renameSync(src_path, dest_path);
        } catch (e) {
          this.warn("Got error while populating local entries", e);
        }
      }
      fsnode.run({
        ...stat.miniData,
        filename,
        effective: this.syncOpt.getNodeState({ filepath }),
        changed,
        ext,
        inode,
        filepath,
        timestamp,
        nodetype,
        md5Hash: null,
      });
      if ((stat.mode & 146) === 0) {
        let p = this.localFile(filepath, Attr.absolute);
        let mode = stat.mode | Fs.constants.S_IWUSR;
        if (stat.isDirectory()) {
          mode = mode | Fs.constants.S_IXUSR;
        }
        Fs.chmodSync(p, mode);
      }
    }
    //this.local.syncFromRemote();
  }

  /**
   *
   * @param {*} data
   */
  // async setDefaultIgnre() {
  //   let root = this.local.row({ nid: this.home_id }, Attr.nid);
  //   if (!root) return;
  //   if (!root.md5Hash) {
  //     this.remote.ignoreHubs();
  //     root.md5Hash = "".random();
  //     this.local.update(Attr.nid, "md5Hash", root);
  //   }
  // }

  /**
   *
   * @returns
   */
  // isRunning() {
  //   return this.defaultFlags() & 0b10;
  // }

  /**
   *
   * @returns
   */
  async statesSummary(force = 0) {
    depreacted
    // await this.populate();
    // let { direction, mode, effective } = this.syncOpt.rootSettings();
    // let res = {
    //   engine: effective,
    //   effective,
    //   mode,
    //   direction,
    //   changeRate: this.local.changeRate(),
    //   error: this.get(Attr.error),
    //   remote: {},
    //   local: {},
    // };
    // // Change on local impact remote and reversely
    // const remote = () => {
    //   return {
    //     // moved: this.local.moved(),
    //     // changed: this.local.changed(), //
    //     // created: this.local.created(),
    //     // renamed: this.local.renamed(), //
    //     deleted: this.local.deleted(), //
    //     // ignored: this.local.ignored(),
    //   };
    // };
    // const local = () => {
    //   return {
    //     moved: this.remote.moved(),
    //     changed: this.remote.changed(),
    //     created: [],
    //     renamed: this.remote.renamed(),
    //     deleted: this.remote.deleted(),
    //     ignored: this.remote.ignored(),
    //   };
    // };
    // switch (direction) {
    //   case "duplex":
    //     res.local = local();
    //     res.remote = remote();
    //     break;
    //   case "downstream":
    //     res.local = local();
    //     break;
    //   case "upstream":
    //     res.remote = remote();
    // }
    // return res;
  }

  /**
   *
   * @returns
   */
  // readLocalState(arg) {
  //   webContents.send(arg.channel, this.statesSummary());
  // }

  /**
   *
   */
  enableItemSync(opt) {
    let { channel, args } = opt;
    this.syncOpt.changeNodeSettings(args);
    let name = "media.init";
    if (this.isBranch(args)) {
      name = "media.browse";
    }
    if (args.nid) {
      mfsScheduler.log({
        ...args,
        args: { syncEnabled: 1, force: 1 },
        name,
      });
    }
    webContents.send(channel, args);
  }

  /**
   *
   */
  disableItemSync(opt) {
    let { channel, args } = opt;
    this.syncOpt.changeNodeSettings(args);
    if (args.nid) this.sendMediaState(args, args.nid);
    webContents.send(channel, args);
  }

  /**
   *
   */
  getUnsyncedItems(opt) {
    let { channel, args } = opt;
    let target = args.target;
    let type = args.type;
    let res = null;
    if (/^(local|remote)$/.test(target)) {
      let f = this[target][type];
      if (f) res = f();
    }
    webContents.send(channel, res);
  }

  /**
   *
   */
  applyUnsyncedItem(args = {}) {
    this.debug("AAA:525", args);
    let target = args.target;
    let type = args.type;
    if (/^(local|remote)$/.test(target)) {
      if (target == Attr.local) {
        this.takeRemoteItem(args.item, type);
      } else if (target == Attr.remote) {
        this.takeLocalItem(args.item, type);
      }
    }
  }

  /**
   *
   */
  // async createLocalNode(filepath, nid, pid) {
  //   let root = this.fsnode.row({ filepath }, Attr.filepath);
  //   let stat;
  //   if (!Fs.existsSync(filepath)) {
  //     Fs.mkdirSync(filepath, {
  //       recursive: true,
  //     });
  //   }

  //   let timestamp = new Date().getTime();
  //   if (!root) {
  //     stat = Fs.statSync(filepath);
  //     let data = {
  //       filepath,
  //       filename: basename(filepath),
  //       hub_id: Account.user.get(Attr.id),
  //       pid,
  //       nid,
  //       atimeMs: stat.atimeMs,
  //       birthtimeMs: stat.birthtimeMs,
  //       ctimeMs: stat.ctimeMs,
  //       mtimeMs: stat.mtimeMs,
  //       inode: stat.ino,
  //       filetype: Attr.system,
  //       filesize: stat.size,
  //       timestamp,
  //     };
  //     this.debug("SCANNING", data, USER_HOME_DIR);
  //     this.directorySize = stat.size;
  //     this.fsnode.upsert(data);
  //   }

  //   return true;
  // }

  /**
   *
   */
  createLocalBase() {
    if (!Fs.existsSync(USER_HOME_DIR)) {
      Fs.mkdirSync(USER_HOME_DIR, {
        recursive: true,
      });
    }

    let stat = Fs.statSync(USER_HOME_DIR);
    let node = {
      nid: this.home_id,
      pid: "0",
      hub_id: Account.user.get(Attr.id),
      filepath: "/",
      filename: "",
    }
    let data = {
      ...node,
      ...stat,
      filetype: Attr.system,
      filesize: stat.size,
      ctime: Math.round(stat.ctimeMs / 1000),
      mtime: Math.round(stat.mtimeMs / 1000),
      inode: stat.ino,
    };
    //this.local.upsert(data);
    let filename = basename(USER_HOME_DIR);
    this.fsnode.upsert({
      ...data,
      filename,
      timestamp: new Date().getTime(),
      filepath: `/${filename}`,
      nodetype: Attr.system,
    });
    this.syncOpt.initialize();
  }

  /**
   *
   * @returns
   */
  checkSanity(item) {
    if (!item || !item.privilege & permission.write) return "PERMISSION_DENIED";
    return null;
  }


  /**
   *
   * @param {*} item
   */
  takeRemoteItem(item, type) {
    type = type || item.type;
    this.debug(`AAA:535 action=${type}`, item);
    switch (type) {
      case Attr.created:
        mfsScheduler.log({ ...item, name: "media.init" });
        break;

      case Attr.changed:
        mfsScheduler.log({ ...item, name: "media.write" });
        break;

      case Attr.renamed:
        mfsScheduler.log({ ...item, name: "fs.rename" });
        break;

      case Attr.deleted:
        mfsScheduler.log({ ...item, name: "fs.remove" });
        break;

      case Attr.moved:
        let src = this.localFile(item.src, Attr.node);
        let dest = this.localFile(item.dest, Attr.node);
        if (!src.inode || !dest.realpath) {
          this.debug("Nothing to move", item, src, dest);
        }
        item.args = { ...item.args, src, dest };
        mfsScheduler.log({ ...item, name: "fs.move" });
    }
  }

  /**
   *
   * @param {*} evt
   */
  takeFromRemote(changes) {
    for (var c in changes) {
      if (changes[c]) {
        for (var item of changes[c]) {
          this.takeRemoteItem(item, c);
        }
      }
    }
  }

  /**
   *
   * @param {*} item
   */
  takeLocalItem(item, type) {
    let name, src, dest;
    let stat = this.localFile(item, Attr.stat);
    if (!stat.inode) {
      let fsnode = this.fsnode.row(item, Attr.inode);
      if (fsnode) {
        item.filepath = fsnode.filepath;
      } else {
        stat = null;
      }
    }
    if (!type) type = item.type;
    switch (type) {
      case Attr.created:
        if (!stat || !stat.ino) {
          //this.removePendingEntity("local_created", item);
          return;
        }
        if (stat.isDirectory()) {
          name = `folder.created`;
        } else {
          name = `file.created`;
        }
        mfsScheduler.log({ ...item, name });
        break;
      case Attr.changed:
        if (!stat) {
          //this.removePendingEntity("local_changed", item);
          return;
        }
        if (!stat.isDirectory())
          mfsScheduler.log({
            ...item,
            name: "file.modified",
            filepath: item.filepath,
            filename: null,
          });
        break;
      case Attr.renamed:
        if (!item.src || !item.dest) {
          //this.removePendingEntity("local_renamed", item);
          return;
        }
        this.debug(`AAA:805 type=${type}`, item);
        src = { ...item, ...this.fsnode.coalesce(item, Attr.filepath, "local") };
        dest = { ...src };
        dest.filepath = item.dest;
        item.__oldItem = src;
        item.__newItem = dest;
        if (this.isBranch(item)) {
          mfsScheduler.log({ ...item, name: "folder.renamed" });
        } else {
          mfsScheduler.log({ ...item, name: "file.renamed" });
        }
        break;
      case Attr.deleted:
        if (this.isBranch(item)) {
          mfsScheduler.log({ ...item, name: "folder.deleted" });
        } else {
          mfsScheduler.log({ ...item, name: "file.deleted" });
        }
        break;
      case Attr.moved:
        if (!item.src || !item.dest) {
          //this.removePendingEntity("local_moved", item);
          return;
        }
        this.debug(`AAA:805 type=${type}`, item);
        src = { ...item, ...this.fsnode.coalesce(item, Attr.filepath, "local") };
        dest = { ...src };
        dest.filepath = item.dest;
        item.__oldItem = src;
        item.__newItem = dest;
        if (this.isBranch(item)) {
          mfsScheduler.log({ ...item, name: "folder.moved" });
        } else {
          mfsScheduler.log({ ...item, name: "file.moved" });
        }
        break;
    }
  }

  /**
   *
   * @param {*} evt
   */
  takeFromLocal(changes) {

    for (var c in changes) {
      if (changes[c]) {
        for (var media of changes[c]) {
          this.takeLocalItem(media, c);
        }
      }
    }
  }

  /**
   *
   */
  async syncAll(opt) {
    let { channel, args } = opt;
    let changes = await this.statesSummary();
    this.debug("AAA:607", changes);
    for (let target of [Attr.remote, Attr.local]) {
      for (let type in changes[target]) {
        if (!changes[target][type]) continue;
        let length = changes[target][type].length;
        if (!length) continue;
        let items = changes[target][type];
        for (let item of items) {
          item.target = target;
          item.type = type;
          this.onSyncItem(item);
        }
      }
    }

    if (channel) webContents.send(channel, changes);
  }

  /**
   *
   */
  onSyncItem(item) {
    this.debug("[976] onSyncItem", item);
    item.args = { ...item.args, force: 1 };
    switch (item.target) {
      case "local":
        this.takeRemoteItem(item, item.type);
        break;
      case "remote":
        this.takeLocalItem(item, item.type);
        break;
    }
  }

  /**
   *
   */
  syncItem(opt) {
    let { channel, args } = opt;
    switch (args.target) {
      case "local":
        this.takeRemoteItem(args, args.type);
        break;
      case "remote":
        this.takeLocalItem(args, args.type);
        break;
    }
    webContents.send(channel, args);
  }

  /**
   *
   * @param {*} evt
   */
  async onLocalMissing(evt) { }

  todo(args) {
    this.debug("TO BE DONE AAA:156", args);
    return "todo";
  }

  /**
   *
   */
  async deleteLocalFile(opt) {
    let { channel, args } = opt;
    this.debug("AAA:150 deleteLocalFile", args);
    let stat;
    let filepath = this.normalizePathFromArgs(args);

    stat = this.localFile(filepath, Attr.stat);
    // if (_.isEmpty(stat)) {
    //   if (this.isBranch(args)) {
    //     this.local.deleteDirectory({ filepath });
    //   } else {
    //     this.local.remove({ filepath }, Attr.filepath);
    //   }
    //   return;
    // }
    args.inode = stat.ino;
    if (stat.isDirectory()) {
      let { response } = await this.confirm({
        buttons: [LOCALE.CANCEL, LOCALE.YES],
        title: LOCALE.WARN_NON_REVERTIBLE,
        message: LOCALE.REMOVE_FOLDER.format(args.filepath),
      });
      if (response == 1) mfsScheduler.log({ ...args, name: "fs.remove" });
    } else {
      mfsScheduler.log({ ...args, name: "fs.remove" });
    }
    await fsWatcher.waitUntil(args, "deleted", 3000);
    webContents.send(channel, args);
  }

  /**
   *
   * @param {*} args
   */
  disableItem(args) {
    let filepath = this.normalizePathFromArgs(args);
    this.localFile.disableSync(args);
  }

  /**
   *
   */
  async syncInfo(remote, unsynced) {
    let opt = {
      hub_id: remote.hub_id,
      nid: remote.id,
    };
    let info = await this.fetchService("media.get_node_stat", opt);
    if (_.isEmpty(info) || info.pid == "0") {
      return false;
    }

    let node = this.getNodeLocation(info);
    let privilege = info.permission;
    let data = { ...node, ...info, privilege };
    await this.setMedia(data);
    return true;
  }

  /**
   *
   * @param {*} opt
   * @returns
   */
  getSyncParams(opt) {
    let { channel, args } = opt;
    if (!this.syncOpt || !this.syncOpt.rootSettings()) {
      this.debug("AAA:1193 SNOT READY")
      webContents.send(channel, { ready: 0 });
      return;
    }
    if (!args || !args.filepath) {
      let data = this.syncOpt.rootSettings();
      webContents.send(channel, data);
      return;
    }

    let data = this.syncOpt.getNodeSettings(args);
    let sql = `SELECT 1 file_exists, 1 synced FROM hash h 
      INNER JOIN remote r ON r.filepath=h.filepath 
      WHERE r.md5Hash IS NOT NULL AND r.md5Hash=h.md5
      AND (h.inode=? OR r.nid=? OR h.filepath=?);
    `;
    let { file_exists, synced } =
      this.db.getRow(sql, args.inode, args.nid, args.filepath) || {};

    let params = {
      ...data,
      inherited: 0,
      exists: file_exists || 0,
      synced: synced || 0,
      ready: 1
    };
    let attr = {
      downloading: sizeOfpending(),
      ...params,
    };
    webContents.send(channel, attr);
  }

  /**
   *
   * @param {*} opt
   */
  async getChangelog(opt) {
    let { channel, args } = opt;
    let { engine, effective } = this.syncOpt.rootSettings();
    let changes = this.remote.getChangesList();
    //this.debug("AAA:1217", changes, this.TimeKeeper.getTimeOffset())
    let remote = [];
    let local = [];
    changes.map((e) => {
      if (e.locMtime > e.mtime) {
        local.push(e)
      } else {
        remote.push(e)
      }
    })
    // let remote = await this.Changelog.getRemoteChanges();
    // let local = await this.Changelog.getLocalChanges();
    this.debug("AAAA:1187 getRemoteChanges", remote, local)
    // let conflict = await this.Changelog.getRemoteChanges();
    webContents.send(channel, { remote: [], local: [], engine, effective });
  }

  /**
   *
   * @param {*} opt
   */
  async getDiskUsage(opt = {}) {
    let { channel } = opt;
    let df = await diskSpace(USER_HOME_DIR);
    let locale = Account.lang();
    let res = {
      total_size: Filesize(this.get("total_size"), { locale }),
      used_size: Filesize(this.get("used_size"), { locale }),
      local_rows: this.fsnode.numberOfRows(),
      disk_free: Filesize(df.free, { locale }),
    };
    if (channel) {
      webContents.send(channel, res);
    }
    return res;
  }

  /**
   *
   * @param {*} opt
   */
  async abortSync(opt) {
    let { channel, args } = opt;
    if (!args.filepath) return;
    for (let o of [pendingDownloads, pendingUploads]) {
      let r = o.get(args.filepath);
      if (r && r.abort) {
        this.debubg("[1163] abortSync", args);
        r.abort();
        o.delete(args.filepath);
      }
    }
    webContents.send(channel, res);
  }

  /**
   *
   */
  abortPendingDownloads() {
    for (let item in pendingLocks('downloaded')) {
      let request = item[1];
      if (!request || !request.abort) continue;
      request.abort();
    }
  }

  /**
   *
   */
  abortPendingUploads() {
    for (let item in pendingLocks('uploaded')) {
      let request = item[1];
      if (!request || !request.abort) continue;
      request.abort();
    }
  }

  /**
   * 
   */
  abortAllPending() {
    this.abortPendingDownloads();
    this.abortPendingUploads();
  }

  /**
   * 
   */
  syncHomeFiles() {
    let home = this.remote.show_node({ nid: this.home_id }) || [];
    let files = home.filter((e) => {
      return !this.isBranch(e)
    })
    for (let file of files) {
      mfsScheduler.log({ ...file, name: "media.init" });
    }

  }

  /**
   * 
   */
  async enableImmateMode() {
    let rows = this.syncOpt.getSyncTrees();
    for (let row of rows) {
      if (this.isBranch(row)) {
        let nodes = this.remote.manifest(row.nid);
        for (let node of nodes) {
          if (this.isBranch) {
            await this.showNode(node)
          } else {
            mfsScheduler.log({ ...file, name: "media.init" });
          }
        }
      } else {
        mfsScheduler.log({ ...row, name: "media.init" });
      }
    }
    this.syncHomeFiles();
  }

  /**
   * 
   */
  async enableEconomyMode() {
    let nodes = this.syncOpt.getSyncTrees();
    for (let node of nodes) {
      await this.showNode(node)
    }
    this.syncHomeFiles();
  }

  /**
 *
 * @param {*} args
 */
  menu_sync_control(args = {}) {
    const current = this.syncOpt.rootSettings();
    let res = this.syncOpt.changeSettings(args);
    this.debug("AAAA:1244", current, args, res)
    webContents.send("menu-sync-changed", { ...res, engine: res.effective });
    Account.refreshMenu();
    if (current.mode == Attr.onTheFly) {
      this.enableEconomyMode();
    } else {
      this.enableImmateMode();
    }
  }


  /**
   *
   */
  menu_show_homedir(opt = {}) {
    let { channel, args } = opt;
    shell.openPath(this.workingRoot);
    if (channel) {
      webContents.send(channel, this.workingRoot);
    }
  }


  /**
   *
   * @param {*} args
   */
  async getSyncDifference(args = {}) {
    let log = await this.Changelog.resync()
    this.debug("RESYNC", log, this.home_id)
    // let r = await this.checkMFS();
    webContents.send("mfs-sync-difference", {});
  }

}

module.exports = Worker;
