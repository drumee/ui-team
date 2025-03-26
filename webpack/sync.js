const { resolve } = require("path");
const { exec } = require('shelljs');
const { writeFileSync, readFileSync } = require('jsonfile');
const { existsSync } = require('fs');
const { UI_RUNTIME_HOST, UI_RUNTIME_PATH } = process.env;
class DrumeeSyncer {
  constructor(opt) {
    this.options = opt || {};
    this.src_path = resolve(__dirname, '..');
  }

  apply(compiler) {
    compiler.hooks.done.tap('Drumee Sync Plugin', (
      stats /* stats is passed as argument when done hook is tapped.  */
    ) => {
      const { target } = this.options;
      console.log("Building with options:", this.options)
      let data = this.get_hash(stats);
      if (target == 'api') {
        this.link_api(stats, data);
      }
    });
  }


  /**
   * 
   * @param {*} stats 
   * @param {*} data 
   */
  link_api(stats, data) {
    let { bundle_path } = this.options;
    let bundle = resolve(bundle_path, `api-${stats.hash}.js`);

    let index = resolve(bundle_path, `index.js`);
    console.log(`LINK API INDEX ${index} -> ${bundle}`, `${bundle_path}`);
    exec(`ln -f ${bundle} ${index}`);

    let version = resolve(bundle_path, `index-${data.version}.js`);
    console.log(`LINK API REVISION ${version} -> ${bundle}`, `${bundle_path}`);
    exec(`ln -f ${bundle} ${version}`);
  }

  /**
   * 
   * @param {*} stats 
   * @returns 
   */
  get_hash(stats) {
    console.log(`BUILDING FROM HASH=${stats.hash}`, stats.compiler, __dirname);
    let { sync_templates, bundle_path, bundle_base, no_hash } = this.options;
    let file = resolve(bundle_path, "index.json");
    const { stdout } = exec("git log -1 --pretty=format:'%h'", { silent: true });
    let [commit] = stdout.split(':');
    let p = readFileSync(resolve(this.src_path, 'package.json'));
    let data = {
      hash: stats.hash,
      timestamp: new Date().getTime(),
      head: commit,
      rev: commit,
      version: p.version,
      no_hash: no_hash || 0
    }
    console.log(`Writing data into ${file} `, data);
    try {
      writeFileSync(file, data);
      if (sync_templates) {
        console.log("SYNCING TEMPLATES...");
        const src = resolve(this.src_path, "bb-templates");
        const dest = resolve(bundle_base, "bb-templates");
        exec(`rsync -razv ${src}/ ${dest}/`);
      }
      if (UI_RUNTIME_HOST) {
        let cmd = resolve(__dirname, "sync.sh");
        if(existsSync(cmd)){
          exec(cmd);
        }else{
          console.error(`Sync command not found (${cmd})`)
        }
      }
    } catch (e) {
      console.error(`GOT ERROR while trying to sync: \n`, e);
      return;
    }
    console.log(`Done.`);
    return data;
  }
}

module.exports = DrumeeSyncer;
