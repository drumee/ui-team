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

const remote = {
  filepath: 'TEXT PRIMARY KEY NOT NULL',
  ownpath: 'TEXT',
  nid: 'VARCHAR(16) NOT NULL UNIQUE',
  hub_id: 'VARCHAR(16)',
  home_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  changed: 'BOOLEAN', 
  effective: 'BOOLEAN', 
  filename: 'VARCHAR(255)',
  filetype: 'VARCHAR(255)',
  md5Hash: 'VARCHAR(32)',
  filesize: 'DOUBLE',
  privilege: 'INTEGER DEFAULT 0',
  status: 'VARCHAR(255)',
  isalink: 'BOOLEAN',
  ext: 'VARCHAR(20)',
  ctime: 'INTEGER NOT NULL',
  mtime: 'INTEGER NOT NULL',
};

const remote_old = {...remote};

// Local media manifest. This table is the snapshot of the remote media manifeste
// when the the application start running. It's cleared on every launch.
const local = {
  filepath: 'TEXT PRIMARY KEY NOT NULL',
  inode: 'INTERGER NOT NULL UNIQUE',
  nid: 'VARCHAR(16) NOT NULL UNIQUE',
  hub_id: 'VARCHAR(16) NOT NULL',
  pid: 'VARCHAR(16) NOT NULL',
  synced: 'BOOLEAN', 
  effective: 'BOOLEAN', 
  filename: 'VARCHAR(255) NOT NULL',
  filetype: 'VARCHAR(255) NOT NULL',
  filesize: 'DOUBLE',
  ext: 'VARCHAR(20)',
  atimeMs: 'REAL',
  birthtimeMs: 'REAL',
  ctimeMs: 'REAL NOT NULL',
  mtimeMs: 'REAL NOT NULL',
  ctime: 'INTEGER',
  mtime: 'INTEGER'
};

const inodes = {
  inode: 'INTERGER NOT NULL UNIQUE'
};

// User Filesystem data 
const fsnode = {
  inode: 'INTERGER PRIMARY KEY NOT NULL',
  filepath: 'TEXT NOT NULL UNIQUE',
  filename: 'TEXT NOT NULL',
  ext: 'VARCHAR(128)',
  nodetype: 'VARCHAR(128)',
  changed: 'BOOLEAN', 
  effective: 'BOOLEAN', 
  filesize: 'INTEGER NOT NULL',
  birthtimeMs: 'REAL NOT NULL',
  ctimeMs: 'REAL NOT NULL',
  mtimeMs: 'REAL NOT NULL',
};
const fsnode_old = {...fsnode};

// This table is used to control syncing with remote
// id is the remote changelog id
// effective = 1 mean sync enabled
const fschangelog = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  synced: 'BOOLEAN',
  event: 'VARCHAR(100)',
  inode: 'INTERGER NOT NULL',
  filepath: 'TEXT NOT NULL UNIQUE',
  filename: 'TEXT NOT NULL',
  ext: 'VARCHAR(128)',
  nodetype: 'VARCHAR(128)',
  effective: 'BOOLEAN', 
  filesize: 'INTEGER NOT NULL',
  birthtimeMs: 'REAL NOT NULL',
  ctimeMs: 'REAL NOT NULL',
  mtimeMs: 'REAL NOT NULL',
  args: 'TEXT',
};


// This table is used to control syncing with remote
// id is the remote changelog id
// effective = 1 mean sync enabled
const remote_changelog = {
  id: 'INTEGER PRIMARY KEY',
  seq: 'INTEGER',
  synced: 'BOOLEAN',
  effective: 'BOOLEAN',
  event: 'VARCHAR(100)',
  filepath: 'TEXT KEY NOT NULL',
  nid: 'VARCHAR(16)',
  hub_id: 'VARCHAR(16)',
  home_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  filename: 'VARCHAR(255)',
  filetype: 'VARCHAR(255)',
  md5Hash: 'VARCHAR(32)',
  filesize: 'DOUBLE',
  privilege: 'INTEGER DEFAULT 0',
  status: 'VARCHAR(255)',
  isalink: 'BOOLEAN',
  ext: 'VARCHAR(20)',
  ctime: 'INTEGER NOT NULL',
  mtime: 'INTEGER NOT NULL',
  args: 'TEXT',
};

// Local file hash
const hash = {
  inode: 'INTERGER PRIMARY KEY NOT NULL',
  filepath: 'TEXT NOT NULL UNIQUE',
  filesize: 'INTEGER NOT NULL',
  mtimeMs: 'REAL NOT NULL',
  md5: 'VARCHAR(32)'
};

const tmp_ids = {
  filepath: 'TEXT PRIMARY KEY NOT NULL',
  inode: 'INTERGER NOT NULL UNIQUE',
  nid: 'VARCHAR(16) NOT NULL UNIQUE'
};

// Trash media manifest. This table is the snapshot of the remote trash content
// when the the application start running. It's cleared on every launch.
const trash = {
  nid: 'VARCHAR(16) NOT NULL',
  pid: 'VARCHAR(16) NOT NULL',
  hub_id: 'VARCHAR(16)',
  filename: 'VARCHAR(255)',
  filetype: 'VARCHAR(255)',
  filesize: 'DOUBLE',
  ext: 'VARCHAR(20)',
  ctime: 'INTEGER NOT NULL',
  mtime: 'INTEGER NOT NULL',
};


// To handle mutex on same resource
const semaphore = {
  id: 'INTEGER',
  timestamp: 'INTEGER',
  eventname: 'VARCHAR(255) NOT NULL',
  filepath: 'TEXT',
  origin: 'VARCHAR(56)',
  inode: 'INTERGER',
  nid: 'VARCHAR(16)',
  hub_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
};

// Local source file. This table records source of media being copied or moved.
const source = {
  inode: 'INTEGER PRIMARY KEY',
  eventId: 'INTERGER',
  filepath: 'TEXT NOT NULL UNIQUE',
  nid: 'VARCHAR(16)',
  hub_id: 'VARCHAR(16)',
  home_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  filetype: 'VARCHAR(255)',
  filesize: 'DOUBLE',
  privilege: 'INTERGER',
  dirname: 'TEXT NOT NULL',
  filename: 'TEXT NOT NULL',
  filepath: 'TEXT NOT NULL',
  ext: 'VARCHAR(30)',
  ctime: 'INTEGER',
  mtime: 'INTEGER',
};

const destination = {
  inode: 'INTEGER PRIMARY KEY',
  eventId: 'INTERGER',
  filepath: 'TEXT NOT NULL UNIQUE',
  nid: 'VARCHAR(16)',
  hub_id: 'VARCHAR(16)',
  home_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  filetype: 'VARCHAR(255)',
  filesize: 'DOUBLE',
  privilege: 'INTERGER',
  dirname: 'TEXT NOT NULL',
  filename: 'TEXT NOT NULL',
  filepath: 'TEXT NOT NULL',
  ext: 'VARCHAR(30)',
  ctime: 'INTEGER',
  mtime: 'INTEGER',
};


const event = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  timestamp: 'INTEGER',
  ctime: 'INTEGER NOT NULL',
  mtime: 'INTEGER NOT NULL',
  name: 'VARCHAR(255) NOT NULL',
  nid: 'VARCHAR(16) DEFAULT NULL',
  hub_id: 'VARCHAR(16)',
  home_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  inode: 'INTERGER',
  md5Hash: 'VARCHAR(30)',
  privilege: 'INTEGER DEFAULT 0',
  isalink: 'BOOLEAN',
  ext: 'VARCHAR(30)',
  status: 'VARCHAR(30) DEFAULT NULL',
  sanity: 'VARCHAR(30) DEFAULT NULL',
  filetype: 'VARCHAR(128)',
  filepath: 'TEXT NOT NULL',
  ownpath: 'TEXT NOT NULL',
  filename: 'TEXT DEFAULT NULL',
  priority: 'INTEGER DEFAULT 0',
  args: 'TEXT DEFAUL "{}"',
};

// Events journal emited by User Filesystem
const journal = {
  inode: 'INTERGER PRIMARY KEY',
  eventtype: 'VARCHAR(64) NOT NULL',
  nodetype: 'VARCHAR(64) NOT NULL',
  filepath: 'TEXT NOT NULL',
  ctime: 'INTEGER NOT NULL',
  eventId: 'INTEGER'
};


// Log of raw events emited by User Filesystem
const fslog = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  inode: 'INTERGER',
  filepath: 'TEXT NOT NULL',
  filename: 'TEXT NOT NULL',
  source: 'TEXT',
  nodetype: 'VARCHAR(128)',
  eventtype: 'VARCHAR(64) NOT NULL',
  filesize: 'INTEGER',
  birthtimeMs: 'INTEGER',
  ctimeMs: 'REAL',
  mtimeMs: 'REAL',
};

// Event emited by User Filesystem
const fsevent = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  eventId: 'INTERGER',
  timestamp: 'INTEGER',
  name: 'VARCHAR(255) NOT NULL',
  inode: 'INTERGER',
  filepath: 'TEXT NOT NULL',
};


// Task being running
const task = {
  id: 'INTEGER', //  = event.id
  timestamp: 'INTEGER',  //  = event.timestamp
  filepath: 'TEXT',
  state: 'VARCHAR(16)',
  retry: 'INTERGER DEFAULT 0',
  worker: 'VARCHAR(255) NOT NULL',
};


const ignore = {
  filepath: 'TEXT PRIMARY KEY NOT NULL',
  inode: 'INTERGER',
  nid: 'VARCHAR(16)',
  hub_id: 'VARCHAR(16)',
  pid: 'VARCHAR(16)',
  bound: "VARCHAR(16)",
};


const syncOpt = {
  filepath: 'TEXT PRIMARY KEY NOT NULL',
  mode: 'VARCHAR(25)',
  effective: 'BOOLEAN',
  direction:'VARCHAR(120) DEFAULT "duplex"',
};


const organization = {
  id: 'TEXT PRIMARY KEY NOT NULL',
  domain_id: 'INTEGER NOT NULL',
  name: 'VARCHAR(256)',
  domain: 'VARCHAR(256)'
};

const user = {
  sid: 'TEXT PRIMARY KEY NOT NULL',
  id: 'VARCHAR(16) NOT NULL',
  domain: 'VARCHAR(256) NOT NULL',
  username: 'VARCHAR(256) NOT NULL',
  email: 'VARCHAR(512)',
  firstname: 'VARCHAR(256)',
  lastname: 'VARCHAR(256)',
};

const endpoint = {
  sid: 'TEXT PRIMARY KEY NOT NULL',
  uid: 'VARCHAR(80) DEFAULT "ffffffffffffffff"',
  host: 'VARCHAR(80)',
  path: 'VARCHAR(256) DEFAULT "main"',
  keysel: 'VARCHAR(256) DEFAULT "regsid"',
  ctime: 'INTEGER NOT NULL',
  mtime: 'INTEGER NOT NULL',
  domain_id: 'INTEGER DEFAULT 1'
};

const settings = {
  id: 'TEXT PRIMARY KEY NOT NULL',
  endpoint: 'VARCHAR(256) DEFAULT "main"'
};

const filecap = {
  extension: 'TEXT PRIMARY KEY NOT NULL',
  category: 'VARCHAR(120) DEFAULT "other"',
  mimetype: 'VARCHAR(120)',
  capability: 'VARCHAR(120)'
};

const callback = {
  event_id: 'INTEGER UNIQUE',
  func: 'VARCHAR(256) NOT NULL',
  args: 'TEXT NOT NULL',
};

const schema = {
  name: 'VARCHAR(256) PRIMARY KEY NOT NULL',
  version: 'VARCHAR(128)',
  ctime: 'INTEGER NOT NULL',
};



module.exports = {
  callback,
  destination,
  endpoint,
  event,
  filecap,
  fschangelog,
  fsevent,
  fslog,
  fsnode_old,
  fsnode,
  hash,
  inodes,
  journal,
  local,
  organization,
  remote_changelog,
  remote_old,
  remote,
  schema,
  semaphore,
  settings,
  source,
  syncOpt,
  task,
  tmp_ids,
  trash,
  user,
};
