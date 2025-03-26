/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/behavior/form
//   TYPE : 
// ==================================================================== *

//---------- DEPRECATED ------------------------
// ------------------------------------------
class __bhv_form extends Marionette.Behavior {
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  constructor(...args) {
    this.sync = this.sync.bind(this);
    this.toArgs = this.toArgs.bind(this);
    this.isPersistent = this.isPersistent.bind(this);
    this.onLocalPost = this.onLocalPost.bind(this);
    this.onReject = this.onReject.bind(this);
    super(...args);
  }

  onDomRefresh(){
    if (this.view.get(_a.draggable) === _a.yes) {
      return this.$el.draggable({
        scroll: true,
        appendTo: _a.body,
        containment: _a.window
      });
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _checkIdentical
//
// @param [Object] val
//
// @return [Object] 
//
// ===========================================================
  _checkIdentical(val){
    if ((this.get('identical') == null)) {
      return;
    }
    const list = this.get('identical').split(/[ ,;]+/);
    const x = list[0];
    return (() => {
      const result = [];
      for (var a of Array.from(list)) {
        this._searchChildren(this, _a.name, a);  //=> result in @_found
        if ((val[x] !== val[a]) && ((this._found != null ? this._found.length : undefined) > 1)) {
          result.push((() => {
            const result1 = [];
            for (a of Array.from(this._found)) {
              this._errors.push(a);
              try {
                result1.push(a._reject("Must be identical"));
              } catch (error) {}
            }
            return result1;
          })());
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _submit
//
// @param [Object] button
//
// @return [Object] 
//
// ===========================================================
  _submit(button){
    let method, val;
    this.triggerMethod(_e.spinner.start);
    this.debug(">> ACTUAL _submit", button, this.view.model.attributes);
    this._errors = [];
    this._searchData(this);
    if (_.isObject(this.get(_a.api))) {
      val = _.clone(this.get(_a.api));
      method = val.method || val.api;
      for (var k in val) {
        var v = val[k];
        if (k.match(/(^on_.+$)|(api)|(method)/)) {
          delete val[k];
        }
      }
    } else {
      val     = new Object();
      method = this.get(_a.method) || this.get(_a.api) ||  _a.local;
    }
    _.merge(val, this.get(_a.value));
    const args = {
      method,
      vars   : val
    };
    this._checkIdentical(val);
    if (this._errors.length > 0) {
      return;
    }
    this.debug("QQQA", args, val, button);
    if (args.method === _a.local) {
      this._update(args);
    } else {
      if (button.get(_a.service) === _a.call) {
        this.triggerMethod(_e.rpc.call, args);
      } else {
        this.triggerMethod(_e.rpc.post, args);
      }
    }
      //@_post(args)
    if (this.get(_a.persistence) === 'once') {
      return this.triggerMethod("force:close");
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _update
//
// @param [Object] opt
//
// ===========================================================
  _update(opt){
    const model = new Backbone.Model({
      section  : this.get(_a.section),
      name     : this.get(_a.name),
      value    : this.get(_a.value)
    });
    const signal = this.get(_a.signal) || _e.model.update;
    const handler = this._handler.client || this._handler.ui;
    this.debug(`>>MM _update signal=${signal}`, model);
    return handler.triggerMethod(signal, model);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _post
//
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
  _post(opt){
    this.debug("DEPRECATED .???!!!");
    return;
    const name    = this.get(_a.name) || _a.value;
    const section = this.get(_a.section) || name;
    const entries = this.get(_a.value);
    switch (this.get(_a.scope)) {
      case _a.section:
        _.extend(opt[section], entries);
        break;
      default:
        opt.name    = name;
        opt.value   = entries;
    }
    //@debug ">>MM posting section=#{section}, name=#{name}", entries, opt, @
    return this.triggerMethod(_e.rpc.post, opt);
  }
// ============================================
// Bind two composites
// Ugly hack ?
// ============================================

// ===========================================================
// onPartRegister
//
// @param [Object] part
// @param [Object] pn
//
// ===========================================================
  onPartRegister(part, pn) {
    this.debug(">>XX onPartRegister", part, pn);
    this._parts = this._parts || {};
    this._parts.sys = this._parts.sys || {};
    return this._parts.sys[pn] = part;
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildSubmit
//
// @param [Object] child
// @param [Object] e
//
// ===========================================================
  onChildSubmit(child, e) {
    this.debug(">>XX >>MM QQQ post onChildSubmit", child.model.cid);
    return this._submit(child);
  }
// ============================================
//
// ============================================

// ===========================================================
// onSubmit
//
// @param [Object] child
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  onSubmit(child, e) {
    if ((child == null)) {
      return;
    }
    this.debug(">>XX >>MM onSubmit", child.cid, this);
    return this._submit(child);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _shouldSubmit
//
// @param [Object] trigger
//
// ===========================================================
  _shouldSubmit(trigger){
    const shortCut = trigger._currentEvent.ctrlKey || trigger._currentEvent.metaKey;
    this.debug(">>XX >>MM _shouldSubmit", shortCut, trigger, this);
    switch (trigger.get(_a.submitKey)) {
      case _a.alt:
        if (shortCut) {
          return this._submit(trigger);
        }
        break;
      case _a.enter:
        return this._submit(trigger);
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildEnter
//
// @param [Object] trigger
//
// ===========================================================
  onChildEnter(trigger) {
    return this._shouldSubmit(trigger);
  }
// ============================================
//
// ============================================

// ===========================================================
// onKeypressEnter
//
// @param [Object] trigger
//
// ===========================================================
  onKeypressEnter(trigger) {
    return this._shouldSubmit(trigger);
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildBubble
//
// @param [Object] child
// @param [Object] e
//
// ===========================================================
  onChildBubble(child, e) {
    try {
      return this.getPart('gauge').percent(child.getStrength());
    } catch (error) {}
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildUpdate
//
// @param [Object] child
//
// ===========================================================
  onChildUpdate(child) {}
    // TBD
// ============================================
//
// ============================================

// ===========================================================
// onChildReset
//
// @param [Object] child
//
// ===========================================================
  onChildReset(child) {
    return this.debug(">>XX >>MM onChildReset", child.cid, this);
  }
// ============================================
//
// ============================================

// ===========================================================
// onBuildData
//
// @param [Object] child
// @param [Object] tag
//
// @return [Object] 
//
// ===========================================================
  onBuildData(child, tag) {
    let name, value;
    if (!_.isFunction(child.getData)) {
      return;
    }
    let opt = child.getData();
    try {
      ({
        name
      } = opt);
      value = opt.value || opt.values;
    } catch (e) {
      name = child.get(_a.name);
      value = child.get(_a.value) || child.get(_a.values);
    }
    opt     = new Object();
    opt[name] = value;
    const section = this.view.model.get(_a.section) || _a.value;
    let data = this.view.model.get(section) || {};
    if (_.isObject(data)) {
      _.extend(data, opt);
    } else {
      data = opt;
    }
    delete data.on_success;
    delete data.on_error;
    return this.view.model.set(section, data);
  }
    //@debug ">>MM onBuildData section={section}", data, name, value, opt
// ============================================
//
// ============================================

// ===========================================================
// onChildFound
//
// @param [Object] child
//
// ===========================================================
  onChildFound(child) {
    if ((this._found == null)) {
      this._found = [];
    }
    return this._found.push(child);
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildError
//
// @param [Object] child
//
// ===========================================================
  onChildError(child) {
    this.triggerMethod(_e.spinner.stop);
    this.debug(">>MM onChildError", child, child.get(_a.name));
    this._errors = this._errors || [];
    return this._errors.push(child);
  }
// ========================
//
// ========================

// ===========================================================
// sync
//
// @return [Object] 
//
// ===========================================================
  sync() {
    var body = body;
    if (!(body != null ? body.children : undefined)) {
      return null;
    }
    return body.children.each(c => {
      if (_.isFunction(c._sync)) {
        return c.sync();
      }
    });
  }
// ========================
//
// ========================

// ===========================================================
// toArgs
//
// ===========================================================
  toArgs() {
    return this._searchData(this);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// isPersistent
//
// @return [Object] 
//
// ===========================================================
  isPersistent() {
    //@debug ">>====> isPersistent", @get(_a.persistence), @
    return this.get(_a.persistence);
  }
//============================
//
//===========================

// ===========================================================
// onLocalPost
//
// @param [Object] model
//
// ===========================================================
  onLocalPost(model) {
    this.debug(">>====> onLocalPost", model, this.view.model);
    return this.fireEvent(_e.model.update, model);
  }
//============================
//
//===========================

// ===========================================================
// onReject
//
// @param [Object] reason
//
// ===========================================================
  onReject(reason) {
    this.debug(">>====> onReject", reason, this.view.model);
    this.triggerMethod(_e.spinner.stop);
    return RADIO_BROADCAST.trigger(_e.error, reason);
  }
}
module.exports = __bhv_form;
