// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : ../src/drumee/main
// ==================================================================== *

const STYLE = "color: green; font-weight: bold;"
require('./core');

class App extends Marionette.Application {

  static initClass() {
    this.prototype.region = '#--router';
    this.prototype.version = version;
  }

  /**
   * 
   */
  onStart() {
    console.log(`onStart App...`);
  }


}

window.Drumee = new App();

/**
 * 
 */
$(document).ready(function () {
  console.log(`Staring Drumee Dom Melting Library...`);
  console.log(`Build commit=%c${__COMMIT__}, mode=${__BUILD__}`, STYLE);
  console.log(`UI version=%c${Drumee.version}`, STYLE);
  Drumee.loadSprites();
  Drumee.start();
  const event = new Event('drumee:app:started');
  event.root = this.content;
  document.dispatchEvent(event);
});
