/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/modules/welcome/invitation/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />

const __welcome_interact = require('../interact');

/**
 * Class representing invitation page in Welcome module.
 * @class __welcome_offline
 * @extends __welcome_interact
 */

class __welcome_offline extends __welcome_interact {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    require('./skin');
    super.initialize();
    this.declareHandlers();
  }


  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  async onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    //this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case 'open-home-folder':
        await Account.openHome();
        return;
      default:
        return this.debug("Created by kind builder");
    }
  }

}


module.exports = __welcome_offline;