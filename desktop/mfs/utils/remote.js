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

const _ = require("lodash");
const _a = require("../../lex/attribute");
const { escapePath } = require("../../utils/misc");
const { dirname, join, extname, basename, normalize } = require("path");

/**
 *
 * @param {*} col
 * @returns
 */
function IGNORED(col = _a.filepath) {
  return `SELECT l.${col} FROM local l INNER JOIN ignore i ON l.filepath REGEXP ('^.*' || i.filepath || '.*$')`;
}

const { uniqueFilename } = require("../../utils/misc");
module.exports = function (worker) {
  const db = worker.db;

  /**
   *
   */
  function prepare() {
    let seq = [
      `DELETE FROM remote`,
    ];
    db.serialize(seq);
    return true;
  }

  /**
   *
   */
  function resetTables() {
    let sql = [
      "remote",
    ];
    let seq = sql.map((i) => {
      return `DELETE FROM ${i}`;
    });
    db.serialize(seq);
  }

  /**
   * 
   */
  function initChangesList() {
    let sql = `UPDATE remote SET changed=c.changed FROM 
      (SELECT IIF(h.md5 = r.md5Hash, 0, 1) changed, nid 
        FROM hash h INNER JOIN remote r on h.filepath=r.filepath
      ) AS c WHERE c.nid=remote.nid`;
    return db.run(sql);
  }

  /**
   *
   */
  function getChangesList(opt) {
    let sql = `SELECT r.*, ROUND(h.mtimeMs/1000) locMtime FROM remote r 
      INNER JOIN hash h using(filepath) WHERE changed AND effective`;
    return db.getRows(sql);
  }

  /**
  * 
  */
  function getNewEntities() {
    let sql = `SELECT * FROM remote WHERE effective AND pid!='0' AND 
      filepath NOT IN (SELECT filepath FROM fsnode WHERE effective)`;
    let rows = db.getRows(sql) || [];
    return rows;
  }


  function created() {
    // All remote created are automatically the reference
    return [];
  }

  function deleted() {
    //let sql = `SELECT * FROM remote_deleted`;
    let sql = `SELECT r.* FROM remote_tmp r INNER JOIN fsnode f 
    ON f.filepath=r.filepath WHERE r.nid NOT IN (SELECT nid FROM remote)`;
    let items = db.getRows(sql);
    return items;
  }

  /**
   *
   * @returns
   */
  function renamed() {
    let sql = `SELECT r.*, l.filepath src, r.filepath dest, 
      'remote' bound, l.filename src_name, l.ext src_ext, 
      l.filename dest_name, r.ext dest_ext FROM remote_renamed r 
      INNER JOIN local l ON l.nid=r.nid `;
    let items = db.getRows(sql);
    for (let item of items) {
      item.src = join(dirname(item.src), `${item.src_name}.${item.src_ext}`).unixPath();
      item.filepath = item.src;
    }
    return items;
  }

  /**
   *
   * @returns
   */
  function moved() {
    //return [];
    let sql = `SELECT r.*, l.filepath src, r.filepath dest, 
      'remote' bound, l.filename src_name, l.ext src_ext, 
      l.filename dest_name, l.ext dest_ext FROM remote_moved r 
      INNER JOIN local l ON r.nid=l.nid`;
    let items = db.getRows(sql);
    return items;
  }

  /**
   *
   * @returns
   */
  function changed() {
    let sql = `
      SELECT r.*, l.mtime localTime, r.mtime remoteTime FROM remote r 
        INNER JOIN local l ON r.nid=l.nid 
        JOIN hash h ON r.filepath=h.filepath 
        WHERE 
        l.mtime<r.mtime AND h.md5!=r.md5Hash 
        AND l.filetype NOT IN ('hub', 'folder')`;
    let items = db.getRows(sql);
    return items;
  }


  /**
   *
   * @returns
   */
  function ignored() {
    return [];

  }

  /**
   *
   */
  function parent(e) {
    let sql = `SELECT * FROM remote WHERE nid=? OR filepath=?`;
    return db.getRow(sql, e.pid, dirname(e.filepath).unixPath());
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  function show_node(e) {
    let sql;
    if (e.filetype == _a.hub) {
      sql = `SELECT * FROM remote WHERE dirname(filepath)=?`;
      return db.getRows(sql, e.filepath);
    }
    sql = `SELECT * FROM remote WHERE pid=?`;
    //console.log("AAA:46 -- ", sql, e.nid);
    return db.getRows(sql, e.nid);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  function showDir(e) {
    let sql;
    sql = `SELECT * FROM remote WHERE regexp('^' || ?, filepath)`;
    //console.log("AAA:52 -- ", sql, e.filepath);
    return db.getRows(sql, escapePath(e.filepath));
  }

  /**
   * 
   * @returns 
   */
  function show_root() {
    let sql = `SELECT * FROM remote WHERE dirname(filepath)='/'
        AND filepath NOT IN (
          SELECT filepath FROM local WHERE inode IS NOT NULL
        )`;
    return db.getRows(sql);
  }

  /**
   * 
   * @returns 
   */
  function unsynced() {
    let sql = `SELECT * FROM remote WHERE synced=0 AND effective ORDER BY id ASC`;
    return db.getRows(sql);
  }



  /**
   * 
   * @param {*} e 
   * @returns 
   */
  function exists(e) {
    let sql = `SELECT count(*) AS count FROM remote WHERE filepath=?`;
    let r = db.getRow(sql, e.filepath) || { count: 0 };
    return r.count;
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  function touch(e) {
    if (!e.mtime) {
      console.error("AAA:98 -- Require mtime to touch");
      return;
    }
    let sql = `UPDATE remote SET mtime=? WHERE nid=? OR filepath=?`;
    //console.log("AAA:93", sql, e.filepath)
    return db.run(sql, e.mtime, e.nid, e.filepath);
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  function deleteDirectory(e) {
    let sql = `DELETE FROM remote WHERE regexp('^' || ?, filepath)`;
    return db.run(sql, escapePath(e.filepath));
  }

  /**
   * 
   * @param {*} e 
   */
  function retrieveData(e) {
    let sql = `SELECT r.* FROM remote r INNER JOIN local l ON r.nid = l.nid 
        WHERE inode=?`;
    db.getRow(sql, e.inode);
  }

  /**
   *
   * @param {*} node
   * @returns
   */
  function rename(node) {
    let sql = `SELECT * FROM remote WHERE nid=?`;
    let old = db.getRow(sql, node.nid);
    if (!old) return;
    let old_path = old.filepath;
    let new_path = node.filepath;
    if (old_path == new_path || new_path === "/" || !new_path) return;
    let re = new RegExp(extname(new_path) + "$");
    let filename = basename(new_path).replace(re, "");
    let new_ownpath = join(dirname(old.ownpath), basename(new_path));
    if (/^(hub|folder)$/.test(node.filetype)) {
      sql = `UPDATE remote 
          SET filepath=replace_path('^'||?, filepath, ?) WHERE regexp('^'|| ?, filepath)`;
      db.run(sql, old_path, new_path, escapePath(old_path));

      sql = `UPDATE remote 
          SET ownpath=replace_path('^'||?, ownpath, ?) WHERE regexp('^'|| ?, ownpath)`;
      db.run(sql, old.ownpath, new_ownpath, escapePath(old.ownpath));
    }

    try {
      sql = `UPDATE  remote SET filepath=?, ownpath=?, filename=?, ext=?, mtime=? WHERE nid=?`;
      db.run(
        sql,
        new_path,
        new_ownpath,
        filename,
        node.ext,
        node.mtime,
        node.nid
      );
    } catch (e) {
      sql = `SELECT * FROM remote WHERE filepath=?`;
      let new_node = db.getRow(sql, new_path);
      if (new_node && new_node.nid != node.nid) {
        sql = `UPDATE remote SET nid=?, ownpath=?, filename=?, ext=?, mtime=? WHERE filepath=?`;
        dbrun(sql, node.nid, new_ownpath, filename, node.ext, node.mtime, new_path);
      } else {
        console.error("FAILED TO RENAME", e);
      }

    }
    return old;
  }

  /**
   * 
   * @returns 
   */
  function ignoreHubs() {
    let sql = `REPLACE INTO ignore SELECT filepath, null, nid, hub_id, pid, '' 
        FROM remote WHERE filetype=?`;
    return db.run(sql, _a.hub);
  }

  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function containsHubs(node) {
    let sql = `SELECT * FROM remote 
        WHERE filetype='hub' AND  regexp('^' || ? || '/', filepath)`;
    return db.getRow(sql, node.filepath);
  }

  /**
   * 
   * @param {*} src 
   * @param {*} dest 
   * @returns 
   */
  function moveNode(src, dest) {
    let sql = `SELECT nid, pid FROM remote WHERE filepath=?`;
    let { nid, pid } = db.getRow(sql, dest.filepath) || {};
    // The target name already exists on remote side, event though it doesn't exist on local side
    if (nid) {
      sql = `SELECT filename FROM remote WHERE pid=?`;
      let siblings = db.getRows(sql, pid);
      let item = uniqueFilename(_.values(siblings), dest.filepath);
      return item;
    }
    sql = `UPDATE remote SET filepath=?, mtime=?, pid=? WHERE nid=?`;
    //console.log("AAA:118", sql, dest.filepath, dest.mtime, dest.nid, src.nid);
    return db.run(sql, dest.filepath, dest.mtime, dest.nid, src.nid);
  }

  /**
   * 
   * @param {*} e 
   */
  function deleteNode(e) {
    let sql = `DELETE FROM remote WHERE filepath=? OR nid=?`;
    db.run(sql, e.filepath, e.nid);
    if (filepath == "/" || e.filetype == "system") return;
    if (/hub|folder/.test(e.filetype)) {
      sql = `DELETE FROM remote WHERE regexp('^' || ?, filepath)`;
      db.run(sql, escapePath(e.filepath));
    }
  }

  /**
   * 
   */
  function ensureOwnpath(evt = {}) {
    let { filepath, nid } = evt;
    if (!filepath && !nid) {
      console.log("Invalid data", evt);
      return '/';
    }
    filepath = filepath.unixPath();
    let sql = `SELECT * FROM remote WHERE filepath=? OR nid=?`;
    let r = db.getRow(sql, filepath, nid) || {};
    //console.log("AAA:378", r);
    if (r.ownpath) return evt;
    let path = dirname(filepath);
    while (!["/", ""].includes(path)) {
      r = db.getRow(sql, path, "");
      //console.log("AAA:383", r, { path, filepath });
      if (r) {
        if (r.hub_id) evt.hub_id = r.hub_id;
        if (r.home_id) evt.home_id = r.home_id;
        if (r.nid) evt.nid = r.nid;
        if (r.ownpath && r.ownpath == '/') {
          let node = db.getRow(sql, r.filepath, "");
          //console.log("AAA:387", node)
          let re = new RegExp('^' + r.filepath);
          path = filepath.replace(re, "")
          evt.ownpath = path;
          evt.filepath = join(r.filepath, path)
          evt.nid = null;
          evt.home_id = node.home_id;
          evt.pid = node.home_id;
          evt.hub_id = node.hub_id;
          return evt
        }
      }
      path = dirname(path).unixPath();
    }
    if (!evt.hub_id) {
      let { home_id, nid, hub_id } = db.getRow(`SELECT * from remote WHERE filepath=?`, '/')
      evt.hub_id = hub_id;
      evt.home_id = home_id;
      evt.nid = nid;
    }
    if (filepath) filepath = normalize(filepath);
    return { ...evt, ownpath: filepath };
  }

  /**
   * 
   */
  function getHubData(evt = {}) {
    let { filepath } = evt;
    if (!filepath) {
      console.log("EEE:426 -- getHubData requires filepath", evt);
      return;
    }
    let sql = `SELECT * FROM remote WHERE filepath=?`;
    let r = db.getRow(sql, filepath);
    //console.log("AAA:394", r);
    if (r && r.hub_id) return r;
    filepath = dirname(filepath).unixPath();
    while (!["/", ""].includes(filepath)) {
      r = db.getRow(sql, filepath);
      //console.log("AAA:399", r);
      if (r && r.hub_id) {
        return r;
      }
      filepath = dirname(filepath).unixPath();
    }
    sql = `SELECT * FROM remote WHERE filepath=?`;
    r = db.getRow(sql, "/");
    return r;
  }

  return {
    initChangesList,
    changed,
    containsHubs,
    created,
    deleted,
    deleteDirectory,
    deleteNode,
    exists,
    getHubData,
    getChangesList,
    getNewEntities,
    ensureOwnpath,
    ignored,
    ignoreHubs,
    moved,
    moveNode,
    parent,
    prepare,
    rename,
    renamed,
    resetTables,
    retrieveData,
    show_node,
    show_root,
    showDir,
    touch,
    unsynced,
  };
};
