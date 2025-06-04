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
const { escapePath } = require('../../utils/misc');
const { basename, extname } = require("path");

module.exports = function (worker) {
  const db = worker.db;

  /**
   * 
   */
  function rename(src = {}, dest = {}) {
    //console.log("AAA:8 fsnode.rename", {src, dest});
    let old_path = src.filepath;
    let new_path = dest.filepath;
    if (!new_path || !old_path) return;
    let re = new RegExp(extname(new_path) + "$");
    let filename = basename(new_path).replace(re, "");
    let ext = extname(new_path).replace(/^\.+/, "");
    let sql;
    if (/^(folder)$/.test(src.filetype)) {
      sql = `UPDATE fsnode 
        SET filepath=replace_path('^'||?, filepath, ?) WHERE regexp('^'|| ?, filepath)`;
      db.run(sql, old_path, new_path, escapePath(old_path));
    }
    sql = `UPDATE fsnode SET filepath=?, filename=?, ext=? WHERE filepath=?`;
    db.run(sql, new_path, filename, ext, old_path);
  }
  function move(src, dest) {
    let sql = `SELECT * FROM fsnode WHERE inode=? OR filepath=?`;
    let oldNode = db.getRow(sql, src.inode, src.filepath);
    if (!oldNode) return;
    let newNode = { ...oldNode, ...dest };
    db.putInToTable('fsnode', newNode);
    //console.log("AAA:30 fsnode.move", src, dest, oldNode, newNode);
    if (/^(hub|folder)$/.test(newNode.filetype)) {
      sql = `UPDATE fsnode SET filepath=replace_path('^'||?, filepath, ?)
      WHERE regexp('^'|| ?, filepath)`;
      db.run(sql, oldNode.filepath, newNode.filepath, escapePath(oldNode.filepath));
    }
  }

  /**
   * 
   * @param {*} filepath 
   * @returns 
   */
  function getChildrenInodes(filepath) {
    let sql = `SELECT * FROM fsnode WHERE REGEXP ('^'||?, filepath)`;
    let rows = db.getRows(sql, filepath) || [];
    return rows;
  }

  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function unsyncedChildren(node) {
    let { filepath, filetype, nid, pid } = node;
    if (filetype == "hub") {
      let sql = 'SELECT * FROM remote WHERE nid=?';
      let { home_id } = db.getRow(sql, nid) || {};
      pid = home_id;
    } else {
      pid = nid;
    }
    let sql = `
      SELECT * FROM fsnode WHERE  parentpath(filepath)=? 
      AND filepath NOT IN (SELECT filepath FROM remote WHERE pid=?)`
    let rows = db.getRows(sql, node.filepath, pid) || [];
    return rows;
  }

  function numberOfRows() {
    let sql = `SELECT count(*) count FROM fsnode WHERE nodetype!='system'`;
    let r = db.getRow(sql);
    return r.count || 0;
  }

  /**
   * 
   */
  function getNewEntities() {
    let sql = `SELECT * FROM fsnode WHERE effective AND 
      filepath NOT IN (SELECT filepath FROM remote WHERE effective)`;
    let rows = db.getRows(sql) || [];
    return rows;
  }

  /**
   * 
   */
  function getRemovedEntities() {
    let sql = `SELECT * FROM fsnode WHERE  
       inode NOT IN (SELECT inode FROM inodes) AND effective AND nodetype!='system'`;
    let rows = db.getRows(sql) || [];
    return rows;
  }

  /**
   * 
   */
  function initChangesList(){
    let sql = `UPDATE fsnode SET changed=c.changed, effective=c.effective FROM 
      (SELECT IIF(h.md5 = r.md5Hash, 0, 1) changed, effective, r.filepath 
        FROM hash h INNER JOIN remote r on h.filepath=r.filepath
      ) AS c WHERE c.filepath=fsnode.filepath`;
    return db.run(sql);
  }

  /**
    * 
    * @param {*} node 
    * @returns 
    */
  function purgeZombies() {
    db.run(`DELETE FROM fsnode WHERE inode NOT IN (SELECT inode FROM inodes)`);
  }

  return {
    rename, move, getChildrenInodes, unsyncedChildren, getRemovedEntities,
    purgeZombies, getNewEntities, numberOfRows, initChangesList
  }
}  
