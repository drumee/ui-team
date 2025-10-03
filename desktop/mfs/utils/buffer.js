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

module.exports = function (worker) {
  const db = worker.db;

  /**
   * 
   * @returns 
   */
  function getJournal(filpath) {
    return db.getRows(`SELECT filepath, event name, inode, nid, hub_id, synced,
      effective, md5Hash, ctime,  mtime, args FROM changelog_buffer 
        WHERE effective ORDER by mtime asc`
    ) || []
  }

  /**
 * 
 * @param {*} e 
 * @returns 
 */
  function getSyncState(row = {}) {
    let { filepath } = row;
    let sql = `SELECT r.md5Hash, h.md5, h.inode, s.effective, r.filepath, r.filesize, h.filesize hfilesize, r.mtime, 
    FLOOR(h.mtimeMs/1000) hmtime 
    FROM remote r 
    LEFT JOIN hash h USING(filepath) 
    LEFT JOIN syncOpt s USING(filepath) 
    WHERE r.filepath=?`;
    let r = db.getRow(sql, filepath);
    if (!r) {
      return { synced: 0 }
    }
    r.synced = 0;
    if (r.md5Hash == null) {
      if (r.hmtime >= r.mtime) r.synced = 1;
      return r;
    }
    if (r.md5 && r.md5 == r.md5Hash) r.synced = 1;
    return r;
  }



  return {
    getJournal,
    getSyncState
  }

};
