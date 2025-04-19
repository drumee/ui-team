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
module.exports = function (worker) {
  const db = worker.db;
  return {
    _changeRate: () => {
      let sql = `SELECT f1.filepath, f2.filepath, 
        f1.timestamp, f2.timestamp FROM fsevent f1 
        INNER JOIN fsnode f2 ON f1.inode=f2.inode WHERE 
        (? - f1.timestamp) < 5000 AND 
        f1.timestamp = f2.timestamp AND 
        f2.filetype NOT IN('folder', 'hub') AND
        f1.filepath=f2.filepath AND 
        f2.filepath NOT IN (
          SELECT filepath FROM semaphore
          UNION 
          SELECT filepath FROM task
          UNION 
          SELECT filepath FROM event
        )`;
      return db.getRows(sql, new Date().getDate());
    },
    changeRate: () => {
      //let sql = `SELECT * FROM event WHERE name='file.modified'`;
      //let sql = `SELECT max(timestamp) - min(timestamp) delta FROM event WHERE name='file.modified'`;
      //return db.getRows(sql);
      let sql = `SELECT (max(f.mtimeMs) - min(f.mtimeMs )) delta, 
        count(*) count FROM local l INNER JOIN fsnode f ON 
        l.filepath=f.filepath WHERE f.mtimeMs != l.mtimeMs AND 
        l.filetype NOT IN ('hub', 'folder')`;
      let r = db.getRow(sql);
      if (!r || r.count <= 1) return 0;
      //console.log("AAAA:74", r);
      return (1000 * r.count / r.delta);
    },
    removeRate: () => {
      let sql = `SELECT * FROM event WHERE name 
        IN('file.deleted', 'directory.deleted')`;
      return db.getRows(sql);
    },
    __changeRate: () => {
      let sql = `SELECT count(*) count FROM fslog WHERE (? - timestamp) < 2000`;
      let r = db.getRows(sql, new Date().getDate());
      console.log("AAA:30", r)
      if (r.count > 6) {
        sql = `SELECT * FROM event WHERE name='file.modified'`;
        return db.getRows(sql);
      } else {
        return [];
      }
    },
    setEventId: (eventId, id) => {
      let sql = `UPDATE fsevent SET eventId=? WHERE id=?`;
      return db.run(sql, eventId, id);
    },
  }
}  
