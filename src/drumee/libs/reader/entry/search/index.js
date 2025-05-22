class __entry_search extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onClear = this.onClear.bind(this);
    this.getData = this.getData.bind(this);
    this.getValue = this.getValue.bind(this);
    this.onChildClear = this.onChildClear.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._found = this._found.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      state: 0,
      justify: _a.center,
      picto: "",
      menuClass: "",
      listClass: "",
      listFlow: _a.vertical,
      slide: _a.vertical,
      flow: _a.vertical
    });
    this.declareHandlers({ part: _a.multiple, ui: _a.multiple });
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    if (this.mget(_a.skeleton)) {
      this.feed(this.mget(_a.skeleton)(this));
    } else {
      this.feed(require("./skeleton")(this));
    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn) {
    child.onChildBubble = this.onChildBubble;
    switch (pn) {
      case "ref-entry":
        return this._input = child;
    }
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  onClear(child) {
    return this.getPart(_a.list).clear();
  }

  /**
   * 
   * @param {*} n 
   * @returns 
   */
  getData(n) {
    const opt = {};
    const name = n || this.mget(_a.name) || _a.name;
    opt[name] = this._input.getValue();
    return opt;
  }

  /**
   * 
   * @returns 
   */
  getValue() {
    return this._input.getValue();
  }

  /**
   * 
   * @returns 
   */
  setValue(v) {
    return this._input.setValue(v);
  }


  /**
   * 
   * @param {*} orig 
   * @returns 
   */
  onChildClear(orig) {
    return this._found(orig);
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const status = args.__inputStatus;
    switch (status) {
      case _a.results:
        this.status = this.mget(_a.service) || status;
        this.service = this.status;
        return this._found(cmd, args);
      case _e.Enter: case _a.commit:
        this.status = status;
        this.service = this.status;
        return this.triggerHandlers({ service: status });
      default:
        this.status = status;
        this.service = this.status;
        if (this.get(_a.interactive) === _a.service) {
          return this.triggerHandlers({ service: this.mget(_a.service) });
        } else {
          return this.triggerHandlers({ service: status });
        }
    }
  }

  /**
   * 
   * @param {*} orig 
   * @param {*} args 
   * @returns 
   */
  _found(orig, args) {
    const data = args.results;
    const itemsOpt = this.get(_a.itemsOpt);
    const map = this.model.get(_a.itemsMap) || {};
    const found = _.map(data, item => {
      const ext = {};
      for (var k in map) {
        var v = map[k];
        ext[v] = item[k];
      }
      if (itemsOpt != null) {
        if (_.isFunction(itemsOpt)) {
          _.merge(item, itemsOpt(this, item));
        } else {
          _.merge(item, itemsOpt);
        }
      }
      _.merge(item, ext);
      return item;
    });

    const wrapper = this.model.get(_a.results);
    if (wrapper != null) {
      if (_.isFunction(wrapper.feed)) {
        wrapper.feed(found);
        return;
      }
      if (this.getPart(wrapper) != null) {
        this.getPart(wrapper).feed(found);
        return;
      }
    }
    this.results = found;
    this.source = orig;
    return this.triggerHandlers(args);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} args 
   * @returns 
   */
  onChildCallback(child, args) {
    if (_.isFunction(child.getData)) {
      this._export = child.getData();
    }
    return this.trigger(_e.callback);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} args 
   * @returns 
   */
  onChildFound(child, args) {
    this._adding = true;
    this.options.kidsOpt = {
      ...this.options.kidsOpt,
      kind: child.get('targetType') || KIND.button.anchor
    }
    this.options.kidsMap = {
      label: 'locale_en',
      ...args.options.kidsMap
    };
    return this.$list$.collection.set(args);
  }
}

module.exports = __entry_search;
