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
const _ = require('lodash');
const {dirname, join} = require('path');
const {existsSync} = require('fs');
const _a = require('../../lex/attribute');
const {shortPath, escapePath} = require('../../utils/misc');
require('../../core/addons');


// function shortPath(arg) {
//   if (_.isString(arg)) {
//     filepath = arg;
//   } else {
//     filepath = arg.filepath;
//   }
//   const re = new RegExp('^' + USER_HOME_DIR.unixPath());
//   filepath = filepath.unixPath();
//   filepath = filepath.replace(re, '');
//   return filepath;
// }

module.exports = function (worker) {
  const db = worker.db;
  return {
    set: (evt, eventname) => {
      //console.log(`SET LOCK FOR *${eventname}* ON id=${evt.id}, filepath=${evt.filepath}`);
      db.putInToTable('semaphore', { ...evt, eventname });
    },
    pending: (evt) => {
      let sql = `SELECT count(*) count FROM semaphore 
        WHERE filepath=? AND origin='lock'`;
      let r = db.getRow(sql, evt.filepath) || { count: 0 };
      // if (r.count) {
      //   sql = `DELETE FROM semaphore 
      //     WHERE filepath=? AND origin='lock'`;
      //   db.run(sql, evt.filepath);
      // }
      return r.count;
    },
    lock: (evt, ...names) => {
      if (!evt || evt.id == null) {
        console.warn("AAA:17 semaphore lock requires event id", evt);
        console.trace();
        return false;
      }
      let filepath = shortPath(evt);
      
      if (/^\/+ *$/.test(filepath)) return;
      let sql = `SELECT t.id FROM task t INNER JOIN semaphore s ON
        t.id = s.id WHERE t.state ='idle' AND 
        (t.filepath=? OR s.inode=? OR s.nid=?) AND eventname=?`;
      let args = [sql, filepath, evt.inode, evt.nid, eventname];
      let rows = db.getRows(...args);
      for (var row of rows) {
        //console.log(`Freeing idle lock:${row.id}`);
        let s1 = `DELETE FROM task WHERE id=?`;
        let s2 = `DELETE FROM event WHERE id=?`;
        //let s3 = `DELETE FROM semaphore WHERE id=?`;
        db.serialize([s1, s2], row.id);
      }
      for (var eventname of names) {
        //console.log("AAAA:59 -- LOCKING", filepath, eventname);
        db.insertInToTable('semaphore', { ...evt, filepath, eventname });
        if (/^dir\..+/.test(eventname)) {
          let parent = dirname(filepath);
          let dir = join(USER_HOME_DIR, parent);
          while (!['', '/', null].includes(parent) && !existsSync(dir)) {
            let e = { ...evt, filepath: parent, eventname };
            db.insertInToTable('semaphore', e);
            parent = dirname(parent);
            dir = join(USER_HOME_DIR, parent)
          }
        }
      }
      return true;
    },
    renaming: () => {
      let sql = `SELECT count(*) count FROM semaphore 
        WHERE eventname IN ('folder.renamed','file.renamed')`;
      let r = db.getRow(sql) || { count: 0 };
      return r.count;
    },

    /**
     * 
     * @param {*} evt 
     * @param {*} eventname 
     * @returns 
     */
    parentLocked: (evt, eventname = 'folder.created') => {
      let filepath = evt.filepath;
      if (!/\/^/.test(filepath)) {
        filepath = `/${filepath}`;
      } else if (/^\/+$/.test(l)) {
        return 0;
      }
      filepath = shortPath(evt, _a.relative);
      filepath = escapePath(dirname(filepath));
      let sql = `SELECT count(*) count FROM semaphore 
        WHERE (eventname=? || eventname=='*') AND filepath!=?
        AND regexp('^' || ?, filepath)`;
      let r = db.getRow(sql, eventname, filepath, escapePath(filepath)) || { count: 0 };
      return r.count ;
    },
    
    /**
     * 
     * @param {*} evt 
     * @param {*} eventname 
     * @returns 
     */
    unlock: (evt, eventname) => {
      let filepath = shortPath(evt);
      filepath = escapePath(filepath);
      let sql = `SELECT count(*) AS count FROM semaphore WHERE 
        (filepath=? OR inode=? OR nid=?) AND eventname=?`;
      let args = [sql, filepath, evt.inode, evt.nid, eventname];
      let r = db.getRow(...args) || { count: 0 };
      let count = r.count;
      let c;
      //console.log("AAA:105", sql, evt, count, r);
      if (/^folder\.add/.test(eventname)) {
        sql = `SELECT count(*) AS count FROM destination WHERE 
        regexp('^' || filepath, ?)`;
        c = db.getRow(sql, escapePath(filepath)) || { count: 0 };
        count = count + c.count;
      }
      if (/^folder\.remove/.test(eventname)) {
        sql = `SELECT count(*) AS count FROM source WHERE 
        regexp('^' || filepath, ?)`;
        c = db.getRow(sql, escapePath(filepath)) || { count: 0 };
        count = count + c.count;
      }
      sql = `SELECT count(*) AS count FROM semaphore WHERE 
      regexp('^' || filepath, ?) AND eventname=?`;
      c = db.getRow(sql, escapePath(filepath), eventname) || { count: 0 };
      count = count + c.count;
      //console.log("AAA:121", (count > 0), parseInt(count), sql, filepath);
      if (count > 0) {
        return false;
      }
      return true;
    },
    free: (evt) => {
    },
    reset: (evt) => {
      // let sql = `DELETE FROM semaphore WHERE filepath=?`;
      // return db.run(sql, evt.filepath);
    },
    list: (evt) => {
      let sql = `SELECT * FROM semaphore`;
      return db.getRows(sql);
    },
  }
}  
