

const _default_class = "drumee-box form";
class __form extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onReject = this.onReject.bind(this);
    this.onInteractive = this.onInteractive.bind(this);
    this._interactive = this._interactive.bind(this);
  }

  static initClass() {
    this.prototype.className  = _default_class;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    this.declareHandlers();
    super.initialize(opt);
    this._callback = this.get(_a.callback);
    this._data = {};
    this._descendents = [];
    return this._failed  = {};
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh(){
    this.declareHandlers(); //s({part:@}, {recycle:yes})
    if (_.isObject(this.get(_a.skeleton))) {
      this.feed(this.get(_a.skeleton));
    }
    if (this.model.get(_a.modal) != null) {
      this._modal = this.model.get(_a.modal);
      this._placeModal();
    }
    if (this.model.get('applydefault') != null) {
      return this.triggerHandlers();
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd){
    const service = cmd.get(_a.service);
    this.source = cmd;
    switch (service) {
      case _e.submit: case _e.commit:
        this._failed = {};
        this.status = service;
        return this._submit(cmd);

      case _e.cancel: case _e.close:
        this.status = service;
        if (!this.triggerHandlers()) {
          return this.parent.collection.remove(this.model);
        }
        break;
        
      case _e.interactive:
        return this._interactive(cmd);

      case _e.update:
        return this.triggerHandlers()(cmd);

      default:
        return this._interactive(cmd);
    }
  }

  /**
   * 
   * @returns 
   */
  _buildData() {
    const data = this.getData();
    if ((this.status === _a.error) || !_.isEmpty(this._failed)) {
      const err_box = this.model.get(_a.error_box);
      this._isValid = 0;
      if (err_box != null) {
        if (_.isFunction(err_box)) {
          this.append(err_box(this, cmd));
        } else {
          this.append(err_box);
        }
      }
      return null;
    }
    this._isValid = 1;
    return data;
  }

  /**
   * 
   * @returns 
   */
  isCompliant(){
    if (_.isEmpty(this._failed)) {
      return true; 
    }
    return false; 
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _submit(cmd){
    let o;
    const data = this._buildData();
    if (this.status === _a.error) {
      return;
    }
    const api = this.model.get(_a.api);
    if (_.isString(api)) { 
      o = 
        {service : api};
      o = _.merge({}, data, {service : api });
    } else if (_.isObject(api)) {
      o = _.merge({}, data, api);
    }
    if (!_.isEmpty(o)) {
      this.postService(o);
      return;
    }
    return this.triggerHandlers();
  }

  /**
   * 
   * @param {*} trigger 
   * @returns 
   */
  _shouldSubmit(trigger){
    const shortCut = trigger._currentEvent.ctrlKey || trigger._currentEvent.metaKey;
    const evt = trigger.model.get(_e.on_enter);
    this.debug(`>>XX >>MM _shouldSubmit evt=${evt}`, shortCut, trigger, this);
    switch (evt) {
      case _e.submit:
        this.status = _e.submit;
        this._submit(trigger);
        break;
      default:
        this.status = _e.commit;
        this.triggerHandlers();
    }
    return this.debug(`>>XX >>MM _shouldSubmit status=${this.status}`);
  }



  /**
   * 
   * @returns 
   */
  _placeModal(){
    let top;
    let maxWidth = this._modal.maxWidth || 700;
    if (this.style.get(_a.maxWidth) != null) {
      maxWidth = this.style.get(_a.maxWidth);
    }
    maxWidth = Math.min(window.innerWidth, parseInt(maxWidth));
    this.$el.css(_a.width, maxWidth.px());
    const left = parseInt((window.innerWidth*.5) - (maxWidth*.5));
    if (Visitor.isMobile()) {
      top = 0;
    } else {
      top = parseInt(router.viewPortHeight*.3);
    }
    return this.$el.css({
      position : _a.absolute,
      top,
      left
    });
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    this.triggerMethod(_e.spinner.stop);
    const handler = this._handler.client || this._handler.api || this._handler.ui;

    // Prevent deadlcok
    if (handler.cid === this.cid) {
      return;
    }
    //forwarding dispatch
    if (handler != null) {
      if (_.isFunction(handler.__dispatchRest)) {
        handler.__dispatchRest(method, data, socket);
      } else if (handler.ui) {
        handler.ui.triggerMethod('form:end', method, data);
      }
      if (!this.triggerMethod(_a.close)) {
        this.destroy();
      }
      return;
    }
    return this.warn(WARNING.method.unprocessed.format(method), "FORM");
  }

// ===========================================================
// onChildEnter
//
// @param [Object] trigger
//
// ===========================================================
  onChildEnter(trigger) {
    this.debug("CALLLLLLL_shouldSubmit onChildEnter");
    return this._shouldSubmit(trigger);
  }

// ===========================================================
// onKeypressEnter
//
// @param [Object] trigger
//
// ===========================================================
  onKeypressEnter(trigger) {
    this.debug("CALLLLLLL_shouldSubmit onKeypressEnter");
    return this._shouldSubmit(trigger);
  }

// ===========================================================
// onKeypressEscape
//
// @param [Object] trigger
//
// ===========================================================
  onKeypressEscape(trigger) {
    this.debug("CALLLLLLLonKeypressEscape");
    this.status = _e.cancel;
    if (!this.triggerMethod(_a.close)) {
      return this.destroy();
    }
  }

// ===========================================================
// onChildError
//
// @param [Object] child
//
// ===========================================================
  onChildError(child) {
    this.triggerMethod(_e.spinner.stop);
    this.debug(">>MM onChildError", child, child.get(_a.name));
    // @_errors = @_errors || []
    // @_errors.push child
    this._failed[child.cid] = child;
    return this.status = _a.error;
  }


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

// ===========================================================
// onChildBubble
//
// @param [Object] child
// @param [Object] origin
//
// @return [Object] 
//
// ===========================================================
  onChildBubble(child, origin){
    this.debug(">>XX >>MM  >>SSASA ___onChildBubble", this, origin);
    if (!this.model.get(_a.inactive)) {
      return;
    }
    //@_buildData(origin)
    return this.triggerHandlers();
  }
    //if 

// ===========================================================
// onReject
//
// @param [Object] reason
//
// ===========================================================
  onReject(c) {
    this.debug(">>SSASA __onReject", c);
    return this._failed[c.cid] = c; 
  }


// ===========================================================
// onInteractive
//
// @param [Object] reason
//
// ===========================================================
  onInteractive(entry) {
    return this._interactive(entry);
  }

// ===========================================================
// _interactive
//
// @param [Object] view
//
// ===========================================================
  _interactive(cmd) {
    this.debug(`>>XX >>MM _interactive_interactive status=${cmd.status}`, cmd);
    this.status = cmd.status;
    //@triggerHandlers()
    switch (cmd.status) {
      case _e.Enter: case _e.enter:
        this._failed = {};
        this._shouldSubmit(cmd);
        break;

      case _e.Escape: case _e.escape: case _e.cancel:
        this.status = _e.cancel;
        this._failed = {};
        this.triggerHandlers();
        break;
        //@_shouldClose()

      case _a.results: case _a.bubble:
        this.triggerHandlers();
        break;
        //@_shouldClose()

      case _e.click:
        this._failed = {};
        this.status  = _e.reset;
        if (this.model.get(_a.interactive)) { this.triggerHandlers(); }
        break;

      case _e.error:
        this.status  = _e.error;
        this._failed[cmd.cid] = cmd;
        this.triggerHandlers(); 
        break;
        
      case _e.commit: case _e.submit:
        this.triggerHandlers();
        break;
        
      default:
        if (cmd.model.get(_e.bubble)) { 
          this.status = _e.bubble;
          this.triggerHandlers();
          return;
        }
        if ((cmd.model.get(_a.radio) != null) || (cmd.model.get(_a.radiotoggle) != null)) {
          this.triggerHandlers();
          return;
        }
        this.debug(`NOP  status=${cmd.status}`, cmd);
    }
    return this.debug(`>>XX >>MM 2222 _interactive_interactive status=${this.status}`, cmd);
  }
}
__form.initClass();
// ===========================================================
// #  onChildSubmit
//
// @param [Object] child
// @param [Object] e
//
// ===========================================================
//  onChildSubmit: (child, e) ->
//    @debug ">>XX >>MM QQQ post onChildSubmit", child.model.cid
//    @_submit(child)
//
//# ============================================
//#
//# ============================================

// ===========================================================
// #  onSubmit
//
// @param [Object] child
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
//  onSubmit: (child, e) ->
//    @debug ">>XX >>MM onSubmit TTTTT", child.cid, @
//    if not child?
//      return
//    @_submit(child)
module.exports = __form;
