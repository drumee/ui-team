// ==================================================================== *
//   Copyright Xialia.com  2011-0221
//   FILE : ../src/drumee/main
// ==================================================================== *

const STYLE = "color: green; font-weight: bold;"
const { DrumeeUI } = require('./drumee.electron');
// const remote = require('remote/electron').remote; 

window.Drumee = new DrumeeUI();
window.DrumeeMFS = require('./core/mfs.electron');
window.DrumeeMediaInteract = require('builtins/media/interact.electron');


/**
 * 
 */
$(document).ready(() => {
  console.log(`Staring Drumee Electron...`);
  console.log(`build mode=%c${__BUILD__}`, STYLE);
  console.log(`UI version=%c${__VERSION__}`, STYLE);
  console.debug(`Chrono start time=${DEBUG.start}`);
  console.info("Version: ", Drumee.version);
  Drumee.loadSprites();
  Drumee.start();
});
