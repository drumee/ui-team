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
require('../addons')
const { escapePath } = require("../../utils/misc");
const Fs = require('fs');
const { resolve, join, basename, dirname, normalize, extname } = require('path');
const SCHEMAS = require('./schemas');
const INDEXES = require('./indexes');
const Attr = require('../../lex/attribute');
const Crypto = require('crypto');
const core = require("../core-utils")
const Database = require('better-sqlite3');
class db_connector extends core {

  /**
  * 
  * @returns 
  */
  initialize(opt = {}) {
    if (!USER_DBDIR) {
      USER_DBDIR = ARGV.dbdir;
    }
    let dbfile = resolve(USER_DBDIR, 'common.db');

    if (opt.datafile) {
      dbfile = join(USER_DBDIR, `${opt.datafile}.db`);
    }

    try {
      if (!Fs.existsSync(USER_DBDIR)) {
        Fs.mkdirSync(USER_DBDIR, {
          recursive: true
        });
      }

      console.log(`Loading db from ${dbfile}`)
      if (ARGV.verbose) {
        this.__db = new Database(dbfile, { verbose: ARGV.dbVerbose });
      } else {
        this.__db = new Database(dbfile);
      }
    } catch (e) {
      throw `Failed to initialize Database ${dbfile} : ${e.toString()}`;
    }
    this.dbfile = dbfile;
    this._schemasPatched = {};
    const { patches } = require('./patches');
    this.getPatches = patches.bind(this);
    console.log(`Database [${dbfile}] is now ready for use`);
    this.initTables();
    this.applyPatches();
    if (this.__db.pragma('integrity_check', { simple: true }) == 'ok') {
      this._integrity = true;
    } else {
      this._integrity = false;
    }
    this.set({ verbose: 0, dbfile });
    this.trigger(Attr.ready);
    this._timestamp = new Date().getTime();
    this.createFunctions();
    this._isClosed = 0;
    this.checkOrphanes();
  }

  /**
   * 
   */
  sanitize(text, encode = 1) {
    if (!text) return '';
    let t = text.replace(/[\{\}\[\]\(\)]+/g, '');
    return encodeURI(t);
  }

  /**
    * Some costumized stiffs
    * 
   */
  createFunctions() {
    this.__db.function('replace_path', {
      deterministic: true,
      varargs: true
    }, (pattern, text, new_text) => {
      let head = '';
      let tail = '';
      if (pattern[0] == '^') {
        head = pattern[0];
        pattern = pattern.slice(1);
      }
      if (pattern[pattern.length - 1] == '$') {
        tail = '$';
        pattern.slice(0, pattern.length - 1);
      }
      pattern = encodeURI(pattern);
      text = encodeURI(text);
      new_text = encodeURI(new_text);
      const re = new RegExp(head + pattern + tail, 'ig');
      let r = text.replace(re, new_text);
      return decodeURI(r);
    });

    this.__db.function('file_exists', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      const file = join(USER_HOME_DIR, normalize(filepath));
      if (Fs.existsSync(file)) return 1;
      return 0;
    });

    this.__db.function('regexp', {
      deterministic: true,
      varargs: true
    }, (pattern, text) => {
      const re = new RegExp(pattern, 'ig');
      if (re.test(text)) return 1;
      return 0;
    });

    this.__db.function('escapePath', {
      deterministic: true,
      varargs: true
    }, escapePath);

    this.__db.function('dirname', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      return dirname(filepath);
    });

    this.__db.function('parentpath', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      return dirname(filepath);
    });

    this.__db.function('filename', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      return basename(filepath);
    });

    this.__db.function('mfs_filename', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      return basename(filepath).replace(new RegExp(extname(filepath) + "$"), '');
    });

    this.__db.function('is_ignored', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      let r = this.getRow(`SELECT count(*) c FROM ignore WHERE 
        regexp('^' || filepath, ?)`, filepath) || { c: 0 };
      return r.c;
    });

    this.__db.function('sys_timestamp', {
      deterministic: true,
      varargs: true
    }, (filepath) => {
      let ts = new Date().getTime();
      if (ts <= this._timestamp) ts = this._timestamp + 1;
      this._timestamp = new Date().getTime()
      return ts;
    });
  }

  /**
   * 
   * @param {*} sql 
   * @param  {...any} values 
   * @returns 
   */
  trace(sql, ...values) {
    sql = sql.replace(/ +/, ' ');
    let dbfile = basename((this.dbfile));
    console.log(`[${dbfile}]: *** Running ${sql} ***`, ":::", ...values, ":::");
  }

  /**
   * 
   */
  close() {
    this.__db.close();
    this._isClosed = 1;
    this.__db = null;
    this.dbfile = null;
  }

  /**
   * 
   */
  isClosed() {
    return this._isClosed;
  }

  name() {
    return basename(this.dbfile).replace(/\.db$/, '');
  }

  /**
   * 
   */
  prepare(...args) {
    this.__db.prepare(...args);
  }

  /**
   * 
   */
  transaction(...args) {
    return this.__db.transaction(...args);
  }


  /**
   * 
   */
  checkOrphanes() {
    let schemas = this.getRows(
      `SELECT name FROM sqlite_schema WHERE type ='table' AND 
      name NOT LIKE 'sqlite_%'`);
    for (let schema of schemas) {
      if (!SCHEMAS[schema.name]) {
        this.debug("AAA:456 SCHEMAS MISSING", schema)
        let seq = [
          `DELETE FROM schema WHERE name='${schema.name}'`,
          `DROP TABLE IF EXISTS ${schema.name}`,
        ]
        this.serialize(seq);
      }
    }
  }

  /**
   * 
   * @returns 
   */
  connector() {
    return this.__db;
  }

  /**
   * 
   * @param {*} name 
   * @returns 
   */
  check(name, type = 'table') {
    const sql = `SELECT name FROM sqlite_master WHERE name=? AND type=?`;
    let r = this.__db.prepare(sql).get(name, type);
    return r;
  }
  /**
* 
* @param {*} d 
* @returns 
*/
  updateTable(table, key, data) {
    let sql = `UPDATE ${table} SET `;
    let schema = SCHEMAS[table];
    if (!schema) {
      console.error('Table not found');
      return;
    }
    let values = [];
    for (var name in data) {
      if (name != key && schema[name]) {
        sql = `${sql} ${name}=?,`;
        values.push(data[name]);
      }
    }
    sql = sql.replace(/,$/, ` WHERE ${key}=?`);
    values.push(data[key]);
    try {
      this.run(sql, ...values);
    } catch (e) {
      this.debug("Failed to build SQL", e, sql, data);
    }
  }


  /**
   * 
   */
  initTables() {
    this._statement = {
      insert: {},
      upsert: {},
      insertOrIgnore: {},
    };
    for (let name in SCHEMAS) {
      let table = this.check(name);
      //this.debug("Checking table", name, table);
      if (_.isEmpty(table)) {
        this.debug("Creating table", name);
        this.createTable(name);
        this.createIndexes(name);
      }
      this._statement.upsert[name] = this.buildStatement(name, 'REPLACE');
      this._statement.insert[name] = this.buildStatement(name, 'INSERT');
      this._statement.insertOrIgnore[name] = this.buildStatement(name, 'INSERT OR IGNORE');
    }
  }

  /**
   * 
   * @param {*} name 
   * @param {*} exclude 
   * @returns 
   */
  fieldsAndValues(name, exclude = []) {
    let schema = { ...this.schema(name) };
    for (var k of exclude) {
      delete schema[k];
    }
    const fields = _.keys(schema).join(',');
    const values = _.keys(schema).join(',@');
    return { fields, values };
  }

  /**
   * 
   * @param {*} tableName 
   * @returns 
   */
  populate(tableName, stm = "REPLACE", exclude) {
    let { fields, values } = this.fieldsAndValues(tableName, exclude);
    let sql = `${stm} INTO ${tableName} (${fields}) VALUES(@${values})`;
    let r = this.__db.prepare(sql);
    return r;
  }

  /**
   * 
   */
  sessionTables(id) {
    let tables = {};
    for (var k in SCHEMAS) {
      tables[k] = k;
    }
    tables.media = 'media';
    return tables;
  }

  /**
 * 
 * @param {*} name 
 * @returns 
 */
  createIndexes(name) {
    let index = INDEXES[name];
    if (!index) {
      return;
    }
    if (!index.name || !index.columns) return;

    this.debug(`Creating indexes for table ${name}`, index);
    let sql = `DROP INDEX IF EXISTS "${name}_${index.name}"`;
    this.run(sql);

    sql = `CREATE UNIQUE INDEX IF NOT EXISTS "${name}_${index.name}" ON ${name}(`;
    let columns = index.columns;
    if (!columns) {
      throw `Could not find columns t index ${name}`;
    }
    for (var column of columns) {
      sql = `${sql} ${column},`;
    }
    sql = sql.replace(/,$/, ')');
    return this.run(sql);
  }

  /**
   * 
   */
  checkSchema(src, dest) {
    console.warn('checkSchema is deprecated');
    return;
  }

  /**
   * 
   */
  tablePatched(name) {
    return this._schemasPatched[name];
  }

  /**
 * 
 * @returns 
 */
  buildStatement(name, op = 'REPLACE') {
    let sql = `${op} INTO ${name} VALUES(`;
    for (var k in SCHEMAS[name]) {
      sql = `${sql} ?,`
    }
    sql = sql.replace(/,$/, ')');
    return sql;
  }

  /**
   * 
   */
  isOk() {
    return this._integrity;
  }

  /**
   * 
   */
  schema(name) {
    return SCHEMAS[name];
  }

  /**
   * 
   */
  statement(name, type = 'upsert') {
    return this._statement[type][name];
  }

  /**
   * 
   */
  values(name, data) {
    let args = [];
    for (var k in SCHEMAS[name]) {
      args.push(data[k]);
    }
    return args;
  }

  /**
   * 
   */
  patchRefenceTable(name, patch) {
    let new_ver = patch.args.version;
    //this.debug(`CHECKING PATCH FOR TABLE ${name}`);
    let r = this.getRow(`SELECT * FROM schema WHERE name=?`, name);
    if (!r) {
      console.log(`Schema ${name} was not found. Writing default`, patch.args);
      this.putInToTable('schema', patch.args);
      r = { version: "0.0.0" }
    }
    let old_ver = r.version;
    if (_.isEmpty(r) || old_ver != new_ver) {
      this.debug(`Applying patch on schema ${name}, from ${old_ver} to ${new_ver}`);
      if (patch.action && patch.args) {
        let action = patch.action.bind(this);
        this._schemasPatched[name] = new_ver;
        action(patch.args);
      }
    }
  }

  /**
   * 
   */
  applyPatches() {
    if (this.isReference()) {
      let tables = this.getPatches();
      for (var name in tables) {
        this.patchRefenceTable(name, tables[name])
      }
    } else {
      let ref = this.get('fingerprints');
      let fingerprints = this.fingerprints();
      let sql = [];
      for (var key in fingerprints) {
        if (fingerprints[key].hash != ref[key].hash) {
          this.debug("PATCHING", key, fingerprints[key], ref[key]);
          sql.push(`DROP TABLE IF EXISTS ${key}`);
          sql.push(ref[key].sql)
        }
      }
      this.serialize(sql);
    }
  }

  /**
   * 
   * @param {*} name 
   * @returns 
   */
  createTable(name) {
    let sql = `CREATE TABLE IF NOT EXISTS ${name} (`;
    let definition = SCHEMAS[name];
    if (!definition) {
      throw `Could not find table definition for ${name}`;
    }
    for (var k in definition) {
      sql = `${sql} ${k} ${definition[k]},`;
    }
    let index = INDEXES[name];
    if (index && index.unique) {
      let unique = 'UNIQUE(';
      for (var column of index.unique) {
        unique = `${unique} ${column},`;
      }
      unique = unique.replace(/,$/, ')');
      sql = `${sql} ${unique},`;
    }
    sql = sql.replace(/,$/, ')');
    return this.run(sql);

  }

  /**
   * 
   * @param {*} data 
   */
  normalize(data) {
    if (!data.filepath && data.file_path) data.filepath = data.file_path;
    if (data.filepath) data.filepath = data.filepath.unixPath();
  }


  /**
   * 
   */
  _buildStatement(name, type, data) {
    let sql = this.statement(name, type);
    if (!sql) {
      throw (`Failed to build statement ${type} for table **${name}**`, this._statement);
    }
    let args = [];
    this.normalize(data);
    for (var k in SCHEMAS[name]) {
      args.push(data[k]);
    }
    return [sql, ...args];
  }

  /**
  * 
  * @param {*} d 
  * @returns 
  */
  putInToTable(name, data) {
    return this.run(...this._buildStatement(name, 'upsert', data));
  }

  /**
  * 
  * @param {*} d 
  * @returns 
  */
  insertInToTable(name, data) {
    return this.run(...this._buildStatement(name, 'insert', data));
  }

  /**
  * 
  * @param {*} d 
  * @returns 
  */
  insertOrIgnoreInToTable(name, data) {
    return this.run(...this._buildStatement(name, 'insertOrIgnore', data));
  }

  /**
 * 
 * @param {*} sql 
 * @returns 
 */
  run(sql, ...values) {
    if (this.pendingError) return null;
    try {
      const stmt = this.__db.prepare(sql);
      const info = stmt.run(...values);
      return info;
    } catch (e) {
      console.warn(`Failed to run`, sql, ...values, e);
      throw e;
    }
  }

  /**
 * 
 * @param {*} sql 
 * @returns 
 */
  serialize(statements, ...values) {
    let stmt;
    let info = [];
    try {
      for (let sql of statements) {
        sql = sql.replace(/[ \n]+/, ' ');
        stmt = this.__db.prepare(sql);
        info.push(stmt.run(...values))
      }
      return info;
    } catch (e) {
      console.warn("DB connector [600] : Failed to serialize", statements, e);
      console.trace();
    }
    return info;
  }


  /**
  * 
  * @param {*} sql 
  * @returns 
  */
  getRow(sql, ...values) {
    this.trace(sql, ...values);
    try {
      return this.__db.prepare(sql).get(...values);
    } catch (e) {
      console.warn("DB connector [517] : Failed to run", sql, ...values, e);
      console.trace();
    }
  }

  /**
 * 
 * @param {*} sql 
 * @returns 
 */
  getRows(sql, ...values) {
    this.trace(...arguments);
    try {
      return this.__db.prepare(sql).all(...values);
    } catch (e) {
      console.warn("DB connector [532] : Failed to run", sql, ...values, e);
      console.trace();
    }
  }

  /**
   * 
   * @param {*} d 
   * @returns 
   */
  getRowFromTable(name, key, ...values) {
    let sql = `SELECT * from ${name} WHERE ${key}=?`;
    this.trace(sql, ...values);
    return this.__db.prepare(sql).get(...values);
  }


  /**
   * 
   * @param {*} d 
   * @returns 
   */
  getRowsFromTable(name, key, ...values) {
    let sql = `SELECT * from ${name} WHERE ${key}=?`
    this.trace(sql, ...values);
    return this.__db.prepare(sql).all(...values);
  }



  /**
 * 
 * @returns 
 */
  query(sql) {
    this.trace(`getRows ${sql} with `);
    return this.__db.prepare(sql).all();
  }

  trace(...args) {
    if (ARGV.debugSql || this.get('trace')) {
      this.debug(...args)
    }
  }
  /**
   * 
   */
  isOk() {
    return this._integrity;
  }

  /**
   * 
   * @param {*} name 
   * @returns 
   */
  isReference() {
    return this.name() == 'common';
  }
  /**
   * 
   */
  schema(name) {
    return SCHEMAS[name];
  }

  /**
   * 
   */
  statement(name, type = 'upsert') {
    return this._statement[type][name];
  }


  /**
   * 
   */
  fingerprints(table) {
    let sql = 'SELECT sql FROM sqlite_schema WHERE name = ?';
    if (table) {
      let a = this.getRow(sql, table);
      return Crypto.createHash('md5').update(a.sql).digest('hex');
    }
    let r = {};
    for (var name in SCHEMAS) {
      let s = this.getRow(sql, name);
      r[name] = {
        hash: Crypto.createHash('md5').update(s.sql).digest('hex'),
        sql: s.sql
      }
    }
    return r;
  }
}


// const db = new db_connector();
//let db = null;



// module.exports = function(){
//   if(db) return db;
//   db = new db_connector();
//   return db;
// };

module.exports = db_connector;
