/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/utils/watchFiles.js
 * TYPE : Skelton
 * ===================================================================**/
const Chokidar = require("chokidar");
const Path = require('path');
const Fs = require('fs');
const _a = require('../../lex/attribute');
const _ = require('lodash');
const mfsUtils = require('../../utils');
const { shortPath } = require('../../utils/sync-flags');
const queue = [];
class WatcherDarwain extends mfsUtils {


  /**
   * 
   */
  preProcessEvent(eventtype, path, data) {
    return new Promise((resolve, reject) => {
      let watchedPath = data.watchedPath || data.path;
      if (!watchedPath || !path) {
        //this.debug("Invalid input!!!", watchedPath, path);
        reject({ reason: `invalid ${watchedPath}` });
        return;
      }

      let filename = Path.basename(path);
      if (IGNORED.test(filename)) return reject({ reason: `ignored ${path}` });

      let dir = this.localFile(watchedPath, _a.relative);
      let filepath = Path.join('/', dir, filename);
      let realpath = Path.join(watchedPath, filename);
      this.debug("AAA:102", eventtype, watchedPath, filename);
      let nodetype = data.type;
      let timestamp = new Date().getTime();
      Fs.stat(watchedPath, (error, stat) => {
        if (error) {
          this.debug("AAA:115", error);
          switch (error.code) {
            case 'ENOENT':
              filepath = this.localFile(watchedPath, _a.relative);
              let tag = `${filepath}-delete`;
              if (this.timer[tag]) {
                return reject({ reason: `${tag} is being queued [222]` });
              }
              this.timer[tag] = setTimeout(() => {
                this._deleteNode(filepath, resolve, reject);
                delete  this.timer[tag];
              }, 300);
              break;
            default:
              //this.debug("AAA:112 -- UNPRCOESSED EVENT", error);
              reject({ reason: `irrevelent error code ${error.code}` });
          }
        } else {
          if (stat.isDirectory()) {
            realpath = Path.join(watchedPath, filename);
          } else {
            realpath = watchedPath;
          }
          filepath = this.localFile(realpath, _a.relative);
          if (pendingDownloads.get(filepath)) {
            reject({ reason: `${filepath} is being downloaded` });
            return;
          }
          this.debug("AAA:244: FILEPATH", filepath, stat.isDirectory());
          Fs.stat(realpath, (error, stat) => {
            if (error) {
              return this._deleteNode(filepath, resolve, reject);
            }
            if (stat.isDirectory()) {
              nodetype = 'folder';
            } else {
              nodetype = 'file';
            }
            this.debug("AAA:173: NODETYPE", filepath, pendingDownloads.get(filepath), pendingDownloads.keys());
            if (pendingDownloads.get(filepath)) {
              // this.debug("AAA:148:PENDING", pendingDownloads.get(filepath));
              reject({ reason: `${filepath} is being downloaded` });
            } else {
              //this.debug("AAA:167", s, log);
              this.fslog.upsert({ ...stat, inode: stat.ino, nodetype, eventtype, filepath, timestamp });
              let tag = `${filepath}-${eventtype}`;
              if (this.timer[tag]) {
                return reject({ reason: `${tag} is being queued [277]` });
              }
              this.timer[tag] = setTimeout(() => {
                let r = this.fslog.getEvent(stat, nodetype, timestamp);
                delete this.timer[tag];
                if (r.skipped) {
                  return reject(r);
                }
                r.stat = stat;
                r.name = `${r.nodetype}.${r.eventtype}`;
                switch (r.eventtype) {
                  case 'renamed':
                    this._renameNode(r);
                    resolve(r);
                    break;
                  case 'moved':
                    this._moveNode(r);
                    resolve(r);
                    break;
                  case 'created':
                  case 'modified':
                    resolve(r);
                    break;
                  default:
                    reject(r)
                    return
                }
                this.fslog.clear(stat);
              }, 300);
            }
          });
        }
      });
    })
  }



}
module.exports = WatcherDarwain;
