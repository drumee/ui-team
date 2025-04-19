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
  return {
    touch: (evt) => {
      let sql = `UPDATE journal SET eventtype=? WHERE inode=?`;
      return db.run(sql, evt.eventtype, evt.inode);
    },
    setEvent: (evt) => {
      //console.log(`AAA:1112 [log|${evt.id}] ${evt.name} -> ${evt.filepath}`, evt);
      if (!evt.id) return;
      //console.log(`AAA:1312 [log|${evt.id}] ${evt.name} -> ${evt.filepath}`, evt);
      if(!evt.nodetype){
        evt.nodetype = /^(hub|folder)$/i.test(evt.filetype)? 'folder' : 'file';
      }
      let sql = `UPDATE journal SET eventId=?, nodetype=? 
        WHERE inode=? OR filepath=?`;
      return db.run(sql, evt.id, evt.nodetype, evt.inode, evt.filepath);
    },
    clearEvent: (evt) => {
      if (!evt.inode || evt.id) return;
      let sql = `DELETE FROM journal WHERE eventId=?`;
      return db.run(sql, evt.id);
    },
    clearAlert: () => {
      let sql = `DELETE FROM journal WHERE eventId IS NULL`;
      return db.run(sql);
    },
    nextChanges: (evt) => {
      let sql = `SELECT count(*) c FROM journal j INNER JOIN fsnode f 
        ON j.inode=f.inode WHERE eventtype in('modified', 'rename') 
        AND j.nodetype='file' AND eventId IS NULL`;
      let r = db.getRow(sql);
      return r.c || 0;
    },
    confirmChanges: (timer=1000) => {
      return new Promise((resolve, reject)=>{
        setTimeout(()=>{
          let sql = `SELECT count(*) c FROM journal WHERE eventtype in('modified', 'rename') 
          AND eventId IS NULL`;
            let r = db.getRow(sql);
          resolve(r.c || 0)
        }, timer);
      })
    
    },
  }
}  
