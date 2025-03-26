const mfsInteract = require('../interact');

class __window_folder extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onSearchEvent = this.onSearchEvent.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.isFolder = 1;
    super.initialize(opt);
    this._path = [];

    this._flow = _a.horizontal;
    this.model.atLeast({
      value: _a.normal
    });


    if (this.model.get(_a.hub_id) !== Visitor.id) {
      this.model.set({
        filetype: _a.hub
      });
    }

    this.style.set({
      width: this.size.width,
      height: this.size.height
    });
    this.skeleton = require("./skeleton")(this);
    this.mset({
      privilege: this.mget(_a.trigger).get(_a.privilege)
    })
  }


  /**
   * 
   * @param {*} c 
   */
  onChildBubble(c) {
    if ((c != null) && (c.logicalParent === this) && (c.service === _e.select)) {
      return;
    }
    super.onChildBubble(c);
    if (_.isEmpty(Wm.clipboard)) {
      return this.unselect();
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service)
    switch (service) {
      case _a.info:
        return this.showInfo()

      case _e.download:
        return this.mget(_a.trigger).download()

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * 
  */
  showInfo() {
    const state = this.__wrapperInfo.el.dataset.state
    if (state === _a.closed) {
      return this.fetchService(SERVICE.media.info, {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
      }).then((data) => {
        this.__wrapperInfo.feed(require('./skeleton/info')(this, data));
      }).catch((e) => {
        this.warn(e);
        this.__wrapperInfo.feed(require('./skeleton/no-info')(this));
      })
    } else {
      this.__wrapperInfo.clear()
    }
  }

  // ********************************************
  // Events from earch box
  // *********************************************

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @returns 
   */
  onSearchEvent(service, data) {
    const list = this.getPart(_a.list);
    if (service === 'clear') {
      list.collection.set(this._backup);
      return;
    }
    if (!_.isArray(data) || (data.length === 0)) {
      return;
    }
    if ((this._backup == null)) {
      this._backup = _.map(list.collection.models, model => {
        const r = _.clone(model.toJSON());
        return r;
      });
    }
    const found = _.map(data, item => {
      const ext = {
        kind: KIND.media.helper,
        signal: _e.ui.event,
        service: "open-node",
        handler: {
          uiHandler: this
        }
      };
      _.merge(item, ext);
      return item;
    });
    list.collection.set(found);
  }
}

module.exports = __window_folder;

