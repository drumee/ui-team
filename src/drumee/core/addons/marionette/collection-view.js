const _addKid = "add:kid";
const __failover = require('../fallback');
class lext_raw extends Marionette.View { }
const { CollectionView } = Marionette;


const __emptyView = () => new lext_raw();


//########################################
// CollectionView
//########################################

/**
 * 
 * @returns 
 */
CollectionView.prototype.buildChildView = function (model, ChildViewClass, childViewOptions) {
  let msg;
  if (_.isEmpty(childViewOptions)) {
    return __emptyView();
  }

  if (!_.isEmpty(childViewOptions.href)) {
    delete childViewOptions.tagName;
  }

  const options = childViewOptions;
  options.model = model;
  const { kind } = options;
  if ((kind == null)) {
    msg = "Object defined whithout kind";
    this.warn(msg, childViewOptions, this);
    return new __failover({ content: msg });
  }
  try {
    return new ChildViewClass(options);
  } catch (e) {
    console.warn(e)
    if ((options.creator != null) || (options.snippets != null) || (options.vendors != null)) {
      ChildViewClass = Kind.get(KIND.snippet);
      return new ChildViewClass(options);
    }
    if ((kind == null)) {
      msg = ERROR.no_kind.format(options.kind);
    } else {
      if (!Kind.get(kind)) {
        msg = ERROR.no_snippet.format(kind);
      } else {
        msg = ERROR.broken_widget.format(kind);
      }
    }
    this.debug(e);
    this.warn(`${msg} / definition==>`, options, " parent ==> ", ChildViewClass, this.options);
    return new __failover({ content: msg });
  }

};


/**
 * 
 * @returns 
 */
CollectionView.prototype.childViewOptions = function (model) {
  let opt;
  if (model != null) {
    const map = this.getOption(_a.kidsMap) || this.getOption(_a.itemsMap) || model.get(_a.map);
    for (let k in map) {
      const v = map[k];
      if (_.isString(v)) {
        model.set(k, model.get(v));
      } else if (_.isArray(v)) {
        for (let i of Array.from(v)) {
          if (!_.isEmpty(model.get(i))) {
            model.set(k, model.get(i));
            break;
          }
        }
      } else if (_.isFunction(v.exec)) {
        model.set(k, v.exec(model.get(v.args)));
      }
    }
    opt = model.toJSON();
  }

  const kidsOpt = this.getOption(_a.kidsOpt) || this.getOption(_a.itemsOpt);

  if (kidsOpt) {
    const attr = { ...kidsOpt, ...opt };
    model.set(attr);
    return attr;
  }
  return opt;
};


/**
 * 
 * @returns 
 */
CollectionView.prototype.childView = function (model) {
  const o = this.getOption(_a.kidsOpt) || this.getOption(_a.itemsOpt);
  const kind = model.get(_a.kind) || (o != null ? o.kind : undefined);
  if (kind != null) {
    const cvClass = Kind.get(kind);
    if (_.isFunction(cvClass)) {
      return cvClass;
    }
  }
  return __failover;
};

/**
 * 
 * @returns 
 */
CollectionView.prototype.emptyViewOptions = function (model) {
  const opt = this.getOption(_a.evArgs) || {};
  if (!opt.kind) {
    opt.kind = KIND.blank;
  }
  return opt;
};


/**
 * 
 * @returns 
 */
CollectionView.prototype.emptyView = function (model) {
  const opt = this.emptyViewOptions(model);
  const args = opt.kind;
  if (args != null) {
    const cvClass = Kind.get(opt.kind) || Marionette.View;
    return cvClass;
  }
  return Marionette.View;
};

/**
 * 
 * @returns 
 */
CollectionView.prototype.onAddChild = function (self, child) {
  if (_.isFunction(this._childCreated)) {
    this._childCreated(child);
  }
  return this.triggerMethod(_addKid, child);
};

/**
 * 
 * @param {*} self 
 * @param {*} child 
 * @returns 
 */
CollectionView.prototype.onBeforeAddChild = function (self, child) {
  return child.parent = this;
};

/**
 * 
 * @param {*} name 
 * @returns 
 */
CollectionView.prototype.getPart = function (name) {
  return this._branches[name];
};

/**
 * 
 * @param {*} name 
 * @returns 
 */
CollectionView.prototype.getBranch = function (name) {
  return this._branches[name];
};

/**
 * 
 * @param {*} name 
 * @returns 
 */
CollectionView.prototype.removeBranch = function (name) {
  const branch = this._branches[name];
  if (branch) {
    branch.cut();
    return delete this._branches[name];
  }
};

/**
 * 
 * @param {*} name 
 * @returns 
 */
CollectionView.prototype.removePart = function (name) {
  return this.removeBranch(name);
};

/**
 * 
 * @param {*} name 
 * @param {*} obj
 * @returns 
 */
CollectionView.prototype.setPart = function (name, obj) {
  if ((this._ == null)) {
    this._ = {};
  }
  return this._[name] = obj;
};


/**
 * 
 * @param {*} name 
 * @returns 
 */
CollectionView.prototype.partExists = function (name) {
  if ((this._parts != null ? this._parts[name] : undefined) != null) {
    return true;
  }
  return false;
};


/**
 * 
 * @returns 
 */
CollectionView.prototype.suppress = function () {
  if ((this.parent != null ? this.parent.collection : undefined) != null) {
    this.parent.collection.remove(this.model);
    this.parent.collection.remove(this.model);
    this.parent.triggerMethod(_e.removeChild, this);
    this.parent.trigger(_e.removeChild, this);
  }
  return this.destroy();
};


/**
 * 
 * @returns 
 */
CollectionView.prototype.cut = function () {
  return this.suppress();
};



/**
 * 
 * @returns 
 */
CollectionView.prototype.respawn = function (data) {
  if (((this.parent != null ? this.parent.collection : undefined) == null)) {
    return;
  }
  if (_.isArray(data) && this.collection) {
    let i = 0;
    this.collection.each((m) => {
      m.set(data[i]);
      i++;
    })
  } else if (_.isObject(data)) {
    this.model.set(data);
  }
  const index = this.getIndex();
  const letc = this.toLETC();
  this.parent.collection.remove(this.model);
  return this.parent.collection.add(letc, { at: index });
};

/**
 * 
 * @returns 
 */
CollectionView.prototype.ensurePart = function (name) {
  return new Promise((resolve, reject) => {
    let part = null;
    try {
      part = this._branches[name];
    } catch (e) {
      return reject(e);
    }
    if (part && !part.isDestroyed()) {
      return resolve(part);
    }
    this.on(_e.part.ready, (child) => {
      if (child.mget(_a.sys_pn) == name) {
        this.off(_e.part.ready);
        return resolve(child);
      }
    });
  })
};
