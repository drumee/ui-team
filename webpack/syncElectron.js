const { resolve } = require('path');
const { exec } = require('shelljs');
const { template } = require('lodash');
const { readFileSync: readJson, writeFileSync: writeJson } = require('jsonfile');
const appBase = 'desktop';
const {
  readFileSync, writeFileSync, cpSync
} = require("fs");
const { readdir } = require("fs/promises");
/**
 * 
 * @param {*} file 
 * @param {*} data 
 * @param {*} bundle_path 
 */
function writeConfigs(file, data, bundle_path) {
  let filepath = resolve(__dirname, '..', 'public', `${file}.tpl`);
  console.log(`Writing configs ${filepath} using`, data);

  let rawContent = readFileSync(filepath, 'utf8');
  let content = String(rawContent).trim().toString();
  let tpl = template(content)(data);

  let out = resolve(bundle_path, `${file}.html`);
  writeFileSync(out, tpl);
  copy_web_files();

  let files = [{
    src: resolve(__dirname, '..', 'public', `loader.css`),
    dest: resolve(bundle_path, `loader.css`),
  }]
  for (let file of files) {
    cpSync(file.src, file.dest);
  }
  let static_src = resolve(__dirname, '..', 'public', `static`);
  exec(`rsync -razv ${static_src} ${bundle_path}/`);

}

/**
 * Sync common data from web into electron
 */
const copy_web_files = () => {
  let src_dir = resolve(__dirname, '..', 'locale');
  let dest_dir = resolve(__dirname, '..', appBase, 'src/locale/web');
  console.log(`Syncing`);
  readdir(src_dir).then((files) => {
    files.forEach((file) => {
      if (/\.json$/.test(file)) {
        src = resolve(src_dir, file);
        dest = resolve(dest_dir, file);
        cpSync(src, dest)
      }
    });
  });
  let src, dest;
  src = resolve(__dirname, '..', 'src/drumee/lex/services.json');
  dest = resolve(__dirname, '..', appBase, 'src/lex/services.json');
  cpSync(src, dest);
  console.log(`Common dataset synced from web to electron`);
}

/**
 * 
 * @param {*} opt 
 */
function configure(opt) {
  console.log("Configuring electron with", opt);
  const { bundle_path } = opt;
  let info = readJson(resolve(bundle_path, 'index.json'));
  let data;
  if (opt.no_hash) {
    data = {
      main: `./main.js`,
    }
  } else {
    data = {
      main: `./main-${info.hash}.js`,
    }
  }

  info.webVersion = require("../package.json").version;
  info.desktopVersion = require("../desktop/package.json").version;
  info.commit = opt.commit;
  writeJson(resolve(bundle_path, 'index.json'), info, { spaces: 2, EOL: '\r\n' })
  writeConfigs('index', data, bundle_path);
  writeConfigs('offline', data, bundle_path);

}

/**
 * 
 */
class DrumeeElectronSyncer {
  constructor(opt) {
    this.options = opt || {};
  }
  apply(compiler) {
    compiler.hooks.done.tap('Electron HTML', (
      stats /* stats is passed as argument when done hook is tapped.  */
    ) => {
      configure(this.options);
    });
  }
}

module.exports = DrumeeElectronSyncer;
