/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/index.js
 * TYPE : Skelton
 * ===================================================================**/
const { name } = require("./package.json");
global.ARGV = require("yargs")
  .scriptName(name)
  .usage("$0 <cmd> [args]")
  .command(
    "hello [name]",
    "welcome the yargs!",
    (yargs) => {
      yargs.positional("name", {
        type: "string",
        default: "Cambi",
        describe: "the name to say hello to",
      });
    },
    function (argv) {
      console.log("Starting", argv.name, "please, wait!");
    }
  )
  .help().argv;
global.verbose = ARGV.verbose;
global.LOCALE = {}; // To be initialized once user setting configured
global.SERVICES = require("./lex/services.json");
const { join } = require("path");
// Dev config to watch electron changes.
if (ARGV.dev == "reload") {
  // require('electron-reload')(__dirname);
  require("electron-reload")(__dirname, {
    electron: join(__dirname, "node_modules", "dist", "electron"),
  });
}
const { Drumee } = require("./drumee");
try {
  new Drumee();
} catch (e) {
  console.error("Caught error [E:25]", e);
}
