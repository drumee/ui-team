class __container extends Marionette.CollectionView {
  constructor(...args) {
    super(...args);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this._childCreated = this._childCreated.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this._addChildren = this._addChildren.bind(this);
  }

  static initClass() {
    this.prototype.templateName = "#--wrapper-hull";
    this.prototype.nativeClassName  = "widget container";
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    if ((this.model == null)) {
      this.model = new Backbone.Model(opt);
    }
    if(this.mget('sortWithCollection') !== undefined) {
      this.sortWithCollection = this.mget('sortWithCollection');
    }
    
    if ((this.collection == null)) {
      this.collection = new Backbone.Collection();
    }
    this.model.atLeast({
      flow : _a.horizontal,
      justify : _a.center
    });
    this.declareHandlers();
    if (!_.isEmpty(this.get(_a.api))) {
      this._api = _.clone(this.get(_a.api));
      this.debug("HAPPY API", this._api, this);
      opt = {
        method  : this._api.method,
        values  : this._api.values
      };
      this.triggerMethod(_e.rpc.read, opt);
    }
    this._skip = [_a.method];
    if (this.get('skip') != null) {
      return this._skip.push(this.get('skip'));
    }
  }

// ============================
//
// ============================

// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  __dispatchRest(method, data) {
    if (method === this.get(_a.api)) {
      this.warn(WARNING.method.unexpected.format(method));
      return;
    }
    this.debug(">>AZ __dispatchRest", method, data);
    this._data = data;
    if (_.isArray(data)) {
      return this._addChildren(data);
    } else {
      return this.model.set(data);
    }
  }
// ============================
//
// ============================

// ===========================================================
// _childCreated
//
// @param [Object] child
//
// ===========================================================
  _childCreated(child) {
    this.debug("_childCreated", child);
    return child.onChildBubble = this.onChildBubble;
  }
// ============================
//
// ============================

// ===========================================================
// onChildBubble
//
// @param [Object] child
//
// ===========================================================
  onChildBubble(child) {
    const opt = this.get('on_bubble');
    this.debug("onChildBubble", this, child, this.collection.indexOf(child.model), opt);
    switch (opt.viewer) {
      case _a.modal:
        opt.content.items = this._data;
        opt.content.vendorOpt = opt.content.vendorOpt || {};
        opt.content.vendorOpt.index = this.collection.indexOf(child.model);
        return RADIO_BROADCAST.trigger(_e.show, opt.content);
    }
  }

// ===========================================================
// _addChildren
//
// @param [Object] data
//
// @return [Object] 
//
// ===========================================================
  _addChildren(data) {
    const kind = this._api.kind || KIND.wrapper;
    const template = this._api.template || _T.wrapper.raw;
    this.debug(">>AZ cvTemplate", this._api,  data);
    const fields = _.difference(_.keys(this._api), this._skip);
    const c = _.map(data, el=> {
      el.kind       = kind;
      el.template   = template;
      el.handler    = {part:this, ui:this};
      for (var k of Array.from(fields)) {
        el[k] = this._api[k];
      }
      return el;
    });
    return this.collection.set(c);
  }
}
__container.initClass();
module.exports = __container;
