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
const { permission } = require("../../lex/constants");
const { isFunction, isArray, isString } = require("lodash");
const { existsSync, statSync, mkdirSync, rmSync, copyFileSync } = require("fs");
const Db = require("../../core/db/connector");
const diskSpace = require("check-disk-space").default;
const Filesize = require("filesize");
const { readdir } = require("fs/promises");
const IGNORED =
  /\.tmp$|\.db$|\~.+$|^__|Thumbs.db|.DS_Store|__MACOSX|.thumbnails/;
const { escapePath } = require("../../utils/misc");
const { setPending } = require("../core/locker");

const {
  resolve,
  dirname,
  join,
  normalize,
  basename,
  extname,
} = require("path");
const __service = require("../../core/service");

global.MFS_DB = null;

class mfsUtils extends __service {
  /***********************************
   *
   ***********************************/

  initialize(opt) {
    super.initialize(opt);
    let { uid, domain, username, } = Account.currentEndpoint() || {};
    if (!uid || !domain || !username){
      throw "Invalid endpoint";
    } 
    let datafile = `${username}-${domain}`;
    if (MFS_DB == null || MFS_DB.isClosed()) {
      let fingerprints = Account.db.fingerprints();
      MFS_DB = new Db({ datafile, fingerprints });
    }
    this.db = MFS_DB;
    if (this.db.name() != datafile) {
      throw "Databse is not bound to the right endpoint";
    }
    this.minDiskSpace = 1024 * 1024 * 1024 * 5;
    let domain_dir = join(global.USER_DATADIR, domain);
    let home = join(domain_dir, username);
    global.USER_DOMAIN_DIR = normalize(domain_dir.unixPath());
    global.USER_HOME_DIR = normalize(home.unixPath());
    this.userHome = USER_HOME_DIR;

    super.initialize(opt);
    this.workingRoot = global.USER_HOME_DIR;
    this.debug(
      `Initializing  workingRoot = ${this.workingRoot}, db=${this.db.name()}`,
      this.workingRoot,
      home
    );

    let tables = this.db.sessionTables();
    for (var k in tables) {
      let table = k;
      this[k] = {
        clear: () => {
          return this.db.run(`DELETE FROM ${table}`);
        },
        debug: (...args) => {
          let fields = args.join() || "*";
          return this.db.getRows(`SELECT ${fields} FROM ${table}`);
        },
        insert: (args) => {
          return this.db.insertInToTable(table, args);
        },
        remove: (item, ...args) => {
          return this.__remove(table, item, ...args);
        },
        row: (...args) => {
          return this.__select(table, 0, ...args);
        },
        merge: (...args) => {
          return this.__merge(table, ...args);
        },
        rows: (...args) => {
          return this.__select(table, 1, ...args);
        },
        update: (...args) => {
          return this.__update(table, ...args);
        },
        upsert: (args) => {
          return this.db.putInToTable(table, args);
        },
        manifest: (nid) => {
          return this.__manifest(table, nid);
        },
        move: (src, dest) => {
          return this.__move(table, src, dest);
        },
        parentpath: (nid, update) => {
          return this.__parentpath(table, nid, update);
        },
        removeNode: (node) => {
          return this.__removeNode(table, node);
        },
        coalesce: (...args) => {
          return this.__coalesce(table, ...args);
        },
      };
    }
  }

  /**
   *
   */
  destroy() {
    super.destroy();
    if (MFS_DB && !MFS_DB.isClosed()) {
      MFS_DB.close();
    }
    MFS_DB = null;
  }

  /**
   * 
   */
  updateNode(evt, stat) {
    let { filepath } = evt;
    if (!filepath) return;
    if (!stat || stat.inode) return;
    this.fsnode.upsert(stat);
    if (filepath != stat.filepath) return;

    let remote = this.__select('remote', 0, Attr.filepath, Attr.nid);
    if (remote) {
      this.db.putInToTable('remote', remote);
      this.db.putInToTable('local', { ...remote, ...stat });
    }
  }

  /**
   *
   * @param {*} tableName
   * @param {*} item
   * @param {*} ...keys
   * @returns
   */
  __remove(tableName, item, ...keys) {
    let sql = `DELETE FROM ${tableName} WHERE `;
    for (var k of keys) {
      sql = `${sql} ${k}=? OR `;
    }
    sql = sql.replace(/OR +$/, "");
    let args = [];
    for (var k of keys) {
      args.push(item[k]);
    }
    return this.db.run(sql, ...args);
  }

  /**
   *
   * @param {*} tableName
   * @param {*} item
   * @param {*} ...keys
   * @returns
   */
  __removeNode(table, node) {
    if (!node || !node.filepath) return;
    let { filepath, nodetype } = node;
    let sql;
    if (!nodetype) {
      sql = `SELECT nodetype FROM fsnode WHERE filepath=?`;
      let r = this.db.getRow(sql, node.filepath) || {};
      nodetype = r.nodetype;
    }
    sql = `DELETE FROM ${table} WHERE filepath=?`;
    this.db.run(sql, filepath);
    if (/hub|folder/.test(nodetype)) {
      sql = `DELETE FROM ${table} WHERE regexp('^' || ? || '/', filepath)`;
      this.db.run(sql, escapePath(filepath));
    } else {
      nodetype = "file";
    }
    return nodetype;
  }

  /**
   *
   * @param {*} tableName
   * @param {*} item
   * @param {*} ...keys
   * @returns
   */
  __merge(tableName, item, ...keys) {
    let sql = `SELECT * FROM ${tableName} WHERE `;
    for (var k of keys) {
      sql = `${sql} ${k}=? OR `;
    }
    sql = sql.replace(/OR $/, "");
    let args = [];
    for (var k of keys) {
      args.push(item[k]);
    }
    let cur = this.db.getRow(sql, ...args) || {};
    for (var k of keys) {
      if (item[k] != null) {
        cur[k] = item[k];
      }
    }
    this.db.putInToTable(tableName, cur);
    return cur;
  }

  /**
   *
   * @param {*} tableName
   * @param {*} nid
   * @returns
   */
  __manifest(tableName, pid) {
    let sql = `SELECT * FROM ${tableName} WHERE pid=?`;
    let rows = this.db.getRows(sql, pid);
    let res = [];
    if (!rows || !rows.length) return res;
    for (var row of rows) {
      res.push(row);
      if (/^(folder|hub)$/.test(row.filetype)) {
        let subdir = this.__manifest(tableName, row.nid);
        if (subdir.length) {
          res = res.concat(subdir);
        }
      }
    }
    return res;
  }

  /**
   *
   * @param {*} tableName
   * @param {*} nid
   * @returns
   */
  __move(tableName, src, dest) {
    let sql = `SELECT * FROM ${tableName} WHERE nid=?`;
    let oldNode = this.db.getRow(sql, src.nid);
    if (!oldNode) return;
    let newNode = { ...oldNode, ...dest };
    this.db.putInToTable(tableName, newNode);
    if (/^(hub|folder)$/.test(src.filetype)) {
      sql = `UPDATE ${tableName} SET pid=? WHERE nid=?`;
      this.db.run(sql, newNode.pid, oldNode.nid);
      sql = `UPDATE ${tableName} 
        SET filepath=replace_path('^'||?, filepath, ?) WHERE regexp('^'|| ?, filepath)`;
      this.db.run(
        sql,
        oldNode.filepath,
        newNode.filepath,
        escapePath(oldNode.filepath)
      );
    }
  }

  /**
   *
   * @param {*} tableName
   * @param {*} nid
   * @returns
   */
  __rename(tableName, node) {
    let sql = `SELECT * FROM ${tableName} WHERE nid=?`;
    let old = this.db.getRow(sql, node.nid);
    if (!old) return;
    let old_path = old.filepath;
    let new_path = node.filepath;
    if (old_path == new_path || new_path === "/" || !new_path) return;
    if (/^(hub|folder)$/.test(node.filetype)) {
      sql = `UPDATE ${tableName} 
        SET filepath=replace_path('^'||?, filepath, ?) WHERE regexp('^'|| ?, filepath)`;
      this.db.run(sql, old_path, new_path, escapePath(old_path));
    }
    let re = new RegExp(extname(new_path) + "$");
    let filename = basename(new_path).replace(re, "");
    sql = `UPDATE  ${tableName} SET filepath=?, filename=?, ext=?, mtime=? WHERE nid=?`;
    try {
      this.db.run(sql, new_path, filename, node.ext, node.mtime, node.nid);
    } catch (e) {
      sql = `SELECT * FROM ${tableName} WHERE filepath=?`;
      let new_node = this.db.getRow(sql, new_path);
      if (new_node && new_node.nid != node.nid) {
        sql = `UPDATE  ${tableName} SET nid=?, filename=?, ext=?, mtime=? WHERE filepath=?`;
        this.db.run(sql, node.nid, filename, node.ext, node.mtime, new_path);
      } else {
        console.error("FAILED TO RENAME", e);
      }
    }

    return old;
  }

  /**
   *
   * @param {*} tableName
   * @param {*} filepath
   */
  __coalesce(tableName, item, key, ...tables) {
    let sql;
    let value = item[key];
    if (!value) return null;
    let res = null;
    if (!tables) tables = [];
    tables.unshift(tableName);
    for (let t of tables) {
      sql = `SELECT * FROM ${t} WHERE ${key}=?`;
      res = { ...res, ...this.db.getRow(sql, value) };
    }
    return res;
  }

  /**
   *
   * @param {*} tableName
   * @param {*} item
   * @param {*} ...keys
   * @returns
   */
  __select(tableName, rows = 1, item, ...keys) {
    let sql = `SELECT * FROM ${tableName} WHERE `;
    for (var k of keys) {
      sql = `${sql} ${k}=? OR `;
    }
    sql = sql.replace(/OR $/, "");
    let args = [];
    for (var k of keys) {
      args.push(item[k]);
    }
    //this.debug("SQL:118", sql, item, args, ...keys)
    if (rows) return this.db.getRows(sql, ...args);
    return this.db.getRow(sql, ...args);
  }

  /**
   *
   * @param {*} d
   * @returns
   */
  __update(tableName, key = Attr.nid, ...args) {
    let data = args.pop();
    let sql = `UPDATE ${tableName} SET `; // WHERE nid=?`;
    let values = [];
    for (var i = 0; i <= args.length - 1; i++) {
      let name = args[i];
      sql = `${sql} ${name}=?,`;
      values.push(data[name]);
    }
    if (!data.filepath && data.file_path) data.filepath = data.file_path;
    if (data.filepath) data.filepath = data.filepath.unixPath();
    sql = sql.replace(/,$/, ` WHERE ${key}=?`);
    values.push(data[key]);
    //this.debug("AAAA:189", sql, ...values);
    this.db.run(sql, ...values);
  }

  /**
   *
   * @param {*} media
   */
  __parentpath(table, nid, update = 0) {
    let sql = `SELECT filename, ext, nid, pid FROM ${table} WHERE nid=?`;
    let r = this.db.getRow(sql, nid);
    let path = [];
    while (r && r.pid != "0") {
      if (r.ext) {
        path.unshift(`${r.filename}.${r.ext}`);
        //path = join(path, `${r.filename}.${r.ext}`)
      } else {
        //path = join(path, r.filename);
        path.unshift(r.filename);
      }
      r = this.db.getRow(sql, r.pid);
    }
    path = join("/", join("/"));
    if (update) {
      sql = `UPDATE ${table} SET filepath=? WHERE nid=?`;
      //this.debug("AAAA:252", sql, path, nid);
      this.db.run(sql, path, nid);
    }
    return path;
  }

  /**
   *
   */
  async runCallback(evt) {
    let cb = this.callback.row(evt, Attr.event_id);
    if (!cb) return;
    if (!isFunction(this[cb.func])) return;
    let args = null;
    try {
      args = JSON.parse(cb.args || {});
    } catch (e) {
      args = {};
    }
    if (isArray(args)) {
      await this[cb.func](...args);
    } else {
      await this[cb.func](args);
    }
  }

  /**
   *
   */
  isBranch(item) {
    return /^(hub|folder|root)$/.test(item.filetype);
  }

  /**
   *
   */
  async diskFree(showMsg = 1) {
    //this.debug("AAA:282", this.workingRoot, this.userHome);
    this.diskSpace = await diskSpace(this.userHome);
    let diskFree = this.diskSpace.free > this.minDiskSpace;
    //let diskFree = await this.diskFree();
    let size = Filesize(this.minDiskSpace, {
      locale: Account.lang(),
    });
    if (!diskFree) {
      if (showMsg) {
        this.showMessageBox({
          message: LOCALE.TOO_LOW_DISKSPACE.format(size),
        });
      }
      return false;
    }
    return true;
  }

  /**
   *
   * @param {*} node
   */
  mfsFilename(node) {
    let { filename, ext } = node.filepath.filename();
    if (node.filetype && !this.isBranch(node)) {
      let re = new RegExp(`\.${ext}$`);
      filename = filename.replace(re, "");
    }
    return { filename, ext };
  }

  /**
   *
   */
  checkPrivilege(arg, p) {
    if (arg.privilege & p) {
      return Attr.ok;
    }

    let rem = this.remote.row(arg, Attr.nid, Attr.filepath);
    if (!rem || !rem.nid) {
      rem = this.getParent(arg);
    }
    if (rem && rem.privilege & p) {
      return Attr.ok;
    }
    if (!rem || !rem.nid) {
      this.debug("AAA:322 -- checkPrivilege denied", arg, rem);
    }
    if (rem.status == Attr.locked) return rem.status;
    this.debug("AAA:322 -- checkPrivilege denied", rem);
    this.showMessageBox({
      buttons: [LOCALE.OK],
      message: LOCALE.WEAK_PRIVILEGE_TO_CHANGE,
    });
    return Attr.permission_denied;
  }
  /**
   *
   * @param {*} node
   */
  canWrite(arg) {
    return this.checkPrivilege(arg, permission.write);
  }

  /**
   *
   * @param {*} node
   */
  canModify(arg) {
    return this.checkPrivilege(arg, permission.modify);
  }

  /**
   *
   * @param {*} node
   */
  canDelete(arg) {
    let hubsInside = this.remote.containsHubs(arg) || [];
    let opt = {
      state: 0,
      phase: "sync-state",
    };
    if (arg.filetype == Attr.hub || hubsInside.length) {
      if (arg.filetype == Attr.hub) {
        this.sendMediaState({
          ...arg,
          ...opt,
        });
      } else {
        for (let h of hubsInside) {
          this.sendMediaState({
            ...h,
            ...opt,
          });
        }
      }
      return Attr.hub;
    }
    return this.checkPrivilege(arg, permission.delete);
  }

  /**
   *
   * @param {*} node
   */
  canMove(source = {}, destination = {}) {
    let src = this.remote.row(source, Attr.filepath, Attr.nid);
    let dest = this.remote.row(destination, Attr.filepath, Attr.nid);
    if (!src) {
      this.debug("AAA:345 -- Cannot move. Empty source");
      //this.source.debug();
      return Attr.failed;
    }
    if (src.status == Attr.locked) return src.status;
    if (!dest) {
      this.debug("AAA:349 -- Cannot move. Empty destination");
      //this.destination.debug();
      return Attr.failed;
    }
    if (!(src.privilege & permission.modify)) {
      this.debug("AAA:253 -- Cannot move. Source read only");
      return Attr.permission_denied;
    }
    if (!(dest.privilege & permission.write)) {
      this.debug("AAA:357 -- Cannot move. Source read only");
      return Attr.permission_denied;
    }
    return Attr.ok;
  }

  /**
   *
   * @param {*} node
   */
  localFile(arg, mode = Attr.exists, event) {
    let filepath;
    if (!arg) return null;
    if (isString(arg)) {
      filepath = arg;
    } else {
      filepath = arg.filepath;
    }
    if (!filepath || /^ +$/.test(filepath)) {
      if (arg.filename) {
        filepath = join("/", arg.filename);
      }
    }
    let re = new RegExp("^" + this.workingRoot.unixPath());
    let realpath;
    if (re.test(filepath.unixPath())) {
      realpath = normalize(filepath);
    } else {
      realpath = join(this.workingRoot, normalize(filepath));
    }

    let filename = basename(realpath);
    let ext = extname(filename).replace(/^\.+/, "");

    filepath = realpath.unixPath().replace(re, "") || "/";
    let def = { realpath, filepath, filename, ext }
    let stat;
    switch (mode) {
      case Attr.exists:
      case Attr.exist:
        return existsSync(realpath);

      case Attr.node:
        try {
          stat = statSync(realpath, { throwIfNoEntry: false });
          if (!stat) return def;
        } catch (e) {
          return def;
        }
        stat.filename = filename;
        stat.filepath = filepath;
        stat.realpath = realpath;
        stat.inode = stat.ino;
        stat.filesize = stat.size;
        stat.ext = ext;
        stat.ctime = Math.round(stat.mtimeMs / 1000);
        stat.mtime = Math.round(stat.mtimeMs / 1000);

        if (stat.isDirectory()) {
          stat.nodetype = Attr.folder;
        } else {
          stat.nodetype = Attr.file;
        }
        return stat;

      case Attr.stat:
        try {
          stat = statSync(realpath, { throwIfNoEntry: false });
          if (!stat) return def;
        } catch (e) {
          return def;
        }
        stat.filename = filename;
        stat.filepath = filepath;
        stat.realpath = realpath;
        stat.inode = stat.ino;
        stat.filesize = stat.size;
        stat.ext = ext;
        stat.miniData = {
          inode: stat.ino,
          atimeMs: stat.atimeMs,
          birthtimeMs: stat.birthtimeMs,
          ctimeMs: stat.mtimeMs,
          mtimeMs: stat.mtimeMs,
          filesize: stat.size,
        };
        stat.data = {
          ...stat.miniData,
          mtime: Math.floor(stat.mtimeMs / 1000),
          ctime: Math.floor(stat.ctimeMs / 1000),
        };
        if (stat.isDirectory()) {
          stat.nodetype = Attr.folder;
        } else {
          stat.nodetype = Attr.file;
        }
        return stat;

      case Attr.absolute:
        if (!existsSync(realpath)) return null;
        return normalize(realpath);

      case Attr.location:
        return normalize(realpath);

      case Attr.relative:
        return filepath;

      case Attr.mkdir:
        if (!existsSync(realpath)) {
          if (event) {
            setPending(Attr.created, event, filepath);
          } else {
            setPending(Attr.created, filepath, filepath);
          }
          mkdirSync(realpath, {
            recursive: true,
          });
        }
        return realpath;

      case Attr.delete:
        let safe_dir = new RegExp(`^${this.workingRoot.unixPath()}`);
        if (!safe_dir.test(realpath.unixPath())) {
          this.debug("WARN: attempt to access files outside of working dir");
          return false;
        }
        //let shortpath = realpath.unixPath().replace(re, "") || "/";
        stat = statSync(realpath, { throwIfNoEntry: false });
        if (!stat) return false;
        setPending(Attr.removed, stat, filepath);
        if (stat.isDirectory()) {
          this.walkDir(realpath).then((items) => {
            //this.debug("AAA:655 -- WALK", items);
            for (let item of items) {
              let { filepath, stat } = item;
              setPending(Attr.removed, stat, filepath);
            }
            rmSync(realpath, { recursive: true });
          })
        } else {
          rmSync(realpath);
        }
        return realpath;

      default:
        return existsSync(realpath);
    }
  }

  /**
   *
   */
  async walkDir(dirname) {
    let items = [];

    const walk = async (dir) => {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          if (IGNORED.test(file)) continue;
          let realpath = resolve(dir, file);
          let stat = statSync(realpath);
          stat.miniData = {
            inode: stat.ino,
            atimeMs: stat.atimeMs,
            birthtimeMs: stat.birthtimeMs,
            ctimeMs: stat.mtimeMs,
            mtimeMs: stat.mtimeMs,
            filesize: stat.size,
          };
          let filepath = this.localFile(realpath, Attr.relative);
          items.push({ filepath, realpath, stat });
          if (stat.isDirectory()) await walk(realpath);
        }
      } catch (err) {
        console.trace();
        console.error(err);
      }
    };
    await walk(dirname);
    return items;
  }

  /**
   * Implement cp -R.
   * @param {string} src  The path to the thing to copy.
   * @param {string} dest The path to the new copy.
   */
  copyDir(source, destination, evt) {
    let self = this;
    async function __copyDir(src, dest) {
      //self.debug("AAAA:352", src, dest)
      var exists = existsSync(src);
      var stats = exists && statSync(src);
      var isDirectory = exists && stats.isDirectory();
      if (isDirectory) {
        self.semaphore.lock({ ...evt, filepath: dest }, "folder.created");
        mkdirSync(dest);
        const items = await readdir(src);
        for (const item of items) {
          await __copyDir(join(src, item), join(dest, item));
        }
      } else {
        self.semaphore.lock({ ...evt, filepath: dest }, "file.created");
        copyFileSync(src, dest);
      }
    }
    return __copyDir(source, destination);
  }

  /**
   *
   * @param {*} data
   */
  sendMediaState(data, tag = "*") {
    if (global.webContents) webContents.send(`mfs-media-state:${tag}`, data);
  }

  /**
   *
   * @param {*} data
   */
  sendMediaActivity(data) {
    webContents.send("mfs-activity", data);
  }

  /**
   *
   */
  extendMedia(media, data, more) {
    if (!data) {
      media.nid = null;
      media.hub_id = null;
      media.pid = null;
      return;
    }
    let attr = [Attr.nid, Attr.hub_id, Attr.pid, Attr.mtime, Attr.ctime];
    if (isArray(more)) {
      attr = attr.concat(more);
    } else if (isString(more)) {
      attr.push(more);
    }
    for (var k of attr) {
      if (data[k]) media[k] = data[k];
    }
    return media;
  }

  /**
   *
   * @param {*} media
   */
  getParent(media) {
    if (!media || !media.filepath) {
      return null;
    }

    let filepath = dirname(media.filepath).unixPath();
    filepath = filepath.unixPath();
    let parent = this.remote.row(
      { filepath, nid: media.pid },
      Attr.filepath,
      Attr.nid
    );
    //this.debug("AAA:758", Account.user.get(Attr.hub_id), parent);
    if (parent) {
      if (parent.filetype == Attr.hub) {
        parent.hub_id = parent.nid;
      }
      return parent;
    }
    let level = 0;
    while (!parent && filepath != "/") {
      filepath = dirname(filepath).unixPath();
      parent = this.remote.row({ filepath }, Attr.filepath);
      if (parent) {
        if (parent.filetype == Attr.hub) {
          parent.hub_id = parent.nid;
        }
        return parent;
      }
      level++;
      if (level > 256) {
        this.debug("AAA:785 -- TOO DEEP recursion", filepath);
        filepath = "/";
      }
    }
    //this.debug("AAA:784", filepath);
    if (filepath == "/") {
      return {
        filepath,
        ownpath: filepath,
        privilege: permission.owner,
        home_id: this.home_id,
        nid: this.home_id,
        hub_id: this.get(Attr.hub_id),

      };
    }
    return parent;
  }

  /**
   * 
   * @param {*} evt 
   * @returns 
   */
  isNodeUpToDate(evt) {
    let sql = `SELECT r.* FROM remote r 
      INNER JOIN hash h ON r.filepath=h.filepath 
      INNER JOIN fsnode f ON h.inode=f.inode
      WHERE (r.nid=? OR f.filepath=?) AND r.md5Hash=h.md5`;
    return this.db.getRow(sql, evt.nid, evt.filepath);
  }

  /**
   * 
   * @param {*} evt 
   * @returns 
   */
  isNodeDateSynced(evt) {
    let sql = `SELECT r.* FROM remote r INNER JOIN local l ON r.nid=l.nid 
      INNER JOIN fsnode f ON f.filepath=l.filepath AND l.inode=f.inode
      WHERE r.nid=? OR f.filepath=?`;
    return this.db.getRow(sql, evt.nid, evt.filepath);
  }

  /**
   *
   */
  removePendingEntity(table, e) {
    let sql;
    console.log("TO BE REVIEWED: removePendingEntity", table, e);
    return
    function deleteNode(t) {
      if (/^remote/.test(t)) {
        return `DELETE FROM ${t} WHERE nid=? OR filepath=?`;
      }
      if (/^local_created$/.test(t)) {
        return `DELETE FROM ${t} WHERE inode=? OR filepath=?`;
      }
      if (/^local_/.test(t)) {
        return `DELETE FROM ${t} WHERE inode=? OR nid=? OR filepath=?`;
      }
    }
    const local_tables = [
      "local_deleted",
      "local_moved",
      "local_renamed",
      "local_changed",
    ];
    const remote_tables = [
      "remote_deleted",
      "remote_moved",
      "remote_renamed",
      "remote_changed",
    ];
    switch (table) {
      case "local_*":
        this.db.run(deleteNode("local_created"), e.inode, e.filepath);
        sql = [];
        for (let t of local_tables) {
          sql.push(deleteNode(t));
        }
        this.db.serialize(sql, e.inode, e.nid, e.filepath);
        break;
      case "local_created":
        this.db.run(deleteNode(table), e.inode, e.filepath);
        break;
      case "local_deleted":
      case "local_moved":
      case "local_renamed":
      case "local_changed":
        this.db.run(deleteNode(table), e.inode, e.nid, e.filepath);
        break;
      case "remote_*":
        sql = [];
        for (let t of remote_tables) {
          sql.push(deleteNode(t));
        }
        this.db.serialize(sql, e.nid, e.filepath);
        break;
      case "remote_deleted":
      case "remote_moved":
      case "remote_renamed":
      case "remote_changed":
        this.db.run(deleteNode(table), e.nid, e.filepath);
        break;
      default:
        return;
    }

    function deleteGroup(t) {
      return `DELETE FROM ${t} WHERE regexp('^' || ?, filepath)`;
    }

    if (/^(hub|folder)$/.test(e.filetype)) {
      switch (table) {
        case "local_created":
        case "local_deleted":
        case "local_moved":
        case "local_renamed":
        case "local_changed":
        case "remote_deleted":
        case "remote_moved":
        case "remote_renamed":
        case "remote_changed":
          this.db.run(deleteGroup(table), escapePath(e.filepath));
          break;
        case "remote_*":
          sql = [];
          for (let t of remote_tables) {
            sql.push(deleteGroup(t));
          }
          this.db.serialize(sql, escapePath(e.filepath));
          break;
        case "local_*":
          this.db.run(deleteGroup("local_created"), escapePath(e.filepath));
          sql = [];
          for (let t of local_tables) {
            sql.push(deleteGroup(t));
          }
          this.db.serialize(sql, escapePath(e.filepath));
          break;
        default:
          return;
      }

    }
  }

  /**
   *
   */
  clearPendingEntities() {
    let tables = [
      "local_changed",
      "local_created",
      "local_deleted",
      "local_moved",
      "local_renamed",
      "local",
      "remote_changed",
      "remote_deleted",
      "remote_moved",
      "remote_renamed",
      "remote_tmp",
    ];

    let seq = [];
    for (let table of tables) {
      seq.push(`DELETE FROM ${table}`);
    }
    this.db.serialize(seq);
  }



}
module.exports = mfsUtils;
