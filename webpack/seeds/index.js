#!/usr/bin/env node

const { readFileSync, statSync, mkdirSync, writeFileSync, existsSync } = require('fs');
const { template, values, isString, isEmpty } = require('lodash');
const { resolve, join, dirname } = require('path');
const Moment = require('moment');
const not_found = [];
const Json2md = require('json2md');
const args = require('./args')
let src_base = args.app_base;

let SRC_DIR = args.from || args.src_dir;
if (!SRC_DIR) {
  if (process.env.UI_SRC_PATH) {
    SRC_DIR = resolve(process.env.UI_SRC_PATH);
  } else {
    SRC_DIR = process.env.PWD || __dirname;
  }
}

const webpack = require('../resolve')(SRC_DIR);
let ALIASES = {};
let REV_ALIASES = {};
/**
 * 
 */
function build_aliases() {
  for (var k in webpack.alias) {
    ALIASES[webpack.alias[k]] = k;
    REV_ALIASES[k] = webpack.alias[k];
  }
}

/**
 * 
 * @param {*} path 
 * @returns 
 */
function item(path) {
  const tpl_file = resolve(__dirname, 'promise.tpl');
  let c = readFileSync(tpl_file, 'utf-8');
  let content = String(c).trim().toString();
  const renderer = template(content);
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
 * @param [*] items 
 */
function write_doc(items) {
  let rows = []
  let re = new RegExp(`^${SRC_DIR}`)
  for (let r of items) {
    let tail = r.path.split(/\/+/)
    let head = tail.shift()
    let item
    if (REV_ALIASES[head]) {
      item = REV_ALIASES[head]
      item = item.replace(new RegExp(`/${head}$`), '')
      item = resolve(item, r.path)
      item = get_target(item)
      if (!item) continue;
    } else {
      item = resolve(SRC_DIR, src_base, ...tail)
      item = get_target(item)
    }
    r.local = `file://${item}`;
    r.repo = item.replace(re, 'https://github.com/drumee/ui-team/tree/main');
    rows.push(r)
  }
  let model = [
    { h1: "Drumee builtins kins" },
    { blockquote: "Automatic generation - DO NOT EDIT" },
    { h2: "Core rendering engine" },
    { p: "See https://drumee.com/-/#/sandbox for examples." },
    { table: { headers: ["kind", "path", "repo"], rows } },
  ]
  const repo = resolve(SRC_DIR, 'docs', 'api', 'kind.md');
  writeFileSync(repo, Json2md(model));
  model[4].table.headers = ["kind", "path", "local"]
  let local_docs = resolve(SRC_DIR, 'docs', 'local')
  mkdirSync(local_docs, { recursive: true })
  const loc = resolve(local_docs, 'kind.md');
  writeFileSync(loc, Json2md(model));
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
        if (args.verbose) console.log(`${i.kind} declared multiple times`)
      }
    }
  }
  return values(kinds);
}

/**
 * 
 * @param {*} items 
 */
function render(items, tpl, dest) {
  const tpl_file = resolve(__dirname, tpl);
  const dest_file = resolve(SRC_DIR, dest);
  if (!existsSync(tpl_file)) {
    fatal(`[Template not found]: ${tpl_file}`);
  }
  let data = {
    items: optimize(items),
    filename: dest_file.replace(SRC_DIR, ''),
    year: Moment().year()
  };

  let c = readFileSync(tpl_file, 'utf-8');
  let content = String(c).trim().toString();
  const renderer = template(content);
  writeFileSync(dest_file, renderer(data), 'utf-8');
}

/**
 * 
 * @param {*} file 
 * @param {*} path 
 * @returns 
 */
function get_target(path) {
  if (existsSync(path)) {
    let item = statSync(path)
    if (item.isDirectory()) {
      for (let ext of webpack.extensions) {
        let p = join(path, `index${ext}`)
        if (existsSync(p)) return p;
      }
    }
    return path;
  };
  for (let ext of webpack.extensions) {
    let p = `${path}.${ext}`
    if (existsSync(p)) return p;
  }
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
    src_base
  ];
  if (args.libs) {
    libs = args.libs.split(/[,;:]/);
  }
  const walk = require('walkdir');
  for (let dir of libs) {
    let f = resolve(SRC_DIR, dir);
    console.log("Walking into", f);
    let files = walk.sync(f);

    let v;
    for (let file of files) {
      if (!/(seeds.js)$/.test(file)) continue;
      if (existsSync(file)) {
        try {
          v = require(file);
        } catch (e) {
          console.log("Skipped file", file);
          continue;
        }
        for (let kind in v) {
          let path = v[kind];
          if (!isString(path)) continue;
          let basedir = null;
          if (/^\./.test(path)) {
            basedir = resolve(dirname(file), path);
          } else {
            let [b, d] = path.split(/\/+/);
            basedir = webpack.alias[b];
          }
          if (basedir && existsSync(basedir)) {
            if (ALIASES[basedir]) {
              path = v[kind];
            } else {
              if (ALIASES[dirname(file)]) {
                path = basedir.replace(dirname(file), ALIASES[dirname(file)]);
              } else {
                let r = resolve(dirname(file), v[kind]);
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
      } else if (!isEmpty(file)) {
        console.warn(`${file} not found`);
      }
    }
  }
  render(data, 'classes.tpl', `${src_base}/core/kind/seeds/builtins.js`);
  render(data, 'helper.tpl', `${src_base}/core/kind/seeds/helper.js`);
  write_doc(data)
  if (!isEmpty(not_found)) {
    console.warn("Following files have not been resolved", not_found);
  }
}

make();
