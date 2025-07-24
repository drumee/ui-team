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
const Attr = require('../../lex/attribute');

/**
* 
* @param {*} data 
* @returns 
*/
function defaultData(data) {
  if (data.sync_state == null) data.sync_state = this.get(Attr.sync_state);
  if (data.sync_mode == null) data.sync_mode = this.get(Attr.sync_mode);
  if (data.id == null) data.id = this.getId();
  if (data.endpoint == null) data.endpoint = 'main';

  data.ctime = new Date().getTime();
  data.mtime = new Date().getTime();
  return data;
}

const ENDPOINTS = `SELECT *, host url, host main_domain, keysel name, path endpointPath FROM endpoint`;

/** ==================== SQL PART ==================== */

/**
 * 
 * @param {*} args 
 * @returns 
 */
function find(args) {
  let sql = `SELECT * FROM account WHERE auth=? OR id=?`;
  return this.db.getRow(sql, args.auth, args.id);
}

/**
 * 
 * @param {*} skip 
 * @returns 
 */
function currentEndpoint() {
  let sql = `SELECT *, host url, host main_domain, keysel name, path endpointPath FROM endpoint e INNER JOIN user u ON u.sid=e.sid WHERE e.sid=?`;
  return this.db.getRow(sql, this.get(Attr.sid));
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
function lastEndpoint() {
  let sql = `${ENDPOINTS} WHERE mtime != 0 ORDER BY mtime DESC`;
  return this.db.getRow(sql);
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
function setEndpoint(args) {
  let { endpointName, main_domain, sid, user, organization } = args;
  if (!user || !organization || !sid) {
    this.warn("Invalid data", { user, organization });
    return {};
  }
  let { domain_id, url } = organization;
  let { id: uid } = user;
  let { keysel, appRoot, path, host } = this.bootstrap();
  let ctime = new Date().getTime();
  if (endpointName) {
    path = `${appRoot}/${endpointName}/`
  }
  if (!sid) sid = this.bootstrap().sid;
  this.set({ yp_env: args });

  this.set({ sid });
  let endpoint = {
    sid,
    keysel,
    uid,
    host: url || host,
    path,
    domain_id,
    ctime,
    mtime: ctime,
    domain: main_domain
  }
  this.db.putInToTable('endpoint', endpoint);
  let bootstrap = this.bootstrap();
  let output = { endpoint, bootstrap, env: args }
  if (webContents) {
    webContents.send("endpoint-update", output);
  }

  return endpoint;
}


/**
 * 
 * @returns 
 */
function endpoints() {
  let sql = `SELECT o.name, e.uid, e.path, e.host domain, e.host, e.keysel, e.sid 
    FROM endpoint e INNER JOIN organization o ON o.domain=e.host ORDER by mtime DESC`;
  return this.db.getRows(sql);
}

/**
 * 
 * @returns 
 */
function activeUsers() {
  let sql = `SELECT * FROM user WHERE id != ?`;
  return this.db.getRows(sql, 'ffffffffffffffff');
}

/**
 * 
 * @param {*} args 
 */
function setOrganization(args) {
  this.db.putInToTable('organization', { ...args, domain: args.url });
}

/**
 * 
 * @param {*} args 
 */
function setUser(args) {
  this.db.putInToTable('user', args);
}



/**
 * 
 * @returns 
 */
function getEndpoint(id) {
  let sql = `SELECT *, keysel name FROM endpoint WHERE sid=?`;
  return this.db.getRow(sql, id);
}



/**
 * 
 * @param {*} data 
 * @returns 
 */
function update(data) {
  if (!data) return;
  data = this.defaultData(data);
  data.mtime = new Date().getTime();
  let sql = `UPDATE account SET `;

  let values = [];
  for (var k in data) {
    if (this.schema[k]) {
      sql = `${sql} ${k}=?,`;
      let val = data[k];
      if (typeof (val) === 'object') {
        values.push(JSON.stringify(val));
      } else {
        values.push(val);
      }
    }
  }
  values.push(this.getId());
  sql = sql.replace(/,$/, ` WHERE id=?`);
  this.db.run(sql, ...values);
}


/**
 *
 * @param {*} d
 * @returns
 */
function forget(id) {
  let sid = id || this.getId();
  if (!sid || typeof (sid) !== 'string') return;
  let sql = `DELETE FROM endpoint WHERE sid=?`
  this.db.run(sql, sid);
  sql = `DELETE FROM user WHERE sid=?`
  this.db.run(sql, this.get(sid));
}


/**
 *
 * @param {*} d
 * @returns
 */
function leave() {
  let sql = `UPDATE account SET mtime=0 WHERE id=?`
  return this.db.run(sql, this.getId());
}

/**
 *
 * @param {*} d
 * @returns
 */
function getSchema() {
  let sql = `SELECT * FROM schema`
  return this.db.getRows(sql);
}

function touch() {
  let sid = this.get(Attr.sid);
  let ts = new Date().getTime()
  this.db.run(`UPDATE endpoint SET mtime=? WHERE id=?`, ts, sid);
}

module.exports = {
  activeUsers,
  currentEndpoint,
  defaultData,
  endpoints,
  find,
  forget,
  getEndpoint,
  getSchema,
  lastEndpoint,
  leave,
  setEndpoint,
  setOrganization,
  setUser,
  touch,
  update,
};

