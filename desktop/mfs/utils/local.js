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
const { dirname, join, extname, basename } = require("path");
const { escapePath } = require("../../utils/misc");
const _a = require("../../lex/attribute");

module.exports = function (worker) {
  const db = worker.db;

  /**
 *
 */
  function prepare() {
    let seq = [
      `DELETE FROM local`
    ];
    db.serialize(seq);
    return true;
  }

  /**
   * 
   */
  function syncFromRemote() {
    let sql = `REPLACE INTO local SELECT r.filepath, f.inode, r.nid, r.hub_id, 
      r.pid, r.synced, r.effective, r.filename, r.filetype, r.filesize, r.ext, f.ctimeMs, f.birthtimeMs, 
      f.ctimeMs, f.mtimeMs, r.ctime, r.mtime FROM remote r INNER JOIN fsnode f ON 
      f.filepath=r.filepath`;
    db.serialize([sql]);
  }
  
  /**
   *
   */
  function resetTables() {
    let sql = [
      "local",
      "local_deleted",
      "local_moved",
      "local_renamed",
      "local_changed",
      "local_tmp",
    ];
    let seq = sql.map((i) => {
      return `DELETE FROM ${i}`;
    });
    db.serialize(seq);
  }

  /**
   *
   * @param {*} node
   * @returns
   */
  function rename(node) {
    let sql = `SELECT * FROM local WHERE nid=?`;
    let old = db.getRow(sql, node.nid);
    if (!old) return;
    let old_path = old.filepath;
    let new_path = node.filepath;
    if (old_path == new_path || new_path === "/" || !new_path) return;
    let re = new RegExp(extname(new_path) + "$");
    let filename = basename(new_path).replace(re, "");
    if (/^(hub|folder)$/.test(node.filetype)) {
      sql = `UPDATE local 
        SET filepath=replace_path('^'||?, filepath, ?) WHERE regexp('^'|| ?, filepath)`;
      db.run(sql, old_path, new_path, escapePath(old_path));
    }
    try {
      sql = `UPDATE local SET filepath=?, filename=?, ext=?, mtime=? WHERE nid=?`;
      db.run(sql, new_path, filename, node.ext, node.mtime, node.nid);
    } catch (e) {
      /** Handle duplicated entries */
      sql = `SELECT * FROM local WHERE filepath=?`;
      let new_node = db.getRow(sql, new_path);
      if (new_node && new_node.nid != node.nid) {
        sql = `UPDATE local SET nid=?, filename=?, ext=?, mtime=? WHERE filepath=?`;
        db.run(sql, node.nid, filename, node.ext, node.mtime, new_path);
      } else {
        console.error("FAILED TO RENAME", e);
      }
    }
    return old;
  }

  /**
   *
   */
  function buildChangesList() {
    let seq = [
      `DELETE FROM local_tmp`,
      `DELETE FROM local_deleted`,
      `DELETE FROM local_created`,
      `DELETE FROM local_renamed`,
      `REPLACE INTO local_tmp SELECT * FROM local`,

      `REPLACE INTO local_deleted SELECT t.* FROM local_tmp t
        WHERE t.nid NOT IN (SELECT nid FROM remote) 
        AND t.nid NOT IN (SELECT nid FROM remote_deleted)
        AND t.filetype != 'system' 
        AND t.filetype != '/'
        AND t.filepath NOT IN (SELECT filepath FROM fsnode)`,

      `DELETE FROM local WHERE filetype != 'system'
        AND filepath NOT IN (SELECT filepath FROM fsnode)`,

      `REPLACE INTO local SELECT 
        f.filepath, f.inode, nid, hub_id, pid, f.filename, l.filetype, 
        l.md5Hash, l.filesize, f.ext, l.atimeMs, f.birthtimeMs, f.ctimeMs, f.mtimeMs, 
        l.ctime, l.mtime 
        FROM fsnode f INNER JOIN local l ON l.inode=f.inode WHERE l.filetype != 'system'`,

      `REPLACE INTO local_created SELECT * FROM fsnode WHERE
        nodetype != 'system' AND 
        filepath NOT IN (
          SELECT filepath FROM remote
        )`,


      `REPLACE INTO local_changed SELECT l.* FROM local l 
        INNER JOIN local_tmp t ON l.inode=t.inode  
        INNER JOIN remote r ON r.nid=l.nid 
        WHERE l.filetype NOT IN('system', 'hub', 'folder') 
        AND r.nid NOT IN (SELECT nid FROM trash) AND
        (l.mtimeMs > t.mtimeMs AND l.md5Hash != r.md5Hash)
        `,

      `REPLACE INTO local_renamed SELECT  
        f.filepath, f.inode, r.nid, r.hub_id, r.pid, f.filename, r.filetype, 
        r.md5Hash, l.filesize, f.ext, l.atimeMs, l.birthtimeMs, l.ctimeMs, l.mtimeMs, 
        l.ctime, l.mtime
        FROM fsnode f INNER JOIN local_tmp l ON l.inode=f.inode
        INNER JOIN remote r ON r.nid=l.nid   
        WHERE (f.filename != r.filename OR f.ext != r.ext)
        AND r.nid NOT IN (SELECT nid FROM trash)
        AND l.pid=r.pid AND l.filetype NOT IN('system')`,

      `REPLACE INTO local_moved SELECT  
        f.filepath, f.inode, r.nid, r.hub_id, r.pid, f.filename, r.filetype, 
        r.md5Hash, l.filesize, f.ext, l.atimeMs, l.birthtimeMs, f.ctimeMs, f.mtimeMs, 
        l.ctime, l.mtime
        FROM fsnode f INNER JOIN local_tmp l ON l.inode=f.inode
        INNER JOIN remote r ON r.nid=l.nid 
        WHERE r.pid !=l.pid
        AND f.filename = r.filename AND f.ext == r.ext
        AND r.nid NOT IN (SELECT nid FROM trash)
        AND l.filetype NOT IN('system')`,
      `DELETE FROM local_created WHERE filepath IN (
        SELECT f.filepath FROM fsnode f INNER JOIN local l 
        ON f.filepath REGEXP ('^.*' || l.filepath || '.*$')
      )`,
      `DELETE FROM local_created WHERE filepath IN (
        SELECT l.filepath FROM remote r INNER JOIN local_created l 
        ON l.filepath REGEXP ('^' || r.filepath || '.*$')
      )`,

      `DELETE FROM local_created WHERE inode IN 
        (SELECT inode FROM local_renamed 
          UNION SELECT inode FROM local_moved
          UNION SELECT inode FROM local_deleted
        )`,
    ];

    for (let i in seq) {
      seq[i] = seq[i].replace(/[ \n]+/, " ");
    }
    db.serialize(seq);
  }

  /**
   *
   * @returns
   */
  function content() {
    let sql = `SELECT * FROM local WHERE filetype!='system'`;
    return db.getRows(sql);
  }

  /**
   *
   * @returns
   */
  function deleted() {
    let seq = [
      `DELETE FROM local_deleted WHERE nid NOT IN 
      (SELECT nid FROM remote)`,
      `REPLACE INTO local_deleted SELECT * FROM local_tmp WHERE inode NOT IN 
      (SELECT inode FROM local l INNER JOIN remote r ON r.nid=l.nid)`
    ];
    db.serialize(seq);
    return db.getRows(
      `SELECT * FROM local_deleted`
    );
  }

  /**
   *
   * @returns
   */
  function created() {
    //let sql = `SELECT * FROM local_created `;
    let sql = `SELECT * FROM fsnode WHERE nodetype!='system' 
      AND filepath NOT IN (SELECT filepath FROM local)`;
    let res = [];
    let items = db.getRows(sql);
    let types = require("../../lex/mimetype.json");
    for (let item of items) {
      try {
        item.filetype = types[item.ext].category || item.nodetype;
      } catch (e) {
        item.filetype = item.nodetype;
      }
      let state = this.syncOpt.getNodeState(item);
      if (state == 1) res.push(item);
    }
    return res; //select(items);
  }

  /**
   *
   * @returns
   */
  function renamed() {
    let sql = `SELECT l.*, r.filepath src, l.filepath dest, 
    'local' bound, r.filename src_name, r.ext src_ext, 
    l.filename dest_name, l.ext dest_ext FROM local_renamed l 
    INNER JOIN remote r on r.nid=l.nid 
    AND r.mtime = l.mtime WHERE l.filepath NOT IN (
      SELECT filepath FROM local
    )`;
    let items = db.getRows(sql);
    for (let item of items) {
      item.src = join(dirname(item.src), `${item.src_name}.${item.src_ext}`);
      item.filepath = item.src;
    }
    return items;
  }

  /**
   *
   * @returns
   */
  function moved() {
    let sql = `SELECT l.*, r.filepath src, l.filepath dest, 
    'local' bound, r.filename src_name, r.ext src_ext, 
    l.filename dest_name, l.ext dest_ext FROM 
      local_moved l INNER JOIN remote r on r.nid=l.nid 
      WHERE l.mtime >= r.mtime`;
    let items = db.getRows(sql);
    return items;
  }

  /**
   *
   * @returns
   */
  function changed() {
    let sql = `SELECT * FROM local_changed`;
    //AND l.filepath NOT IN (${FS_IGNORED})`;
    let items = db.getRows(sql);
    return items;
  }

  /**
   *
   * @returns
   */
  function ignored() {
    let sql = `SELECT * FROM local WHERE filepath IN (
      SELECT filepath FROM ignore WHERE bound='local'
    ) AND inode IS NOT NULL`;
    return db.getRows(sql);
  }

  /**
   *
   */
  function changeRate() {
    let sql = `SELECT (max(f.mtimeMs) - min(f.mtimeMs )) delta, 
    count(*) count FROM local_changed l INNER JOIN fsnode f ON 
  l.filepath=f.filepath WHERE f.mtimeMs != l.mtimeMs AND 
  l.filetype NOT IN ('hub', 'folder')`;
    let r = db.getRow(sql);
    if (!r || r.count <= 1) return 0;
    //console.log("AAAA:74", r);
    return (1000 * r.count) / r.delta;
  }

  /**
   *
   */
  function syncRatio() {
    let sql = `select count(*) items, sum(filesize) size FROM remote
    WHERE isalink=0 OR filetype='hub'`;
    let r = db.getRow(sql);
    sql = `select count(*) items, sum(filesize) size FROM local`;
    let l = db.getRow(sql);
    //console.log("AAA:83", r, l);
    if (!r || !l || !r.size) return 0;
    return (100 * l.size) / r.size;
  }

  /**
   *
   * @param {*} e
   * @param {*} stat
   * @param {*} maiden
   * @returns
   */
  function bindEntity(e) {
    let stat = worker.localFile(e, _a.stat);
    if (!e.nid) {
      let sql = `SELECT * FROM remote WHERE filepath=?`;
      let r = db.getRow(sql, e.filepath);
      e = { ...e, ...r };
    }
    if (stat && stat.inode) {
      e.atimeMs = stat.atimeMs;
      e.ctimeMs = stat.ctimeMs;
      e.mtimeMs = stat.mtimeMs;
      e.filesize = stat.filesize;
      e.inode = stat.inode;
      try {
        db.putInToTable("local", e);
      } catch (e) {
        console.log("ERROR CAUGHT");
        console.log(e);
      }
    }
  }

  /**
   *
   * @param {*} e
   * @param {*} stat
   * @param {*} maiden
   * @returns
   */
  function newNode(e, stat, maiden = 0) {
    if (!stat) return;
    e.atimeMs = stat.atimeMs;
    e.ctimeMs = stat.ctimeMs;
    e.mtimeMs = stat.mtimeMs;
    e.filesize = stat.filesize;
    let sql = `SELECT * FROM remote WHERE filepath=?`;
    let rem = db.getRow(sql, e.filepath) || {};
    // worker.debug("AAA:124 -- NEW NODE", sql, e, rem);
    if (rem.hub_id) {
      e.ctime = rem.ctime;
      e.mtime = rem.mtime;
      e.filetype = rem.filetype;
      e.pid = rem.pid;
      e.hub_id = rem.hub_id;
      e.nid = rem.nid;
    } else {
      e.ctime = Math.round(stat.ctimeMs / 1000);
      e.mtime = Math.round(stat.mtimeMs / 1000);
    }
    // worker.debug("AAA:136 -- getParent");
    if (!e.pid || !e.hub_id) {
      let parent = worker.getParent(e);
      e.pid = parent.home_id;
      e.hub_id = parent.hub_id;
      //e.nid = null;
      if (parent.filepath == dirname(e.filepath)) {
        e.pid = parent.nid;
      }
      //worker.debug("AAA:76", parent,e);
    }

    if (maiden) e.nid = null; // New file. Doesn't have nid. Not yet exists on remote
    // worker.debug("AAA:148 -- NEW NODE", e);
    //console.trace();
    db.putInToTable("local", e);
  }

  function numberOfRows() {
    let sql = `SELECT count(*) count FROM local WHERE filetype!='system'`;
    let r = db.getRow(sql);
    //console.log("AAA:119 -- numberOfRows", r);
    return r.count || 0;
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  function unchanged(e) {
    let sql = `SELECT count(*) c FROM local l 
    INNER JOIN remote r ON l.nid=r.nid
    INNER JOIN fsnode f ON f.inode=l.inode 
    WHERE (r.mtime=l.mtime OR
    (r.md5Hash IS NOT NULL AND l.md5Hash IS NOT NULL AND r.md5Hash=l.md5Hash))
    AND (f.inode=? OR l.nid=? OR l.filepath=?)`;
    let r = db.getRow(sql, e.inode, e.nid, e.filepath) || { c: 0 };
    return r.c;
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  function getMfsEntity(e) {
    let sql = `SELECT count(*) c FROM local l 
    INNER JOIN remote r ON l.nid=r.nid
    INNER JOIN fsnode f ON f.filepath=l.filepath 
    WHERE (f.inode=? OR l.nid=? OR l.filepath=?)`;
    let r = db.getRow(sql, e.inode, e.nid, e.filepath) || { c: 0 };
    return r.c;
  }

  /**
   *
   * @param {*} nid
   * @returns
   */
  function mediaState(nid) {
    let sql = `SELECT DISTINCT(r.nid), CASE 
  WHEN l.filename!=r.filename THEN 'renamed' 
  WHEN l.pid!=r.pid THEN 'moved' 
  WHEN r.mtime > l.mtime THEN 'remote-change' 
  WHEN r.mtime < l.mtime THEN 'local-change' 
  ELSE '?' END state, l.filepath src, r.filepath dest
  FROM remote r INNER join local l on l.nid = r.nid WHERE r.nid=?`;
    return db.getRow(sql, nid);
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  function deleteDirectory(e) {
    let sql = `DELETE FROM local WHERE regexp('^' || ?, filepath)`;
    return db.run(sql, escapePath(e.filepath));
  }

  /**
   *
   * @param {*} src
   * @param {*} dest
   * @returns
   */
  function moveNode(src, dest) {
    let sql = `UPDATE local SET filepath=?, mtime=?, pid=? 
    WHERE nid=?`;
    //console.log("AAA:150", sql, dest.filepath, dest.mtime, dest.nid, src.nid);
    return db.run(sql, dest.filepath, dest.mtime, dest.nid, src.nid);
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  function showDir(e) {
    let sql;
    sql = `SELECT * FROM remote WHERE pid=?`;
    return db.getRows(sql, e.nid);
  }


  return {
    bindEntity,
    buildChangesList,
    changed,
    changeRate,
    content,
    created,
    deleted,
    deleteDirectory,
    getMfsEntity,
    ignored,
    mediaState,
    moved,
    moveNode,
    newNode,
    numberOfRows,
    prepare,
    rename,
    renamed,
    resetTables,
    showDir,
    syncFromRemote,
    syncRatio,
    unchanged,
  };
};
