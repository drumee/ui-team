

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
      return this.feed(require("./skeleton")(this));
    };

    this.waitElement(this.el, f);
    return super.onDomRefresh();
  }

  /**
   * Override onPartReady to update count when list is ready
   */
  onPartReady(child, pn, section) {
    super.onPartReady(child, pn, section);
    if (pn === _a.list && child && child.collection) {
      // Update count when list collection changes
      const updateCount = () => {
        const count = child.collection.length;
        const itemsCountPart = this.getPart("items-count");
        if (itemsCountPart) {
          itemsCountPart.set({ content: LOCALE.X_FILES.format(count) });
        }
      };
      // Update count initially
      updateCount();
      // Listen to collection updates
      child.collection.on('add remove reset update', updateCount);
    }
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
  // if(localStorage.getItem('seo')){
  //   api = {
  //     service: SERVICE.seo.find,
  //     hub_id: Visitor.id,
  //     string: this.model.get(_a.string)
  //   };
  //   return api;
  // };
  api = {
    service: SERVICE.desk.search,
    hub_id: Visitor.id,
    string: this.mget(_a.string)
  };
  return api;
}

}

module.exports = __window_search;
