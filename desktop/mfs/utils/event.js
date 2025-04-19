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
const { isString } = require("lodash");
const { normalize, dirname, join } = require("./path");
module.exports = function (worker) {
  const db = worker.db;
  return {

    queue: (ts) => {
      let sql = `SELECT id, status, filepath, timestamp FROM event WHERE 
        name='fs.queue' AND timestamp <= ? ORDER BY timestamp ASC LIMIT 1`;
      return db.getRow(sql, ts);
    },

    log: (ts) => {
      let sql = `SELECT * FROM event e WHERE e.id 
        NOT IN (SELECT id FROM task) 
        ORDER BY e.timestamp ASC`;
      return db.getRows(sql);
    },

    setError(evt, error) {
      let sql = `SELECT * FROM event WHERE id=?`;
      let r = db.getRow(sql, evt.id);
      if (!r) return;
      console.log({evt, error, r})
      let { args } = r || {};
      let a = JSON.parse(args) || {};
      a.error = error;
      sql = `UPDATE event SET args=? WHERE id=?`;
      db.run(sql, JSON.stringify(a), evt.id);
    },

    getError(evt) {
      let sql = `SELECT * FROM event WHERE id=?`;
      let r = db.getRow(sql, evt.id);
      if (!r) return;
      let { args } = r || {};
      let { error } = JSON.parse(args) || {};
      return error;
    },

    passthrough: (ts) => {
      let sql = `SELECT * FROM event e WHERE e.id AND name='passthrough'
        NOT IN (SELECT id FROM task) 
        ORDER BY e.timestamp ASC`;
      return db.getRows(sql);
    },

    write: (evt) => {
      if (!evt.args) evt.args = {};
      if (!isString(evt.args)) {
        evt.args = JSON.stringify(evt.args);
      }
      if (!evt.ownpath) {
        let sql = `SELECT * FROM remote where filepath=?`;
        let { ownpath } = db.getRow(sql, dirname(evt.filepath)) || {};
        if (ownpath) {
          //console.log("AAA:34", ownpath, evt);
          if (evt.filename) {
            evt.ownpath = join(ownpath, evt.filename);
          } else {
            evt.ownpath = ownpath;
          }
        } else {
          let parent = dirname(evt.filepath);
          let res; // = db.getRow(sql, parent);
          while (!res) {
            if (parent == "/") break;
            res = db.getRow(sql, parent);
            parent = dirname(parent);
          }
          if(!res){
            console.log("AAA:29 -- NO OWNPATH -- DEFAULTED TO /", evt);
            evt.ownpath = '/'
          }else{
            let re = new RegExp(res.ownpath + '$')
            let base = res.filepath.replace(re, '');
            re = new RegExp('^' + base)
            evt.ownpath = evt.filepath.replace(re, '')
          }
        }
      }
      if (!evt.nodetype) {
        evt.nodetype = /^(hub|folder)$/i.test(evt.filetype) ? 'folder' : 'file';
      }
      const r = db.insertOrIgnoreInToTable("event", evt);
      evt.id = r.lastInsertRowid;
      evt.eventId = evt.id;
      let sql = `UPDATE journal SET eventId=?, nodetype=? 
        WHERE inode=? OR filepath=?`;
      db.run(sql, evt.id, evt.nodetype, evt.inode, evt.filepath);
      return evt.id;
    },

    exists: (evt) => {
      let sql = `SELECT count(*) count FROM event WHERE id=?`;
      let r = db.getRow(sql, evt.id) || {};
      return r.count;
    },

    wipe: () => {
      let sql = `DELETE FROM event`;
      db.run(sql);
    },

    sanity: () => {
      let sql = `SELECT count(*) count FROM event WHERE name='file.modified'`;
      let r = db.getRow(sql);
      return r;
    },

    pending: () => {
      let sql = `SELECT count(*) c FROM event WHERE 
        id NOT IN (SELECT id FROM task WHERE state='idle')`;
      let r = db.getRows(sql);
      return r.c;
    },

    isClean: (evt, worker) => {
      let sql = `SELECT * FROM task WHERE filepath=? AND worker=? 
        AND state='idle'`;
      let r = db.getRows(sql, evt.filepath, worker) || [];
      console.log("AAA:43", r, evt.filepath, worker, sql);
      if (r.length) {
        for (var item of r) {
          sql = `DELETE FROM task WHERE id=?`;
          db.run(sql, item.id);
          sql = `DELETE FROM event WHERE id=?`;
          db.run(sql, item.id);
        }
        return false;
      }
      return true;
    },

    checkSanity: () => {
      let sql = `SELECT * FROM event WHERE name='file.modified'`;
      let rows = db.getRows(sql);
      //console.log("AAA:41 SANITY", rows);
      if (rows && rows.length > 1) {
        return 0;
      }
      return 1;
    },

    parseArgs: (evt) => {
      if (!evt.args) return {};
      if (evt.filepath) evt.filepath = normalize(evt.filepath);
      if (evt.ownpath) evt.ownpath = normalize(evt.ownpath);
      if (typeof evt.args != "string") return evt.args;
      try {
        return JSON.parse(evt.args);
      } catch (e) {
        return evt.args;
      }
    },
  };
};
