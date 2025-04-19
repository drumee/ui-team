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
const { isString } = require('lodash');
const { normalize, dirname, join, extname, basename, resolve } = require("path");

/**

/**
 * 
 * @param {*} filePath 
 * @param {*} mode 
 * @returns 
 */
function isFileLocked(filePath, mode = 'w+') {
  const { close, open } = require('fs');
  return new Promise((resolve) => {
    open(filePath, mode, function (err, fd) {
      if (err) {
        resolve(err.code);
      } else {
        close(fd, () => {
          resolve(false);
        })
      }
    })
  })
}




/**
 * 
 * @param {*} arg 
 * @returns 
 */
function shortPath(arg) {
  if (isString(arg)) {
    filepath = arg;
  } else {
    filepath = arg.filepath;
  }
  if (!filepath) return '.';
  const re = new RegExp('^' + USER_HOME_DIR.unixPath());
  filepath = filepath.unixPath();
  filepath = filepath.replace(re, '');
  return filepath;
}

/**
 * 
 * @param {*} arg 
 * @returns 
 */
function uniqueFilename(siblings, filepath) {
  let name = basename(filepath);
  let dirname = dirname(filepath);
  let ext = extname(filepath);
  const re = new RegExp(ext + '$');
  name = name.replace(re, '');
  let n = name.match(/\(\d+\)$/);
  if (!n) {
    name = `${name}(1)`
  } else if (n[0]) {
    n = n[0].replace(/[\(\)]+/g, '');
    n = (parseInt(n) || 0) + 1;
    name = name.replace(/\(\d+\)$/, '');
    name = `${name}(${n})`;
    //console.log("nam 102", n, name);
    while (siblings.includes(name)) {
      n++;
      name = name.replace(/\(\d+\)$/, '');
      name = `${name}(${n})`;
      //console.log("name 107", n, name);
    }

  } else {
    name = `${name}(100)`
  }
  return { filepath: resolve(dirname, name + ext), filename: name };
}

/**
 * 
 */
function utf8ify(str) {
  return Buffer.from(str, 'utf-8').toString();
}

function escapePath(str) {
  return str.replace(/\\/g, "\\\\")
    .replace(/'/g, "\'")
    .replace(/\/+/g, "/")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/"/g, '\"');
}



module.exports = {
  shortPath,
  uniqueFilename,
  utf8ify,
  isFileLocked,
  escapePath,
  normalize: function (p) { return normalize(p).unixPath() },
  dirname: function (p) { return dirname(p).unixPath() },
  join: function (...p) { return join(...p).unixPath() },
  resolve: function (...p) { return resolve(...p).unixPath() },
  realpath: function (p) { return normalize(p) },
  extname,
  basename
};
