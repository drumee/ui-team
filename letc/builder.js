#!/usr/bin/env node


// ================================  *
//   Copyright Xialia.com  2013-2017 *
//   FILE  : src/offline/factory.account
//   TYPE  : module
// ================================  *

const Fs        = require('fs');
const Shell     = require('shelljs');
const _         = require('lodash');
const Minimist  = require('minimist');
const Path      = require('path');
// const Stringify = require('json-stringify');
const argv      = Minimist(process.argv.slice(2));
const Moment    = require('moment');
const prog_name = Path.basename(process.argv[1]);
let dest_dir;

function fatal (a){
  console.log(`[Fatal error]: ${a}`);
  process.exit(1);
}

function usage (a){
  console.log(`Missing argument : ${a}`, )
  console.log(`Usage ${prog_name} 
    --fig=figGroup.figName 
    --dest=/where/to/place/code
    `);
  process.exit(1);
}

function render(filename) {
  let template = 'template';
  const tpl_file = Path.resolve(__dirname, 'template', filename);
  let dest_file = Path.resolve(dest_dir, filename);
  dest_file = dest_file.replace(/\.tpl/,'');
  //console.log(`BUILDING NEW KIND : ${tpl_file} -> ${dest_file}`, filename, template);
  
  if (!Fs.existsSync(tpl_file)) { 
    fatal(`[Template not found]: ${tpl_file}`);
  }
  let fig    = argv.fig.split(/[.-_\/]/);
  let group  = fig.shift();
  let name   = _.camelCase(fig.join('_'));
  let family = `${group}_${name}`;
  let data = { 
    group, 
    name, 
    family,
    filename : dest_file.replace(Path.resolve(__dirname, '..'), ''),
    parent : argv.parent || 'LetcBox',
    year : Moment().year()
  };
  let templateFile   = Fs.readFileSync(tpl_file, 'utf-8');
  let content = String(templateFile).trim().toString();
  const renderer = _.template(content);
  Shell.mkdir('-p', Path.dirname(dest_file));
  content = renderer(data).replace(/\#\{/g, '${');
  Fs.writeFileSync(dest_file, content, 'utf-8');
  
}

// -----------------------------------------------------------------
function check_sanity(cb){
  let target;
  argv.fig || usage('fig');
  argv.dest || usage('dest');
  if(/^\//.test(argv.dest)){
    target = argv.dest;
  }else{
    target = argv.dest.replace(/^\.(\/)*/g, '')
    target = Path.resolve(__dirname, '..', argv.dest)
  }
  let base_dir;
  if(!argv.name){
    argv.name = Path.basename(target);
    base_dir = Path.dirname(target);
  }else{
    base_dir = target;
  }

  if (!Fs.existsSync(base_dir)) { 
    fatal(`Parent ${base_dir} dir does not exists`);
  }
  dest_dir = Path.resolve(base_dir, argv.name);
  if(Fs.existsSync(dest_dir)){
    fatal(`Destination ${dest_dir} already exist!`);
  }else{
    Shell.mkdir('-p', dest_dir);
  }
}

function build(e){
  const folders = [];
  folders.push(Path.resolve(__dirname, 'template'));
  folders.push(Path.resolve(__dirname, 'template', 'skeleton'));
  folders.push(Path.resolve(__dirname, 'template', 'skin'));
  for (var dir of folders) {
    Fs.readdirSync(dir).forEach(function (f) {
      let full_path = Path.resolve(dir, f);
      let stat = Fs.statSync(full_path);
      if(stat.isDirectory()){
        let dest = Path.resolve(dest_dir, f);
        //console.log("CREATING DESTION FOLDER... ", dest);
        Shell.mkdir('-p', dest);
      }else if (stat.isFile()){
        let base = dir.replace(`${__dirname}/template`, '');
        base = base.replace(/^\//, '');
        render(Path.join(base, f)); 
      }
    });
  }
}

check_sanity();
build();
console.log(`The new Drumee Widget was created and placed a ${dest_dir}`);
