#!/usr/bin/env node
// ================================  *
//   Copyright Xialia.com  2013-2020 *
//   FILE  : 
//   TYPE  : Dev Builder
// ================================  *

const Fs = require('fs');
const _ = require('lodash');
const Minimist = require('minimist');
const Path = require('path');
const Moment = require('moment');
const not_found = [];
const argv = Minimist(process.argv.slice(2));
const Json2md = require('json2md');

let SRC_DIR;
if(argv.from){
  SRC_DIR   = Path.resolve(argv.from);
}else{
  if(process.env.UI_SRC_PATH){
    SRC_DIR   = Path.resolve(process.env.UI_SRC_PATH);
  }else{
    SRC_DIR = process.env.PWD || __dirname;
  }
}

const webpack = require('../resolve')(SRC_DIR);
let ALIASES = {};
/**
 * 
 */
function build_aliases() {
  for (var k in webpack.alias) {
    ALIASES[webpack.alias[k]] = k;
  }
}

/**
 * 
 * @param {*} path 
 * @returns 
 */
function item(path) {
  const tpl_file = Path.resolve(__dirname, 'promise.tpl');
  let template = Fs.readFileSync(tpl_file, 'utf-8');
  let content = String(template).trim().toString();
  const renderer = _.template(content);
  return renderer({ path });
}

/**
 * 
 * @param {*} a 
 */
function fatal(a) {
  console.log(`[Fatal error]: ${a}`);
  process.exit(1);
}

/**
 * 
 * @param {*} rows 
 */
function write_doc(rows) {
  let model = [
    { h1: "Drumee builtins kins" },
    { blockquote: "Automatic generation - DO NOT EDIT" },
    { h2: "Core rendering engine" },
    { p: "See https://drumee.io/_/testing/#/sandbox for examples." },
    { table: { headers: ["kind", "path"], rows } },
  ]
  const kind_file = Path.resolve(SRC_DIR, 'docs', 'api', 'kind.md');

  Fs.writeFileSync(kind_file, Json2md(model));
}

/**
 * 
 * @param {*} items 
 * @returns 
 */
function optimize(items) {
  let kinds = {};
  for (var i of items) {
    if (!kinds[i.kind]) {
      kinds[i.kind] = i;
    } else {
      let f = kinds[i.kind];
      if (i.path != f.path) {
        console.warn(`
          Found kind conflicts [${i.kind}]:
          - Already declared in ${i.path} 
          - Shall be overloaded by ${f.path}\n`);
      } else {
        if (argv.verbose) console.log(`${i.kind} declared multiple times`)
      }
    }
  }
  return _.values(kinds);
}

/**
 * 
 * @param {*} items 
 */
function render(items) {
  const tpl_file = Path.resolve(__dirname, 'classes.tpl');
  const dest_file = Path.resolve(SRC_DIR, 'src/drumee/core/kind/seeds/builtins.js');
  if (!Fs.existsSync(tpl_file)) {
    fatal(`[Template not found]: ${tpl_file}`);
  }
  let data = {
    items: optimize(items),
    filename: dest_file.replace(SRC_DIR, ''),
    year: Moment().year()
  };

  let template = Fs.readFileSync(tpl_file, 'utf-8');
  let content = String(template).trim().toString();
  const renderer = _.template(content);
  Fs.writeFileSync(dest_file, renderer(data), 'utf-8');
}

/**
 * 
 * @param {*} file 
 * @param {*} path 
 * @returns 
 */
function check_sanity(file, path) {
  let files = [];
  for (let ext of webpack.extensions) {
    let p1 = Path.resolve(SRC_DIR, path, `index.${ext}`);
    let p2 = Path.resolve(SRC_DIR, path, `.${ext}`);
    p2 = p2.replace('/.', '.');
    if (Fs.existsSync(p1)) return p1;
    if (Fs.existsSync(p2)) return p2;
    files.push(p1, p2);
  }

  let a = path.split('/');
  let i = a.shift();
  let name = _.last(a);
  for (let ext of webpack.extensions) {
    if (!webpack.alias[i]) continue;
    let m = a.join('/');
    let p1 = Path.resolve(webpack.alias[i], m, `index.${ext}`);
    let p2 = Path.resolve(webpack.alias[i], m.replace(/\/+$/, `.${ext}`));
    let p3 = Path.resolve(webpack.alias[i], m, `${name}.${ext}`);
    p3 = p3.replace('/.', '.');
    let p4 = Path.resolve(webpack.alias[i], `${m}.${ext}`);
    if (Fs.existsSync(p1)) return p1;
    if (Fs.existsSync(p2)) return p2;
    if (Fs.existsSync(p3)) return p3;
    if (Fs.existsSync(p4)) return p4;
    files.push(p1, p2, p3, p4);
  }

  console.log(
    `***** Error occured while building from ${file}. *****`,
    `Could not find class defined by *${path}*`, webpack.alias[i],
    files, path
  );
  not_found.push(path);
  return false;
}


/**
 * 
 */
function make() {
  console.log("Compiling seeds from ....", SRC_DIR);
  build_aliases();
  let data = [];
  let lex = [];
  let libs = [
    "src/drumee",
  ];
  if (argv.libs) {
    libs = argv.libs.split(/[,;:]/);
  }
  const walk = require('walkdir');
  for (let dir of libs) {
    let f = Path.resolve(SRC_DIR, dir);
    console.log("SCANNING", f);
    let files = walk.sync(f);

    let v;
    for (file of files) {
      if (!/(seeds.js)$/.test(file)) continue;
      if (Fs.existsSync(file)) {
        try {
          v = require(file);
        } catch (e) {
          console.log("Skipped file", file);
          continue;
        }
        for (let kind in v) {
          let path = v[kind];
          if (!_.isString(path)) continue;
          let basedir = null;
          if (/^\./.test(path)) {
            basedir = Path.resolve(Path.dirname(file), path);
          } else {
            let [b, d] = path.split(/\/+/);
            basedir = webpack.alias[b];
          }
          if (basedir && Fs.existsSync(basedir)) {
            if (ALIASES[basedir]) {
              path = v[kind];
            } else {
              if (ALIASES[Path.dirname(file)]) {
                path = basedir.replace(Path.dirname(file), ALIASES[Path.dirname(file)]);
              } else {
                let r = Path.resolve(Path.dirname(file), v[kind]);
                path = r.replace(SRC_DIR, '').replace(/^\//, '');
              }
            }
          } else {
            path = basedir.replace(SRC_DIR, '').replace(/^\//, '');
          }
          path = path.replace(/\\+/g, '/');
          data.push({
            kind,
            path,
            func: item(path)
          });
        }
      } else if (!_.isEmpty(file)) {
        console.log(`ERROR : ${file} not found`);
      }
    }
  }
  render(data);
  if (!_.isEmpty(not_found)) {
    console.warn("Following files have not been resolved", not_found);
  }
}

make();
