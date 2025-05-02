
const _a = require('../lex/attribute');
const _ = require('lodash');
const SYNC_ON = 0b10;
const { normalize, dirname, join, extname, basename, resolve } = require("path");

/**
 * 
 * @param {*} obj 
 * @param {*} state 
 */
function toBitwise(obj) {
  let sync = (obj.sync == _a.on) ? SYNC_ON : 0;
  //console.log("ENGINE", sync, (sync&SYNC_ON));
  let mode = (obj.mode == _a.onTheFly) ? 0b01 : 0;
  //console.log("MODE", mode, (mode&0b01));
  return ((sync & SYNC_ON) | (mode & 0b01));
}

function notInList(item, list) {
  //console.log("XXXXXXXXXXXXXX AAA:22", item, list);
  if (item && item.filename) {
    for (let i of list) {
      //console.log("AAA:25", i, i.filepath, item.filename);
      if (!i || !i.filepath || /^\/+$/.test(i.filepath)) continue;
      let re = new RegExp('^' + i.filepath + '.*$');
      let p = join('/', item.filename);
      //console.log("IGNORED", re.test(p), i.filepath, p, re);
      if (re.test(p)) return false;
    }
  }
  return true;
}

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
 * @param {*} item 
 * @returns 
 */
function isVoidObject(item) {
  for (let k in item) {
    //console.log("24", k);
  }
  for (let k in item) {
    //console.log("26", k);
    let v = item[k];
    //console.log("28", k, typeof (v), v);
    if (typeof (v) === 'object') {
      //console.log("30", v);
      for (let x in v) {
        //console.log("31", x, v[x]);
        if (_.isArray(v[x]) && !_.isEmpty(v[x])) return false;
        if (_.isObject(v[x]) && !_.isEmpty(v[x])) {
          if (!isVoidObject(v[x])) return false;
        }
        if (v[x] != null && typeof (v[x]) !== 'object') return false;
      }
      if (v !== null && typeof (v) !== 'object') return false;
    } else {
      //console.log("54", typeof (v), v);
      if (v !== null && typeof (v) !== 'object') return false;
    }

  }
  return true;
}

/**
 * 
 * @param {*} bitwise 
 * @returns 
 */
function fromBitwise(bitwise) {
  bitwise = bitwise & 0b11;
  let sync = bitwise & SYNC_ON ? _a.on : _a.off;
  let mode = bitwise & 0b01 ? _a.onTheFly : _a.immediate;
  return { sync, mode }
}

/**
 * 
 * @param {*} arg 
 * @returns 
 */
function shortPath(arg) {
  if (_.isString(arg)) {
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
    .replace(/\?/g, "")
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
  toBitwise,
  fromBitwise,
  isVoidObject,
  shortPath,
  uniqueFilename,
  notInList,
  utf8ify,
  isFileLocked,
  escapePath,
  normalize: function (p) { normalize(p).unixPath() },
  dirname: function (p) { dirname(p).unixPath() },
  join: function (...p) { join(...p).unixPath() },
  resolve: function (...p) { resolve(...p).unixPath() },
  extname,
  basename
};
