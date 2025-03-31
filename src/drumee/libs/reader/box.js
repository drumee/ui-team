const { isNumeric } = require("core/utils")
const _parent_ready = "parent:ready";
const _rendered = "rendered";
const { postService, fetchService } = require("core/socket/service")
const validChild = function (e) { return e && e.kind };


class __drumee_box extends Marionette.CollectionView {
  static initClass() {
    this.prototype.nativeClassName = 'drumee-box';
    this.prototype.emptyView = LetcBlank;
    this.prototype.childViewTriggers = {
      'item:clicked': 'child:bubble',
      'bubble': 'child:bubble',
      'destroy': 'child:destroy'
    };
  }

  /**
   * 
   * @param  {...any} args 
   */
  constructor(...args) {
    super(...args);
    this.fetchService = fetchService.bind(this);
    this.postService = postService.bind(this);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  initialize(opt) {
    super.initialize(opt);
    if (this.mget('sortWithCollection')) {
      this.sortWithCollection = this.mget('sortWithCollection');
    }
    this.collection = this.collection || new Backbone.Collection();
    this.escapeContextmenu = this.mget('escapeContextmenu') || false;
  }


  /**
  * 
  * @param {*} c
  * @returns 
  */
  onRenderCollection(c) {
    this.trigger(_rendered, this);
    this.fireEvent(_parent_ready, this);
  }

  /**
   * 
   */
  onServerComplain(xhr) {
    this.warn("[58] LOAD_ERROR", xhr);
    const err = xhr.error || xhr.responseJSON?.message || xhr.responseJSON?.error || xhr.responseText;
    switch (xhr.status) {
      case 400:
        if (this.say) {
          this.say(err);
        } else {
          Butler.say(err);
        }
        break
    }
  }


  /**
  * 
  * @param {*} c
  * @returns 
  */
  onBeforeAddKid(child) {
    if (!this.mget(_a.cloneAttributes)) {
      return;
    }
    const attr = this.mget(_a.cloneAttributes);
    if (_.isArray(attr)) {
      return Array.from(attr).map((a) =>
        (() => {
          const result = [];
          for (let k in a) {
            const v = a[k];
            result.push(child.model.set(v, this.mget(k)));
          }
          return result;
        })());
    } else {
      return (() => {
        const result1 = [];
        for (let k in attr) {
          const v = attr[k];
          result1.push(child.model.set(v, this.mget(k)));
        }
        return result1;
      })();
    }
  }

  /**
   * getData to get the values from the form data 
   * @params {string} key - key to identify the form element
   * @todo Need to verify _a.vars is removed in rname as default
   * @returns 
   */
  getData(key) {
    if (key == null) { key = _a.name; }
    let responcedata = {};
    const rname = this.mget(key); //|| _a.vars 
    if (rname) {
      responcedata[rname] = this.mget(_a.value);
    }
    if (this.mget(_a.formItem) && this.mget(_a.state)) {
      responcedata['name'] = this.mget(_a.formItem);
      responcedata['value'] = this.mget(_a.value) || this.mget(_a.state);
      responcedata[this.mget(_a.formItem)] = this.mget(_a.value) || this.mget(_a.state);
    }

    if (this.isEmpty()) {
      this.mset(responcedata);
      return responcedata;
    }
    const me = this;

    var walk = function (c) {
      let data = {};
      const name = c.mget(key);

      // walk in to array of data mode eg: array of phone numbers  
      if (name && (c.mget('dataType') === _a.array)) {
        data[name] = [];
        c.children.each(k => {
          const d = walk(k);
          if (d && !_.isEmpty(d)) {
            data[name].push(d);
          }
        });
        return data;
      }

      // walk in to Object mode to create a object in the data  like name : {firstname: name, lastname: Lastname }  
      if (name && (c.mget('dataType') === _a.object)) {
        data[name] = {};
        c.children.each(k => {
          let d = walk(k);
          if (d && !_.isEmpty(d)) {
            data[name] = { ...data[name], ...d }
          }
        });
        return data;
      }

      // To loop other children
      if (c.children) {
        c.children.each(k => {
          let d = walk(k);
          if (d && !_.isEmpty(d))
            if (_.isEmpty(data)) {
              data = d
            } else {
              data = { ...data, ...d }
            }
        });
      }

      if (name != null) {
        let cdata = c.getData();
        if (cdata && (cdata.name != null)) {
          let val;
          if (cdata.value != null) {
            val = cdata.value;
          } else {
            const section = c.mget(_a.section);
            if (c.mget(section) != null) {
              val = c.mget(section);
            } else {
              val = c.mget(_a.vars) || c.mget(_a.values);
            }
          }
          if (c.mget(_a.reference) === _a.state) {
            val = c.mget(_a.state);
          }
          data[name] = val;
          return data;
        }
      }
      return data;
    };

    if (rname && ((this.mget('dataType') === _a.array) || (this.mget('dataType') === _a.object))) {
      return walk(this);
    }

    if (this.children) {
      this.children.each(k => {
        let d = walk(k);
        if (d && !_.isEmpty(d))
          if (_.isEmpty(responcedata))
            responcedata = d
          else
            responcedata = { ...responcedata, ...d }
      });
    }
    return responcedata;
  }

  /**
   * validateData to get the values from the form data 
   * @returns 
   */
  validateData() {
    const key = _a.formItem;
    const validator = {};
    this.formStatus = _a.validate;
    this.formError = {};
    const me = this;
    var walk = c => {
      let data = {};
      const name = c.mget(key);
      if (name) {
        const cdata = c.getData(_a.formItem) || {};
        c.formItemStatus = _a.ok;
        c.errorList = [];
        if (c.mget('validators')) {
          for (let v of Array.from(c.mget('validators'))) {
            if (!v.comply(cdata.value)) {
              this.formStatus = _a.error;
              c.formItemStatus = _a.error;
              c.errorList.push({ reason: v.reason });
            }
          }
          if (c.formItemStatus === _a.error) {
            c.reason = c.errorList[0] != null ? c.errorList[0].reason : undefined;
            if (c.showError) {
              c.showError(c.errorList[0] != null ? c.errorList[0].reason : undefined);
            }
          } else {
            c.reason = '';
            if (c.hideError) {
              c.hideError();
            }
          }
        }
      }

      // walk in to array of data mode eg: array of phone numbers  
      if (name && (c.mget('dataType') === _a.array)) {
        data[name] = [];
        c.children.each(k => {
          let d = walk(k);
          if (d && !_.isEmpty(d)) {
            data[name].push(d);
          }
        });
        return data;
      }

      // walk in to Object mode to create a object in the data  like name : {firstname: name, lastname: Lastname }  
      if (name && c.mget('dataType') === _a.object) {
        data[name] = {}
        c.children.each(k => {
          let d = walk(k);
          if (d && !_.isEmpty(d))
            data[name] = { ...data[name], ...d }
        })
        return data;
      }

      //To loop other children
      if (c.children) {
        c.children.each(k => {
          let d = walk(k);
          if (d && !_.isEmpty(d))
            if (_.isEmpty(data))
              data = d
            else
              data = { ...data, ...d }
        })
      }

      if (name) {
        const rtnData = {
          // value     : cdata.value 
          state: c.formItemStatus,
          errorList: c.errorList
        };
        // _dbg "key" , name, cdata, rtnData
        data[name] = rtnData;
      }
      return data;
    };


    let data = walk(this);
    this.formError = data;
    this.debug("Total Result ", data);
    if (this.formStatus === _a.validate) {
      this.formStatus = _a.success;
    }
    if (this.formStatus === _a.success) {
      return true;
    }

    return false;
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  feed(c) {
    if(!c){
      return this.children.last();
    }
    if (_.isArray(c)) {
      this.collection.set(c.filter(validChild));
    } else if (c.kind) {
      this.collection.set([c]);
    } else if (_.isFunction(c)) {
      try {
        let kids;
        kids = c(this);
        this.collection.set(kids.filter(validChild));
      } catch (e) {
        this.warn("Failed to render", e);
      }
    }
    return this.children.last();
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  append(c, index) {
    let skl;
    if (_.isArray(c)) {
      skl = c;
    } else if (c.kind) {
      skl = [c];
    } else if (_.isFunction(c)) {
      try {
        skl = c(this);
      } catch (e) {
        this.warn("Failed to render", e);
      }
    }

    if (index != null) {
      const col = this.collection.toJSON();
      col.splice(index, 0, skl);
      this.collection.cleanSet(col);
      return this.children.findByIndex(index);
    } else {
      this.collection.add(skl);
    }
    return this.children.last();
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  prepend(c) {
    let skl;
    if (_.isFunction(c)) {
      try {
        skl = c(this);
      } catch (e) {
        this.warn(e);
      }
      return;
    } else {
      skl = c;
    }
    this.collection.unshift(skl);
    return this.children.first();
  }


  /**
   * 
   */
  clear() {
    this.collection.reset();
  }

  /**
   * 
   * @param  {...any} a 
   */
  softClear(...a) {
    for (let c of Array.from(this.children.toArray())) {
      c.softDestroy(a[0], a[1]);
    }
  }

  /**
   * 
   * @returns 
   */
  reset() {
    return this.collection.reset();
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  reload(letc) {
    letc = letc || this.toLETC().kids;
    return this.collection.set(letc);
  }


  /**
  * 
  * @param {*} c
  * @returns 
  */
  replace(old, letc, move) {
    let child, m;
    if (move == null) { move = 0; }
    if (isNumeric(old)) {
      child = this.children.findByIndex(~~old);
    } else if (old.model) {
      child = this.children.findByModel(old.model);
    } else {
      child = this.children.findByModel(old);
    }
    if (child != null ? child.model : undefined) {
      const index = child.getIndex();
      this.collection.remove(child.model);
      if (_.isObject(letc)) {
        m = this.collection.add(letc, { at: index });
      } else if (_.isFunction(letc.toLETC)) {
        const o = letc.toLETC();
        if (move) {
          letc.cut();
        }
        m = this.collection.add(o, { at: index });
      }
    }
    return this.children.findByModel(m);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  carry(cvClass, opt, index) {
    if (index == null) { index = 0; }
    if (_.isEmpty(opt)) {  // Should not be empty, or it will be rejected by the parser
      opt =
        { kind: KIND.box };
    }
    const model = new Backbone.Model(opt);
    this.collection.reset();
    return this.addChild(model, cvClass, index);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  // openBox: (name, content, state=_a.open) =>
  //   @triggerMethod 'open:box', name, content, state

  /**
  * 
  * @param {*} c
  * @returns 
  */
  feedPart(name, content) {
    return this.ensurePart(name).then((p) => {
      p.feed(content);
    });
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  clearPart(name) {
    try {
      return this.getPart(name).clear();
    } catch (error) { }
  }


  /**
   * 
   * @param {*} name 
   * @returns 
   */
  findPart(name) {
    let found = null;
    var walk = function (c) {
      if (c.mget(_a.sys_pn) === name) {
        found = c;
        return;
      }

      if (!c.children || c.isEmpty()) {
        return;
      }

      return c.children.each(k => walk(k));
    };
    this.children.each(z => walk(z));
    return found;
  }


  /**
  * 
  * @param {*} c
  * @returns 
  */
  getItemByKind(kind) {
    const found = null;
    var walk = function (c) {
      if (c.mget(_a.kind) === kind) {
        return c;
      }
      if (!c.children || c.isEmpty()) {
        return;
      }
      return c.children.each(k => walk(k));
    };
    this.children.each(z => walk(z));

    return found;
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  getItemsByAttr(attr, val) {
    const found = [];
    var walk = function (c) {
      if (c.mget(attr) === val) {
        found.push(c);
      }
      if (!c.children || c.isEmpty()) {
        return;
      }
      return c.children.each(k => walk(k));
    };
    this.children.each(z => walk(z));

    return found;
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  getItemsByKind(kind) {
    return this.getItemsByAttr(_a.kind, kind);
  }



  /** To be overloaded for specific usage */

  /**
  * pass upstream the event alongside the original trigger
  * @param {*} c
  * @returns 
  */
  onChildCallback(child, origin) {
    return this.trigger(_e.callback, origin);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildNewline(child, origin) {
    return this.trigger(_e.newline, origin);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildUpdate(child, origin) {
    return this.trigger(_e.update, origin);
  }


  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildClose(child) {
    return this.trigger(_e.close, child);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} origin 
   * @returns 
   */
  onChildEscape(child, origin) {
    return this.trigger(_e.escape, origin);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} origin 
   * @returns 
   */
  onChildCancel(child, origin) {
    return this.trigger(_e.cancel, origin);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} origin 
   * @returns 
   */
  onChildEnter(child, origin) {
    return this.trigger(_e.enter, origin);
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  onChildSubmit(child) {
    return this.trigger(_e.submit, child);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildBubble(origin) {
    //@debug "HHHHHHHHH", @, origin
    const b = this.mget(_a.bubble);
    if (_.isArray(b)) {
      return Array.from(b).map((sig) =>
        this.trigger(sig, origin));
    } else if (_.isString(b)) {
      return this.trigger(b, origin);
    } else {
      return this.trigger(_a.bubble, origin);
    }
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildReady(child, origin) {
    return this.trigger(_e.ready, origin);
  }

  /**
  * 
  * @param {*} c
  * @returns 
  */
  onChildError(child) {
    return this.trigger(_e.error, child);
  }
}
__drumee_box.initClass();

module.exports = __drumee_box;
