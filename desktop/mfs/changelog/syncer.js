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

const Attr = require("../../lex/attribute");
const { privilege } = require("../../lex/constants");
const { isEmpty, isArray, values } = require("lodash");
const mfsUtils = require("../utils");
const ACTIONS = Object.freeze({
  'media.upload': 'media.init',
  'media.move': 'media.move',
  'media.rename': 'media.rename',
  'media.make_dir': 'media.init',
  'media.trash': 'media.trash',
  'media.copy': 'media.init',
  'media.restore_into': 'media.init'
})

const SERVICES_MAP = {
  'file.changed': 'media.upload'
}
const { normalize } = require("path");

/**
 * 
 */
function selectLocalChanges() {
  function event(i, args) {
    let types = [
      "deleted", "created", "renamed", "moved", "changed", "copied", "cloned"
    ]
    let b = `REPLACE INTO fschangelog SELECT NULL, NULL, NULL, f.nodetype || '.${types[i]}', f.*`;
    if (!args) {
      return `${b}, NULL`
    }
    return `${b}, f.inode`
  }
  /** r: referance tbale */
  /** d: destination table */
  let seq = [
    `${event(0, 0)} FROM fsnode_old f WHERE filepath NOT IN (SELECT filepath FROM fsnode)`,
    `${event(1, 0)} FROM fsnode f WHERE filepath NOT IN (SELECT filepath FROM fsnode_old)`,
    `${event(2, 1)} FROM fsnode f INNER join fsnode_old o on f.inode=o.inode WHERE f.filename!=o.filename`,
    `${event(3, 1)} FROM fsnode f INNER join fsnode_old o on f.inode=o.inode WHERE f.filepath!=o.filepath AND f.filename=o.filename`,
    `${event(4, 0)} FROM fsnode f INNER join fsnode_old o on f.inode=o.inode WHERE f.mtimeMs!=o.mtimeMs AND f.filename=o.filename AND f.nodetype='file'`,
  ]
  let res = [];
  let no_sys = ` AND f.nodetype != 'system'`
  for (let s of seq) {
    res.push(`${s} ${no_sys}`)
  }
  console.log("AAA:65", res)
  return res;
}

/**
 * 
 */
function selectRemoteChanges() {
  function event(i, args) {
    let types = [
      "deleted", "created", "renamed", "moved", "changed", "copied", "cloned"
    ]
    let b = `INSERT OR IGNORE INTO remote_changelog SELECT NULL, NULL, 'media.${types[i]}', r.*`;
    if (!args) {
      return `${b}, NULL`
    }
    return `${b}, r.nid`
  }
  /** r: referance tbale */
  /** d: destination table */
  let seq = [
    `${event(0, 0)} FROM remote_old r WHERE filepath NOT IN (SELECT filepath FROM remote)`,
    `${event(1, 0)} FROM remote r WHERE filepath NOT IN (SELECT filepath FROM remote_old)`,
    `${event(2, 1)} FROM remote r INNER join remote_old o on r.nid=o.nid WHERE r.filename!=o.filename AND r.pid=o.pid `,
    `${event(3, 1)} FROM remote r INNER join remote_old o on r.nid=o.nid WHERE r.filename=o.filename AND r.pid!=o.pid `,
    `${event(4, 0)} FROM remote r INNER join remote_old o on r.nid=o.nid WHERE r.md5Hash!=o.md5Hash AND r.filename=o.filename AND r.filetype NOT IN('folder', 'hub', 'root')`,
  ]
  return seq;
}

/**
 * 
 */
function getEventName(name) {
  return ACTIONS[name]
}

class Changelog extends mfsUtils {
  /**
   *
   */
  initialize(opt) {
    super.initialize(opt);

    this._done = true;
    this._moving = null;
    this._onTaskEnded = this._onTaskEnded.bind(this);

    this.syncOpt = {
      ...this.syncOpt,
      ...require("../utils/sync-opt")(this),
    };

    this.hash = {
      ...this.hash,
      ...require("../utils/hash")(this),
    };

    this.remote = {
      ...this.remote,
      ...require("../utils/remote")(this),
    };

    this.oldLog = {}
    mfsScheduler.on(Attr.terminated, this._onTaskEnded)
  }

  /**
   * 
   */
  getSyncState(arg) {
    let { filepath } = arg;
    this.debug("AAA:63", filepath, this.syncOpt.getNodeState(arg))
  }

  /**
   * 
   */
  setChangelogState(item, state = 1) {
    let { id } = item;
    let seq = [
      `UPDATE remote_changelog SET synced=? WHERE id=?`,
      `UPDATE fschangelog SET synced=? WHERE id=?`,
    ]
    this.db.serialize(seq, state, id)
  }


  /**
   * 
   */
  async skipUnchanged() {
    let svc = `event IN('media.upload', 'media.new', 'media.replace', 'media.make_dir', 'media.init')`;
    let sql = `
      SELECT r.* FROM remote_changelog r INNER JOIN hash h 
      ON h.filepath=r.filepath WHERE r.md5Hash=h.md5 AND
      filetype NOT IN ('folder', 'hub') AND ${svc}
      UNION ALL
      SELECT r.* FROM remote_changelog r INNER JOIN fsnode f 
      ON f.filepath=r.filepath WHERE filetype IN ('folder', 'hub') AND ${svc}
    `;
    let nodes = this.db.getRows(sql);
    let seq = [];
    let synced = `UPDATE remote_changelog SET synced=1 WHERE`;
    let unsynced = `UPDATE remote_changelog SET synced=0 WHERE`;
    for (let node of nodes) {
      let { id, filepath, md5Hash } = node;
      if (!md5Hash && !this.isBranch(node)) {
        let md5Hash = await this.hash.getMd5(node);
        let remote = this.remote.row(node, Attr.filepath, Attr.nid);
        this.debug("AAA:148", remote, md5Hash)
      }
      if (this.localFile(node)) {
        seq.push(`${synced} id ='${id}'`);
      } else {
        seq.push(`${unsynced} id ='${id}'`);
      };
    }
    if (seq.length) this.db.serialize(seq);
  }


  /**
   * 
   */
  skipTrashOnVoid() {
    let sql = `SELECT * FROM remote_changelog WHERE 
      (synced=0 OR synced IS NULL) AND event IN ('media.trash', 'media.remove')`;
    let items = this.db.getRows(sql);
    let seq = []
    for (let item of items) {
      let exists = this.localFile(item);
      if (!exists) {
        seq.push(`UPDATE remote_changelog SET synced=1 WHERE id=${item.id}`)
      }
    }
    if (seq.length) this.db.serialize(seq);
  }


  /**
   * 
   */
  async normalizeMovingVoid() {
    let sql = `SELECT * FROM remote_changelog WHERE 
      event IN('media.move', 'media.rename') AND (synced=0 OR synced IS NULL)`;
    let events = this.db.getRows(sql);

    for (let evt of events) {
      let src = this.localFile(evt, Attr.node);
      if (src.inode) {
        continue;
      }
      let dest;
      if (evt.args) {
        dest = JSON.parse(evt.args).dest;
      }
      if (!dest) {
        continue;
      }
      let stat = this.localFile(dest, Attr.stat);
      if (stat.nodetype == Attr.folder) {
        this.setChangelogState(evt)
      } else if (stat.nodetype == Attr.file) {
        let hash = await this.hash.getMd5(stat);
        let remote = this.remote.row(dest, Attr.filepath, Attr.nid)
        if (remote && hash == remote.md5Hash) {
          this.setChangelogState(evt)
        } else {
          evt.args = '{}';
          let { id } = evt;
          let arg = { ...evt, ...dest, event: 'media.init', id, synced: 0 };
          this.remote_changelog.upsert(arg);
        }
      } else {
        evt.args = '{}';
        let { id } = evt;
        let arg = { ...evt, ...dest, event: 'media.init', id, synced: 0 };
        this.remote_changelog.upsert(arg);

      }

    }
    //this.db.serialize(seq);
  }

  /**
   * 
   */
  async normalizeRemote() {
    let sql = `SELECT * FROM remote_changelog WHERE synced IS NULL OR synced=0`;
    let items = this.db.getRows(sql);
    let events = {};

    for (let item of items) {
      let { effective } = this.syncOpt.isEnabled(item);
      if (!effective) continue;
      let { nid, event } = item;
      if (!events[event]) events[event] = {};
      if (!events[event][nid]) events[event][nid] = [];
      events[event][nid].push(item);
    }
    let first, last, dest;
    for (let event in events) {
      let services = events[event]
      for (let nid in services) {
        let nodes = [...services[nid]];
        switch (event) {
          case 'media.move':
          case 'media.rename':
            /** When moving same item into several localtion, consider moving
             * directly from first to last
             */
            first = nodes.shift();
            last = nodes.pop();
            while (first && !this.localFile(first)) {
              sql = `UPDATE remote_changelog SET synced=1 WHERE id=?`;
              this.db.run(sql, first.id)
              first = nodes.shift();
            }
            if (first && last) {
              sql = `UPDATE remote_changelog SET synced=1 WHERE id=?`;
              this.db.run(sql, first.id)
              let { src } = JSON.parse(first.args);
              let { dest } = JSON.parse(last.args);
              sql = `UPDATE remote_changelog SET filepath=?, filename=?, args=? WHERE id=?`;
              this.db.run(sql, src.filepath, src.filename, JSON.stringify({ src, dest }), last.id)
              for (let node of nodes) {
                sql = `UPDATE remote_changelog SET synced=1 WHERE id=?`;
                this.db.run(sql, node.id)
              }
            }
            break;
          case 'media.trash':
          case 'media.remove':
            /** Since we want to trash, no need to keep non existent entries */
            for (let evt of nodes) {
              if (!this.localFile(evt)) {
                sql = `UPDATE remote_changelog SET synced=1 WHERE id=? AND seq=?`;
                this.db.run(sql, evt.id, evt.seq)
              } else {
                let remote = this.remote.row(evt, Attr.filepath);
                if (remote) {
                  sql = `UPDATE remote_changelog SET synced=1 WHERE id=? AND seq=?`;
                  this.db.run(sql, evt.id, evt.seq)
                } else if (!evt.args) {
                  sql = `UPDATE remote_changelog SET args=? WHERE id=? AND seq=?`;
                  this.db.run(sql, JSON.stringify({ src: evt }), evt.id, evt.seq)
                }
              }
            }
            break;
          case 'media.new':
            for (let evt of nodes) {
              let remote = this.remote.row(evt, Attr.nid);
              if (!remote || !remote.nid) {
                /** Deleted since the event */
                sql = `UPDATE remote_changelog SET synced=1 WHERE id=? AND seq=?`;
                this.db.run(sql, evt.id, evt.seq)
              } else {
                if (!evt.args) {
                  sql = `UPDATE remote_changelog SET args=? WHERE id=? AND seq=?`;
                  this.db.run(sql, JSON.stringify({ src: evt }), evt.id, evt.seq)
                }
              }
            }
            break;
          case 'media.copy':
            for (let evt of nodes) {
              let { src, dest } = JSON.parse(evt.args);
              let remote = this.remote.row(dest, Attr.nid);
              if (remote && this.localFile(dest)) {
                sql = `UPDATE remote_changelog SET synced=1 WHERE id=? AND seq=?`;
                this.db.run(sql, evt.id, evt.seq)
              }
            }
            break;
        }
      }
    }
  }


  async normalizeFs() {
    let sql = `SELECT * FROM fschangelog WHERE synced IS NULL OR synced=0`;
    let items = this.db.getRows(sql);
    let events = {};
    for (let item of items) {
      let { effective } = this.syncOpt.isEnabled(item);
      if (!effective) {
        sql = `DELETE FROM fschangelog WHERE id=?`;
        this.db.run(sql, item.id)
        continue;
      }
      let { inode, event } = item;
      if (!events[event]) events[event] = {};
      if (!events[event][inode]) events[event][inode] = [];
      events[event][inode].push(item);
    }

    let first, last, dest;
    for (let event in events) {
      let services = events[event]
      for (let inode in services) {
        let nodes = [...services[inode]];
        switch (event) {
          case 'file.created':
          case 'folder.created':
            this.debug("AAA:376", nodes)
            for (let evt of nodes) {
              if (!this.localFile(evt)) {
                sql = `UPDATE fschangelog SET synced=1 WHERE id=?`;
                this.db.run(sql, evt.id)
              } else {
                sql = `UPDATE fschangelog SET args=? WHERE id=?`;
                this.db.run(sql, JSON.stringify({ src: evt }), evt.id)
              }
            }
            break;
          case 'file.renamed':
          case 'folder.renamed':
          case 'file.moved':
          case 'folder.moved':
            for (let evt of nodes) {
              let src = this.fsnode_old.row(evt, Attr.inode);
              let dest = this.fsnode.row(evt, Attr.inode);
              let remote = this.remote.row(dest, Attr.filepath);
              if (remote && remote.nid) {
                sql = `UPDATE fschangelog SET synced=1 WHERE id=?`;
                this.db.run(sql, evt.id)
              } else {
                sql = `UPDATE fschangelog SET args=? WHERE id=?`;
                this.db.run(sql, JSON.stringify({ src, dest }), evt.id)
              }
            }
            break;
          case 'file.deleted':
          case 'folder.deleted':
            for (let evt of nodes) {
              let remote = this.remote.row(evt, Attr.filepath);
              if (!remote || !remote.nid) {
                sql = `UPDATE fschangelog SET synced=1 WHERE id=?`;
                this.db.run(sql, evt.id)
              } else {
                sql = `UPDATE fschangelog SET args=? WHERE id=?`;
                this.db.run(sql, JSON.stringify({ src: evt }), evt.id)
              }
            }
            break;
        }
      }
    }
  }

  /**
   * 
   * @param {*} row 
   * @returns 
   */
  addEvent(row) {
    let { synced, id, timestamp, event, src, dest, seq } = row;
    if (src.md5Hash == null) {
      src.md5Hash = ""
    }
    if (src.privilege == null) {
      src.privilege = privilege.delete;
    }
    if (src.isalink == null) {
      src.isalink = 0;
    }
    if (src.status == null) {
      src.status = Attr.active;
    }
    let item = { ...src, id, timestamp, event };
    if (!item.filepath || !item.ownpath || !item.event) return;
    item.filepath = normalize(item.filepath);
    item.ownpath = normalize(item.ownpath);
    let sync = this.syncOpt.getNodeState(item)
    this.debug("AAAA:442 getRemoteChanges", sync, item.filepath)
    if (!this.syncOpt.getNodeState(item)) {
      return 0;
    }
    item.args = JSON.stringify({ src, dest });
    item.id = id;
    item.seq = seq;
    item.synced = synced;
    item.effective = 1;
    this._populate.run(item);
    return 1
  }

  /**
   * Must be called before starting any scan
   * Snapshot previous fsnode into fsnode_old
   * fsnode must be populated only after this stage
   */
  prepare() {
    let { fsnode } = this.db.getRow(`SELECT count(*) fsnode FROM fsnode_old`);
    let { remote } = this.db.getRow(`SELECT count(*) remote FROM remote_old`);
    this.oldLog = {
      remote, fsnode
    }
    let seq = [
      `DELETE FROM fsnode_old`,
      `INSERT INTO fsnode_old SELECT * FROM fsnode`,
      `DELETE FROM fsnode`,
    ]
    this.db.serialize(seq);
  }

  /**
   * 
   * @param {*} 
   */
  async populateLocalChanges() {
    this.db.serialize(selectLocalChanges());

    await this.normalizeFs();
    let seq = [
      /** Skip unchanged files */
      `UPDATE fschangelog SET synced=1 WHERE filepath IN (
      SELECT h.filepath FROM hash h INNER JOIN remote r ON 
      h.filepath=r.filepath INNER JOIN fsnode f ON 
      r.filepath=f.filepath AND h.md5 = r.md5Hash) AND nodetype='file'`,

      /** Skip already created */
      // `UPDATE fschangelog SET synced=1 WHERE event='folder.created' 
      // AND filepath IN (SELECT filepath FROM fsnode_old WHERE nodetype='folder')`,

      /** Skip already deleted */
      // `UPDATE fschangelog SET synced=1 WHERE event IN('folder.deleted', 'file.deleted')  
      // AND filepath NOT IN (SELECT filepath FROM remote)`

    ]

    this.db.serialize(seq);
  }

  /**
   * 
   */
  getSyncDisabled() {
    let sql = `SELECT r.hub_id FROM remote r INNER JOIN syncOpt s 
      ON r.filepath=s.filepath WHERE effective=0 AND r.filetype='hub'`;
    let rows = this.db.getRows(sql);
    let res = []
    for (let r of rows) {
      res.push(r.hub_id)
    }
    return res;
  }
  /**
   * 
   */
  async populateRemoteChanges() {
    let sql = `SELECT max(id) id FROM remote_changelog`;
    let { id } = this.db.getRow(sql) || { id: 0 };
    let args = { hub_id: Account.user.get(Attr.id) };
    if (id) {
      args.id = id + 1;
    } else {
      args.last = 200;
    }
    args.exclude = this.getSyncDisabled();

    let data = await this.postService(SERVICES.changelog.read, args);
    this._populate = this.db.populate("remote_changelog", "INSERT OR IGNORE");
    const transaction = this.db.transaction((rows) => {
      for (const row of rows) {
        if (!row || !row.event || !row.src) continue;
        let seq = 1;
        if (isArray(row.src)) {
          let { id, timestamp, event } = row;
          for (const src of row.src) {
            if (id) {
              src.synced = 0;
            } else {
              src.synced = 1;
            }
            this.addEvent({ id, timestamp, event, src, seq })
            seq++;
          }
          continue
        }
        if (id) {
          row.synced = 0;
        } else {
          row.synced = 1;
        }
        row.seq = seq;
        this.addEvent(row)
      }
    });
    transaction(data);
    this._remoteLog = 1;
    this._populating = 0;
  }

  /**
   * 
   */
  async populate() {
    await this.populateLocalChanges();
    await this.populateRemoteChanges();
  }
  /**
   * 
   */
  _onTaskEnded(evt) {
    let { inode, name, args, nid, seq, id } = evt;
    let { syncId, src, dest, changelog } = JSON.parse(args);
    let event = SERVICES_MAP[name] || name;
    let sql;
    //this.debug("[_onTaskEnded]:629", evt)
    if (changelog && changelog.syncId) {
      let { event, timestamp, syncId: id } = changelog
      this.remote_changelog.upsert({
        ...changelog.dest,
        ...changelog.src,
        timestamp,
        id,
        seq: seq || 1,
        event,
        synced: 1
      });
    } else {
      if (inode && id) {
        sql = `UPDATE fschangelog SET synced=1 
        WHERE id=? OR (inode=? AND event=?) `;
        this.db.run(sql, id, inode, name)
      }
      if (nid) {
        sql = `UPDATE remote_changelog SET synced=1 
        WHERE (id=? AND seq=?) OR (nid=? AND event=?)`;
        this.db.run(sql, nid, event, syncId, name)
      }
    }
  }

  /**
   * 
   */
  _isSynced(data = {}) {
    let sql = `SELECT * FROM synclog WHERE id=?`;
    let { synced } = this.db.getRow(sql, data.id) || {};
    return synced;
  }

  /**
   * 
   */
  getLastSync() {
    let sql = `SELECT * FROM `
  }

  /**
  * 
  */
  async getRemoteChanges(force = 0) {
    if (!this.syncOpt.rootSettings().effective) {
      return []
    }
    if (!this._remoteLog || force) {
      await this.populateRemoteChanges()
    }
    await this.normalizeRemote();

    let sql = `SELECT * FROM remote_changelog WHERE (synced IS NULL OR synced=0) AND effective=1`;
    let rows = this.db.getRows(sql);
    return rows;
  }

  /**
  * 
  */
  async getLocalChanges() {
    if (!this.syncOpt.rootSettings().effective) {
      return []
    }
    let sql = `SELECT * FROM fschangelog WHERE synced IS NULL or synced=0 LIMIT 50`;
    let r = this.db.getRows(sql);
    return r;
  }


  /**
   * 
   */
  async resync(force) {
    let data = await this.getRemoteChanges(force);
    for (let evt of data) {
      evt.name = getEventName(evt.event);
      // evt.args = {};
      // switch (evt.name) {
      //   case "media.rename":
      //   case "media.move":
      //     let dest = JSON.parse(evt.args);
      //     delete evt.args;
      //     let src = { ...evt };
      //     evt.args = {
      //       src,
      //       dest
      //     }
      //     break;

      // }
      if (!this._isSynced(evt)) {
        evt.args.syncId = evt.id
        mfsScheduler.log(evt);
      }
      //
    }
  }

}
module.exports = Changelog;
