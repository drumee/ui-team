/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : drumee-electron/index.js
 * TYPE : Skelton
 * ===================================================================**/
const { name } = require("./package.json");
const { dev } = require("./args")
global.LOCALE = {}; // To be initialized once user setting configured
global.SERVICES = require("./lex/services.json");
const { join } = require("path");
// Dev config to watch electron changes.
if (dev == "reload") {
  // require('electron-reload')(__dirname);
  require("electron-reload")(__dirname, {
    electron: join(__dirname, "node_modules", "dist", "electron"),
  });
}
const { Drumee } = require("./drumee");
try {
  new Drumee();
} catch (e) {
  console.error(`Failed to start ${name}`, e);
}
