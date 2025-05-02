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
const Path = require('path');


module.exports = function (worker) {
  const db = worker.db;
  return {
    getEvent: (opt) => {
      let { stat, nodetype, inode, timestamp, local } = opt;
      // if (!inode) return null;
      // let loc = getlocal(db, stat, inode, nodetype, timestamp);
      // if (!loc) return null;
      // if (loc.eventtype) return loc;
      let times = {
        ctimeMs: stat.ctimeMs || timestamp,
        mtimeMs: stat.mtimeMs || timestamp,
      }
      let loc = local;
      let sql = `SELECT l.*, n.nodetype FROM fslog l INNER JOIN fsnode n 
        ON n.inode=l.inode WHERE l.inode=? ORDER BY l.id DESC`;
      let rows = db.getRows(sql, inode) || [];
      let node = rows[0];
      if (!node || !node.eventtype) return node;
      let { eventtype } = node;
      node = { ...loc, nodetype, ...node, ...times, timestamp };
      switch (eventtype) {
        case 'change':
        case 'modified':
          node.eventtype = 'modified';
          db.putInToTable('fsnode', node);
          if (nodetype == "file") {
            if (loc.filesize == stat.size && (stat.mtimeMs - loc.mtimeMs) < 2000) {
              return { eventtype, skipped: true, reason: "UNCHANGED" };
            }
            let evt = { ...loc, ...node, ...times, timestamp, filesize: stat.size };
            if (!evt.nid) {
              return { eventtype, skipped: true, reason: "NO_ENTITY", loc }
            }
            db.putInToTable('local', evt);
            return evt;
          }
          return { eventtype, skipped: true, reason: "CHANGE_ON_DIR" }
        case 'rename':
        case 'renamed':
          node.eventtype = 'renamed';
          let dest_dir = Path.dirname(node.filepath);
          let src_dir = Path.dirname(loc.filepath);
          let filename = Path.basename(src_dir).replace(new RegExp(Path.extname(src_dir) + "$"), '');
          db.putInToTable('fsnode', { ...node, ...times, timestamp });
          node.filename = filename;
          sql = `SELECT * FROM remote WHERE filepath=?`;
          let rem = db.getRow(sql, dest_dir) || {};
          let src = { ...loc, dirname: src_dir, filename };
          let dest = {};
          if (rem.nid) {
            loc.privilege = rem.privilege;
            dest = { ...rem, ...node, pid: rem.nid, nid: loc.nid, dirname: dest_dir, filename };
          }
          db.putInToTable('source', src);
          db.putInToTable('destination', dest);
          if (dest_dir != src_dir) {
            eventtype = 'moved';
            return { ...loc, eventtype, src, dest, nodetype }
          }
          eventtype = 'renamed';
          node.eventtype = eventtype;
          return { ...loc, ...node, src, dest, nodetype }
      }
      let evt = { ...loc, ...node };
      return evt;
    },
    getNodeEvents: (evt) => {
      let sql = `SELECT * FROM fslog WHERE inode=? ORDER BY id ASC`;
      return db.getRows(sql, evt.inode);
    },
    getNodeMaxSize: (evt) => {
      let sql = `SELECT filesize FROM fslog WHERE inode=? ORDER BY filesize LIMIT 1`;
      let { filesize } = db.getRow(sql, evt.inode) || { filesize: 0 };
      return filesize;
    },
    clearNode: (evt) => {
      let sql = `DELETE FROM fslog WHERE inode=?`;
      //console.log("AAAA:111", sql);
      return db.run(sql, evt.inode);
    },
    list: () => {
      let sql = `SELECT * FROM fslog `;
      return db.getRows(sql);
    },
    entries: (inode) => {
      let sql = `SELECT l.*, n.nodetype FROM fslog l INNER JOIN fsnode n 
        ON n.inode=l.inode WHERE l.inode=? ORDER BY l.id ASC`;
      let rows = db.getRows(sql, inode) || [];
      return rows;
    }
  }
}  
