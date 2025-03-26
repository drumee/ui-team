class __bhv_renderer extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onHighlight = this.onHighlight.bind(this);
    this.onRender = this.onRender.bind(this);
    this._router = this._router.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._setFixedPosition = this._setFixedPosition.bind(this);
    this._keepFixedPosition = this._keepFixedPosition.bind(this);
    this._highlight = this._highlight.bind(this);
    this._smallScreen = this._smallScreen.bind(this);
    this._deskTop = this._deskTop.bind(this);
    this._responsive = this._responsive.bind(this);
    this._addTestTag = this._addTestTag.bind(this);
  }

  initialize(opt) {
    this._className = this.view.className;
    return this._device = Visitor.device();
  }

// ===========================================================
// onDestroy
//
// ===========================================================
  onDestroy(){
    RADIO_BROADCAST.off(_e.responsive, this._responsive);
    RADIO_BROADCAST.off(_e.route, this._highlight);
    if (this.view.model.get(_a.position) === _a.fixed) {
      return RADIO_BROADCAST.off(_e.scroll, this._keepFixedPosition);
    }
  }

// ===========================================================
// onBeforeRender
//
// ===========================================================
  onBeforeRender(){
    const m = this.view.model;
    //_dbg "testing _routersss", @, @view, m
    if ((m == null)) {
      this.view.model = new Backbone.Model();
      return;
    }
    this.view.extendFromModel([_a.template, _a.className]); // use override from model
    let act = m.get(_a.active);

    if ((act == null)) {
      m.set(_a.active, 1);
    } else {
      if (_.isString(act)) {
        act = parseInt(act);
      }
      m.set(_a.active, act);
    }
    this._rank = parseInt(m.get(_a.rank));
    if (!_.isFinite(this._rank)) {
      this._rank = 100;
    }
    return RADIO_BROADCAST.on(_e.responsive, this._responsive);
  }


// ===========================================================
// onHighlight
//
// ===========================================================
  onHighlight(){
    return this._highlight();
  }

// ===========================================================
// #  onRender
//
// ===========================================================
  onRender(){
    this.$el.addClass(this._className);
    const m = this.view.model;
    if (m.get(_a.className) != null) {
      this.$el.addClass(m.get(_a.className));
    }

    if (m.get(_a.dataset) != null) {
      const object = m.get(_a.dataset);
      for (var k in object) {
        var v = object[k];
        this.el.setAttribute(`data-${k}`, v);
      }
    }
        
    if (m.get(_a.target) != null) {
      this.el.setAttribute(_a.target, m.get(_a.target));
    }

    if (m.get(_a.href) != null) {
      const hrefcontent = m.get(_a.content);
      if ((hrefcontent != null) && hrefcontent.match(/href=/)) {
        this.el.style.cursor = _a.initial;
      } else {
        this.el.setAttribute(_a.href, m.get(_a.href));
      }
    }

    for (var i of [_a.flow, _a.justify, _a.position]) {
      if (m.get(i)) {
        this.el.setAttribute(_a.data[i], m.get(i));
      }
    }
    this._responsive();

    switch (this.view.mget(_a.extraClassName)) {
      case _a.page:
        var cn = location.hash.replace("\#\!", '');
        if (this.$el.hasClass(cn)) {
          return this.el.dataset.page = _a.on;
        }
        break;
    }
  }
    // if __BUILD__? and __BUILD__ in [TESTING, DEV]
    //   @_addTestTag()

// ===========================================================
// _router
//
// ===========================================================
  _router(){}
    // try
    //   _dbg "_highlight _router", @view, @view.model.get('sys_pn'), @view.model.get(_a.submenu), location.hash


// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    const m = this.view.model;
    if ((m.get(_a.position) === _a.fixed) && !this.view.isDesigner()) {
      const o = this.$el.offset();
      const s = Env.get(_a.scale);
      this.__x =  o.left/s;
      this.__y =  o.top/s;
      this._setFixedPosition();
      this.view.style.set({ 
        left : this.__x,
        top  : this.__y
      });
    }

    try { 
      this.view.refresh();
    } catch (error) {}
    if ((__BUILD__ === 'dev') && m.get(_a.debug)) {
      return this.el.setAttribute(_a.title, m.get(_a.debug).replace(/(src\/drumee)|(\.coffee)/g, ''));
    }
  }

// ===========================================================
// _setFixedPosition
//
// ===========================================================
  _setFixedPosition(){
    //window.onscroll = @_keepFixedPosition
    this._keepFixedPosition();
    return RADIO_BROADCAST.on(_e.scroll, this._keepFixedPosition);
  }

// ===========================================================
// _keepFixedPosition
//
// ===========================================================
  _keepFixedPosition(e){
    return this.el.style.top = this.__y + (scrollY/Env.get(_a.scale).px());
  }

// ===========================================================
// _highlight
//
// ===========================================================
  _highlight(){
    if (_.isFunction(this.view.highlight)) {
      return this.view.highlight();
    }
  }

// ===========================================================
// _smallScreen
//
// ===========================================================
  _smallScreen(){
    this._small = true;
    this.el.setAttribute(_a.data.device, _a.mobile);
    Env.set(_a.device, _a.mobile);
    return this.view.refresh();
  }

// ===========================================================
// _deskTop
//
// ===========================================================
  _deskTop(){
    //_dbg "ZEZEZE>> _deskTop"
    this._small = false;
    this.el.setAttribute(_a.data.device, _a.desktop);
    return Env.set(_a.device, _a.desktop);
  }

// ===========================================================
// _responsive
//
// @param [Object] width
//
// ===========================================================
  _responsive(width){
    //_dbg "ZEZEZE>> refresh _responsive"
    this.el.setAttribute(_a.data.device, Visitor.device());
    this.el.setAttribute(_a.data.rank, this._rank);
    if (this._device !== Visitor.device()) {
      this.view.refresh();
      return this._device = Visitor.device();
    }
  }

// ===========================================================
// _addTestTag
//
// @param [Object] width
//
// ===========================================================
  _addTestTag(){
    const k = this.view.model.get(_a.kind);
    let {
      parent
    } = this.view; 
    let p = this.view._index || 0;
    while (parent) {
      if (parent._index != null) {
        p = `${parent._index}_${p}`;
      }
      ({
        parent
      } = parent);
    }
    this.view.$el.addClass(`${k}_${p}`);
    return this.view.el.dataset.test = __BUILD__ + `_${k}_${p}`;
  }
}
module.exports = __bhv_renderer;
// --------------------------------------------------------------------------------
// ----------------------------- TEMPORARILY DISABLED -----------------------------
// ------------------------------vvvvvvvvvvvvvvvvvvvv------------------------------
//# ==================== *
//#
//# ==================== *

// ===========================================================
// #  _dontApply
//
// @return [Object]
//
// ===========================================================
//  _dontApply:()=>
//    if @view.model.get('eval_code') is _a.no
//      return yes
//
//    if @getOption('eval_code') is _a.no
//      return yes
//
//    if @getOption('eval_code') is _a.yes
//      return no
//
//    #@debug "_dontApply", @view, @
//    #ui = @view._handler?.ui
//    #if ui?.get('eval_code') is _a.no
//    #  return yes
//
//    return no
//
//# ==================== *
//#
//# ==================== *

// ===========================================================
// #  _evalCode
//
// @param [Object] k
// @param [Object] str
//
// @return [Object]
//
// ===========================================================
//  _evalCode:(k, str)=>
//    try
//      blocks= str.split _blockStop
//    catch e
//      return null
//    codes = []
//    for b in blocks
//      for p in b.split _blockStart
//        p = p.trim()
//        if not _.isEmpty(p)
//          codes.push p
//
//    #@debug "codes", str, codes
//    txt = str
//    for text in codes
//      try
//        code = gateway._parts.sys.hidden.$el.html(text).text()
//        value = eval code
//        txt = txt.replace(code, value)
//    if txt?
//      txt = txt.replace(/(<code>)|(<\/code>)/g, _K.char.empty)
//      #@debug ">>_evalCode #{k} =>", txt
//      return txt
//    return null
//
//# ==================== *
//#
//# ==================== *

// ===========================================================
// #  _applyCode
//
// @param [Object] k
// @param [Object] str
// @param [Object] section
//
// @return [Object]
//
// ===========================================================
//  _applyCode:(k, str, section)=>
//
//    res = Utils.evalCode(str)
//    #@debug ">>ACTUAL CODE #{k} : #{str} =>", res, @view
//
//    if section?
//      v = @view.model.get section
//      v[k] = res
//    else
//      @view.model.set k, res
//
// ------------------------------^^^^^^^^^^^^^^^^^^^^------------------------------
// ----------------------------- TEMPORARILY DISABLED -----------------------------
// --------------------------------------------------------------------------------
// --------------------------------------------------------------------------------
// ----------------------------- TEMPORARILY DISABLED -----------------------------
// ------------------------------vvvvvvvvvvvvvvvvvvvv------------------------------
//    # Dot not eval for designer mode : because serializer
//    # will take the value instead of expression
//
//    if @_dontApply()
//      if not _.isEmpty @view.model.get(_a.styleOpt)
//        for k,v of @view.model.get(_a.styleOpt)
//          try
//            #val = @_evalCode(k, v)
//            val = Utils.evalCode(v)
//            if v.match(_blockTag) and val?
//              @$el.css k, val
//      return
//
//    for k,v of @view.model.toJSON()
//      #_dbg "AQQQ22", k,v, @view.model.get(_a.href), @view.model.get('sys_pn')
//      if _.isString(v) and v.match(_blockTag)
//        @_applyCode(k, v)
//      else if _.isObject v
//        for q,w of v
//          if _.isString(w) and w.match(_blockTag)
//            @_applyCode(q, w, k)
// ------------------------------^^^^^^^^^^^^^^^^^^^^------------------------------
// ----------------------------- TEMPORARILY DISABLED -----------------------------
// --------------------------------------------------------------------------------
