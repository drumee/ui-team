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
const { isString } = require("lodash");
const { normalize, dirname, join } = require("./path");
const Attr = require("../../lex/attribute");

const { createHash } = require('crypto');
const {
  createReadStream, mkdir, existsSync, createWriteStream
} = require("fs");

module.exports = function (worker) {
  const db = worker.db;
  return {

    getMd5: (stat) => {
      return new Promise((resolve, reject) => {
        if (!stat || !existsSync(stat.realpath)) {
          return resolve(null)
        }
        const { inode, filepath, filesize } = stat;
        let sql = `SELECT * FROM hash WHERE filepath=?`;
        let { md5, mtimeMs } = db.getRow(sql, filepath) || {};
        if (md5 && mtimeMs == stat.mtimeMs) {
          return resolve(md5)
        }
        const localStream = createReadStream(stat.realpath);
        let hash = createHash('md5');
        localStream.on("end", () => {
          let md5 = hash.digest('hex');
          db.putInToTable('hash', {
            md5, filesize, filepath, inode, mtimeMs: stat.mtimeMs
          });
          resolve(md5);
        });

        localStream.on("data", (chunk) => {
          hash.update(chunk);
        });
      })

    },

  };
};
