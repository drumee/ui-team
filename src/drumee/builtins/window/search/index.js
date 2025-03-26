// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/search/index.js
//   TYPE : Component
// ==================================================================== *

const __window_interact = require('../interact');

/**
 * @class __window_search
 * @extends __window_interact
*/

class __window_search extends __window_interact {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
  }


  /**
  * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.isSearch = 1;
    this.model.set({
      hub_id: Visitor.id,
      role: _a.search
    });
    this.contextmenuSkeleton = 'a';
    this.style.set({
      width: this.size.width,
      height: this.size.height,
      left: (window.innerWidth / 2) - (this.size.width / 2),
      top: (window.innerHeight / 2) - (this.size.height / 2)
    });
  }

  /**
*
*/
  setValue(v) {
    let t = this.mget(_a.trigger);
    if (t && t.__refEntry) {
      t.__refEntry.setValue(v);
    }
  }

  /**
  *
  */
  onDomRefresh() {
    const f = () => {
      return this.feed(require("./skeleton/main")(this));
    };

    this.waitElement(this.el, f);
    return super.onDomRefresh();
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch (service) {
      case 'open-file-location':
        return this.openFileLocation(cmd);

      case _e.close:
        this.setValue('');
        return this.goodbye();

      default:
        return super.onUiEvent(cmd, args);
    }
  }

/**
 * @param {*} type
*/
getCurrentApi(type) {
  let api;
  if(localStorage.getItem('seo')){
    api = {
      service: SERVICE.seo.find,
      hub_id: Visitor.id,
      string: this.model.get(_a.string)
    };
    return api;
  };
  api = {
    service: SERVICE.media.search,
    hub_id: Visitor.id,
    string: this.model.get(_a.string)
  };
  return api;
}

}

module.exports = __window_search;
