class __bhv_trigger extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this._mk_list = this._mk_list.bind(this);
    this._select = this._select.bind(this);
    this._toggle = this._toggle.bind(this);
    this._reset = this._reset.bind(this);
    this._stretch = this._stretch.bind(this);
    this._open = this._open.bind(this);
    this._close = this._close.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onHide = this.onHide.bind(this);
    this.getData = this.getData.bind(this);
  }

  onBeforeRender() {
    return this.model = new Backbone.Model();
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onPartReady
//
// @param [Object] child
// @param [Object] pn
// @param [Object] section
//
// @return [Object] 
//
// ===========================================================
  onPartReady(child, pn, section) {
    //_dbg ">>22 onPartReady", child, @view, pn
    let current;
    if (section !== _a.sys) {
      return;
    }
    this[`$${pn}$`] = child;
    const signal = this.view.get(_a.mode) || _e.select;
    this.debug(`>>22 onPartReady signal=${signal}`, child, this.view, pn);
    switch (pn) {
      case _a.list:
        this._mk_list(child);
        break;
      case _a.label:
        for (var c of Array.from(child.children.toArray())) {
          if (c.model.get(_a.role) === _a.current) {
            current = c;
          }
        }
        //@debug "HGFD", signal, current, @view, @$label$
        if ((current != null) && (current.get(_a.signal) === _e.select)) {
          try {
            let content;
            if (!_.isEmpty(this.view.model.get(_a.content))) {
              content =  this.view.model.get(_a.content);
            } else {
              content =  this.view.model.get(_a.value);
            }
            current.model.set(_a.content, content);
            current.render();
          } catch (error) {}
        }
        break;
    }
    return child.onChildBubble = this.onChildBubble;
  }
// ============================================
//
// ============================================

// ===========================================================
// onSelect
//
// @param [Object] child
//
// ===========================================================
  onSelect(child) {
    this._select(child);
    return this._toggle();
  }
// ============================================
//
// ============================================

// ===========================================================
// onToggle
//
// @param [Object] child
//
// ===========================================================
  onToggle(child) {
    return this._toggle();
  }
// ========================
//
// ========================

// ===========================================================
// _mk_list
//
// @param [Object] child
//
// ===========================================================
  _mk_list(child){
    this.listPart = child;
    switch (this.view.get(_a.opening)) {
      case _a.popup:
        this._list = _.clone(child.model.toJSON()); // No need to keep the view, but only its layout
        return child.destroy();
      default:
        child.on(_e.show, ()=> {
          this._height = child.$el.height();
          this._width = child.$el.innerWidth();
          if (this.view.get(_a.state)) {
            return child.$el.attr(_a.data.state, _a.open);
          } else {
            return child.$el.attr(_a.data.state, _a.closed);
          }
        });

// ===========================================================
// child._childCreated
//
// @param [Object] k
//
// ===========================================================
        return child._childCreated = function(k){
          _dbg(">>AA_childCreated", this);
          return this.$el.attr(_a.data.state, _a.open);
        };
    }
  }
// ========================
//
// ========================

// ===========================================================
// _select
//
// @param [Object] child
//
// @return [Object] 
//
// ===========================================================
  _select(child){
    let current, e;
    try {
      if (child.parent.get('sys_pn') !== _a.list) {
        return;
      }
    } catch (error) {
      e = error;
      return;
    }
    for (var c of Array.from(this.$label$.children.toArray())) {
      if (c.model.get(_a.role) === _a.current) {
        current = c;
      }
    }
    _dbg(">>22 _select ", current, this);
    if ((current == null)) {
      this.warn(WARNING.attribute.required.format(_a.role));
      return;
    }
    if (_.isFunction(this.view._select)) {
      this.view._select(child);
    }
    try {
      const content = child.get(_a.content);
      const value = child.get(_a.value);
      if ((current.ui != null ? current.ui.field : undefined) != null) {
        current.model.set(_a.value, content);
      } else {
        current.model.set(_a.value, value);
        current.model.set(_a.content, content);
      }
      return current.render();
    } catch (error1) {
      e = error1;
      return _c.error(e);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _toggle
//
// @return [Object] 
//
// ===========================================================
  _toggle(){
    if (this.model.get(_a.state)) {
      this._close();
      return;
    }
    return this._open();
  }
// ========================
//
// ========================

// ===========================================================
// _reset
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _reset(src){
    try {
      if (src._handler.ui.cid === this.view.cid) {
        //_dbg "_reset nop", src, @
        // nop : already open by child bubble
        return;
      }
      if (src.cid === this.view.cid) {
        //_dbg "_reset _toggle", src, @
        this._toggle();
        return;
      }
    } catch (error) {}
    //_dbg "_reset _close", src, @
    return this._close();
  }
//# ========================
//#
//# ========================

// ===========================================================
// #  _pulldown
//
// @return [Object] 
//
// ===========================================================
//  _pulldown:()=>
//    if @view.get(_a.slide) is _a.vertical
//      ph = @$label$.$el.outerHeight()
//      y = @$label$.$el.outerHeight()
//      width = @$label$.$el.width() #@$label$.$el.width() - parseInt @listPart$.$el.css(_a.margin.left)
//      #_dbg ">>A _pulldown", @$label$.$el.innerWidth(), @listPart$.$el.width(), @$el.width()
//      anim =
//        start:
//          y    : 0
//          #ease : Back.easeOut
//          alpha: 0
//          height : _a.auto
//          width  : width #@$label$.$el.width() #@listPart$.$el.width()
//          position : _a.absolute
//        to   :
//          top    : "100%"
//          #ease : Back.easeOut
//          alpha: 1
//
//    else
//      width = @model.get(_a.width) #@listPart$.$el.width()
//      ph = @$el.width()
//      anim =
//        start:
//          x    : -width
//          ease : Back.easeOut
//          alpha: 1
//        to   :
//          x    : 0
//          ease : Back.easeOut
//          alpha: 0
//    _dbg "_pulldown", anim
//    return anim
// ========================
//
// ========================

// ===========================================================
// _stretch
//
// @return [Object] 
//
// ===========================================================
  _stretch(){
    let anim, height;
    if (this.view.get(_a.slide) === _a.vertical) {
      height = this._height;
      const ph = this.$label$.$el.outerHeight();
      anim = {
        start: {
          ease : Back.easeOut,
          alpha: 0,
          height : 0,
          width  : this.listPart.get(_a.width)
        },
        to   : {
          height, //@listPart$.get(_a.height)
          ease : Back.easeOut,
          alpha: 1,
          onComplete: this._afterOpen
        }
      };
    } else {
      const width = this._width;
      anim = {
        start: {
          height, // @listPart$.get(_a.height)
          ease : Back.easeOut,
          alpha: 1
        },
        to   : {
          height    : 0,
          ease : Back.easeOut,
          alpha: 0
        }
      };
    }
    _dbg("_stretch", anim);
    return anim;
  }
// ========================
//
// ========================

// ===========================================================
// _open
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _open(src){
    _dbg(">>AA>>24 _open", this.model.get(_a.state));
    if (this.model.get(_a.state)) {
      return;
    }
    _dbg(">>AA>>24 _open", this._list, src);
    this.model.set(_a.state, 1);
    switch (this.view.get(_a.opening)) {
      case _a.popup:
        return RADIO_BROADCAST.trigger(_e.popup, this._list, this);
      default:
        return this.listPart.$el.attr(_a.data.state, _a.open);
    }
  }
// ========================
//
// ========================

// ===========================================================
// _close
//
// @return [Object] 
//
// ===========================================================
  _close(){
    _dbg(">>AA>>24 _close", this.model.get(_a.state));
    if (!this.model.get(_a.state)) {
      return;
    }
    this.model.set(_a.state, 0);
    switch (this.view.get(_a.opening)) {
      case _a.popup:
        return RADIO_BROADCAST.trigger(_e.popup);
      default:
        //@listPart.clear()
        return this.listPart.$el.attr(_a.data.state, _a.closed);
    }
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onOpen
//
// @param [Object] content
//
// ===========================================================
  onOpen(content) {
    return this._open(content);
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onClose
//
// ===========================================================
  onClose() {
    return this._close();
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onHide
//
// ===========================================================
  onHide() {
    return this._close();
  }
// ========================
//
// ========================

// ===========================================================
// getData
//
// @return [Object] 
//
// ===========================================================
  getData(){
    return this._export;
  }
// ============================================
//
// ============================================

// ===========================================================
// onChildCallback
//
// @param [Object] child
// @param [Object] args
//
// ===========================================================
  onChildCallback(child, args) {
    if (_.isFunction(child.getData)) {
      this._export = child.getData();
    }
    return this.trigger(_e.callback);
  }
}
    //_dbg ">>MM _a.nested onChildCallback", child, args
module.exports = __bhv_trigger;
