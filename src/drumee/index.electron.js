
const STYLE = "color: green; font-weight: bold;"
const { DrumeeUI } = require('./drumee.electron');

window.Drumee = new DrumeeUI();
window.DrumeeMFS = require('./core/mfs.electron');
window.DrumeeMediaInteract = require('builtins/media/interact.electron');


/**
 * 
 */
$(document).ready(() => {
  console.log(`Staring Drumee Desktop...`);
  console.log(`build mode=%c${__BUILD__}`, STYLE);
  console.log(`UI version=%c${__VERSION__}`, STYLE);
  console.info("Version: ", Drumee.version);
  Drumee.loadSprites();
  Drumee.start();
});
