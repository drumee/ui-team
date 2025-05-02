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

module.exports = function (worker) {
  const db = worker.db;
  const terminate = (e) => {
    let seq = [
      `DELETE FROM task WHERE id=?`,
      `DELETE FROM journal WHERE eventId=?`,
      `DELETE FROM event WHERE id=?`,
      `DELETE FROM semaphore WHERE id=?`,
      `DELETE FROM source WHERE eventId=?`,
      `DELETE FROM destination WHERE eventId=?`,
    ];
    // db.serialize([s1, s2, s3, s4, s5], e.id);
    let seq2 = [
      `UPDATE remote_changelog SET synced=1 WHERE filepath=?`,
      `DELETE FROM fsevent WHERE filepath=?`
    ]
    db.serialize(seq2, e.filepath);
    db.run(`DELETE FROM fsevent WHERE filepath=?`, e.filepath);
    let sql = `SELECT count(*) AS alive FROM task WHERE id=? AND state IN('alive', 'queued')`;

    let timer = null;
    let f = function () {
      let r = db.getRow(sql, e.id) || {};
      if (r.alive) {
        timer = setTimeout(f, 6000);
      } else {
        if (timer) {
          clearTimeout(timer);
        }
        db.serialize(seq, e.id);
      }
    };

    timer = setTimeout(f, 300);
  };

  return {
    update: (e) => {
      let sql = `UPDATE task SET retry=?, state=? WHERE id=?`;
      return db.run(sql, e.retry, e.state, e.id);
    },
    start: (e) => {
      let sql = `UPDATE task SET retry=?, state=? WHERE id=?`;
      return db.run(sql, e.retry, e.state, e.id);
    },
    pending: (e) => {
      let sql = `SELECT count(*) AS c FROM task WHERE state \
        IN ('alive', 'queued')`;
      let r = db.getRow(sql);
      return r.c;
    },
    cleanup: (ts) => {
      let sql = `SELECT id FROM task WHERE state='idle' AND id 
      IN (SELECT id FROM semaphore WHERE (? - timestamp) > 12000)`;
      let rows = db.getRows(sql, ts);
      for (var row of rows) {
        console.log("CLEANING UP TASK", row);
        terminate(row);
      }
    },
    idlize: (evt) => {
      let ts = new Date().getTime();
      let sql = `UPDATE task SET state='idle' WHERE  
        (? - timestamp) > 6000 AND state NOT IN('alive', 'queued', 'started')`;
      if (evt && evt.id) {
        sql = `UPDATE task SET state='idle' WHERE id=?`;
        ts = evt.id;
      }
      return db.run(sql, ts);
    },
    tick: (e) => {
      let ts = new Date().getTime();
      let sql = `UPDATE task SET timestamp=? WHERE id=?`;
      return db.run(sql, ts, e.id);
    },
    keepalive: (e, state = "alive") => {
      let ts = new Date().getTime();
      let sql = `UPDATE task SET state=?, timestamp=?
       WHERE id=?`;
      return db.run(sql, state, ts, e.id);
    },
    exists: (e) => {
      let sql = `SELECT * FROM task WHERE id=?`;
      return db.getRow(sql, e.id);
    },
    pendingDeletion: (e) => {
      let sql = `SELECT count(*) AS c FROM task WHERE state='started' AND worker LIKE "%.deleted"`;
      let r = db.getRow(sql) || { c: 0 };
      return r.c;
    },

    terminate,
  };
};
