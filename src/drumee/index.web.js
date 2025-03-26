// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : ../src/drumee/main
// ==================================================================== *

const STYLE = "color: green; font-weight: bold;"

const App = require('./drumee');
window.Drumee = new App();
if ((window.__filename == null)) {
  window.__filename = null;
}
window.DrumeeMFS = require('./core/mfs');
window.DrumeeMediaInteract = require('builtins/media/interact');

/**
 * 
 */
$(document).ready(function () {
  console.log(`Staring Drumee Web...`);
  console.log(`Build commit=%c${__COMMIT__}, mode=${__BUILD__}`, STYLE);
  console.log(`UI version=%c${Drumee.version}`, STYLE);
  Drumee.loadSprites();
  Drumee.start();
  const event = new Event('drumee:app:started');
  event.root = this.content;
  document.dispatchEvent(event);

});
