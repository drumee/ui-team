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
const { escapePath } = require("../../utils/misc");
const { dirname } = require("path");
let Root = {};

const NodeSettings = `SELECT * FROM syncOpt WHERE filepath=?`;
module.exports = function (worker) {
  const db = worker.db;

  /**
   * 
   * @param {*} filepath 
   * @returns 
   */
  function getNode(filepath) {
    return db.getRow(NodeSettings, filepath) || {}
  }

  /**
   * 
   * @returns 
   */
  function initialize() {
    let { c } = db.getRow("SELECT count(*) c FROM syncOpt") || { c };
    if (!c) {
      Root = {
        effective: 0,
        mode: Attr.onTheFly,
        direction: Attr.duplex,
        filepath: '/'
      }
      db.putInToTable('syncOpt', Root);
    } else {
      Root = getNode('/');
    }
    initDefaults()
    return Root;
  }


  /**
   * 
   * @returns 
   */
  function changeSettings(opt = {}) {
    Root = getNode('/');
    db.putInToTable('syncOpt', { ...Root, ...opt, filepath: '/' });
    if (opt.mode && opt.mode != Root.mode) {
      if (opt.mode == Attr.full) {
        db.run(`UPDATE syncOpt SET effective=1, mode=?`, opt.mode);
      }
    }
    Root = getNode('/');
    Account.refreshMenu(Root);
    return Root;
  }


  /**
 * 
 * @param {*} evt 
 * @returns 
 */

  function rootSettings() {
    if (!Root) return { pending: 1 };
    Root.sync = Root.effective;
    Root.engine = Root.effective;
    return Root;
  }

  /**
   * Set default sync setting for the top directories
   * @param {*} evt 
   * @returns 
   */
  function initDefaults() {
    let sql = `SELECT * FROM remote WHERE filepath=?`
    let { home_id } = db.getRow(sql, '/') || {};
    sql = `SELECT s.effective, s.mode, r.filepath, r.home_id 
      FROM remote r left JOIN syncOpt s USING(filepath) WHERE s.effective IS NULL`;
    let rows = db.getRows(sql) || [];
    let effective = 0;
    let mode = Root.mode;
    for (let item of rows) {
      item.mode = item.mode || mode;
      if (item.home_id == home_id && item.effective == null) {
        effective = 1;
      } else {
        /** Hubs are default to unsynced */
        effective = 0;
      }
      db.putInToTable('syncOpt', { ...Root, ...item, effective });
    }
    return rows;
  }

  /**
   * 
   * @param {*} evt 
   * @returns 
   */
  function getEffectiveItems(e = 1) {
    let sql = `SELECT r.*, s.effective, s.mode, s.direction FROM remote r 
      INNER JOIN syncOpt s USING(filepath) WHERE s.effective=?`;
    const r = db.getRows(sql, e) || [];
    return r;
  }


  /**
 * 
 * @param {*} evt 
 * @returns 
 */

  function rootState(evt) {
    if (!Root) return 0;
    return Root.effective;
  }

  /**
   * 
   * @param {*} evt 
   * @returns 
   */

  function forced(evt) {
    let sql = `SELECT count(*) AS c FROM syncOpt WHERE filepath=? OR nid=?`;
    const r = db.getRow(sql, evt.filepath, evt.filepath) || { c: 0 };
    // console.log("AAA8", r, r.count, evt.filepath, sql);
    return r.c;
  }

  /**
   *
   */
  function getParentSettings(node) {
    if (!node || !node.filepath) {
      return Root;
    }

    let filepath = dirname(node.filepath).unixPath();
    if (filepath == '/') {
      console.error("Default to root", Root);
      return Root;
    }
    let parent = getNode(filepath);

    let i = 0;
    while (!parent) {
      filepath = dirname(filepath).unixPath();
      if (filepath == '/') {
        console.error("Default to root", node);
        return Root;
      }
      parent = getNode(filepath);
      if (parent) return parent;
      i++;
      if (i > 1000) {
        console.error("Tree depth exceeded", parent);
        return 0;
      }
    }
    return parent || Root;
  }

  /**
   * 
   */
  function addNodeSettings(item) {
    let node = getNode(item.filepath);
    if (node) return;
    if (item.filetype == Attr.hub) {
      /** Hubs are default to unsynced */
      db.putInToTable('syncOpt', { ...Root, ...item, effective: 0 });
      getNode(item.filepath);
    } else {
      let { effective, mode, direction } = getParentSettings(item);
      db.putInToTable('syncOpt', { ...item, mode, direction, effective });
    }
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  function getNodeSettings(item) {
    let node = getNode(item.filepath);
    if (node) return node;
    return getParentSettings(item)
  }

  /**
   * 
   */
  function isEnabled(item = {}) {
    let sql = `SELECT * FROM syncOpt WHERE regexp('^(' || escapePath(filepath) || '$|' || escapePath(filepath) || '/.+)', ?) `
    let r = db.getRows(sql, escapePath(item.filepath));
    return r || Root;
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  function getNodeState(item, update = 0) {
    let node = getNodeSettings(item, update);
    if (!node) return Root.effective;
    return node.effective;
  }


  /**
   * 
   * @param {*} item 
   */
  function changeTreeSettings(item, effective) {
    let sql;
    if (/(^hub|folder)$/.test(item.filetype)) {
      sql = [
        `UPDATE syncOpt SET effective=? WHERE regexp('^' || ?, filepath)`,
        // `UPDATE remote SET effective=? WHERE regexp('^' || ?, filepath)`,
        // `UPDATE remote_changelog SET effective=? WHERE regexp('^' || ?, filepath)`,
        // `UPDATE fsnode SET effective=? WHERE regexp('^' || ?, filepath)`,
        // `UPDATE fschangelog SET effective=? WHERE regexp('^' || ?, filepath)`
      ]
      db.serialize(sql, effective, item.filepath);
    }
    sql = [
      `UPDATE syncOpt SET effective=? WHERE filepath=?`,
      // `UPDATE remote SET effective=? WHERE filepath=?`,
      // `UPDATE remote_changelog SET effective=? WHERE filepath=?`,
      // `UPDATE fsnode SET effective=? WHERE filepath=?`,
      // `UPDATE fschangelog SET effective=? WHERE filepath=?`
    ]
    db.serialize(sql, effective, item.filepath);
  }

  /**
   *
   * @param {*} item
   * @returns
   */
  function changeNodeSettings(item) {
    const { effective, mode } = item;
    if (typeof (effective) != 'number') {
      console.log(`effective value must be integer`);
      return;
    }
    let filepath = dirname(item.filepath).unixPath();
    let parent = getNode(filepath);
    let node;
    if (effective) {
      /** Enable upward to ensure consistency */
      while (parent && !parent.effective) {
        parent.effective = 1;
        db.putInToTable('syncOpt', parent);
        if (parent.filepath == '/') {
          break;
        }
        filepath = dirname(filepath).unixPath();
        parent = getNode(filepath);
        // let ref = parent || Root;
        // node = { ...ref, filepath, effective };
      }
      let self = getNode(item.filepath);
      if (!self) {
        db.putInToTable('syncOpt', { ...item, effective });
        changeTreeSettings(item, effective);
        return;
      }
    }
    db.putInToTable('syncOpt', { ...item, effective });
    changeTreeSettings(item, effective)
  }

  /**
 *
 * @param {*} tableName
 * @param {*} item
 * @param {*} ...keys
 * @returns
 */
  function getSyncTrees() {
    let sql = `SELECT nid FROM remote WHERE pid='0' OR filepath='/'`;
    let { nid } = db.getRow(sql);
    sql = `SELECT r.*, s.effective 
      FROM remote r INNER JOIN syncOpt s 
      ON regexp('^(' || escapePath(s.filepath) || '$|' || s.filepath || '/.+)', r.filepath)  
      WHERE s.effective = 1 AND r.pid=?`;
    let rows = db.getRows(sql, nid);
    return rows;
  }
  return {
    getSyncTrees,
    initialize,
    initDefaults,
    getNodeState,
    getNodeSettings,
    changeNodeSettings,
    changeSettings,
    rootSettings,
    rootState,
    isEnabled,
    getEffectiveItems,
    getParentSettings,
    addNodeSettings
  }

};
