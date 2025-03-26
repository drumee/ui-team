#!/usr/bin/env /usr/bin/node
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ============== IMPORTED ================

const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
const _ = require("underscore");


// ==============================
// 
// ==============================
const usage = function() {
  console.log(`Usage : coffe ${process.argv[1]} webpack-output-file`);
  return process.exit();
};


// ==============================
// 
// ==============================
const getInputFile = function() {
  const path = require('path');
  if ((process.argv[2] == null)) {
    usage();
  }
  const res =
    {file   : process.argv[2]};
  return res;
};
    



const input = getInputFile();

const readStream = fs.createReadStream(input.file);
const airac_release = 0;

const rl = readline.createInterface({
  input: readStream,
  terminal: false
});


// ==============================
// EVENTS HANDLERS
// ==============================

const prev_sector = null;
const current_sector = null;
const points = [];

const writeStream = fs.createWriteStream('src/drumee/utils/test/modules-liste.coffee');
writeStream.write("__modules = \n");

// ------------------------------
// line parsing
// ------------------------------
const parse = function(line) {
  if (line.match(/\[([0-9]+)\].*drumee/)) {
    line = line.replace(/src\/drumee/, '');
    line = line.replace(/\.coffee.*$/, '');
    line = line.replace(/[\[\]\.]/g, '');
    line = line.replace(/[\/-]/g, '_');
    line = line.replace(/( +)/g, ' ');
    line = line.replace(/__/, '');
    line = line.trim();
    const r = line.split(/[ +]/);
    return writeStream.write(`  ${r[1]}:${r[0]}\n`);
  }
};
// ------------------------------
// MAIN
// ------------------------------
rl.on('line', parse);

// ------------------------------
// error
// ------------------------------
readStream.on('error', function(err) {
    console.log(`ERREUR : Impossible d'ouvrir le fichier ${err.path}`);
    return process.exit();
});
    
// ------------------------------
// End of file
// ------------------------------
readStream.on('end', function(arg) {
  writeStream.write("module.exports = __modules\n");
  return writeStream.end();
});
