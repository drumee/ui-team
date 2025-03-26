class __exported__ extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onLayoutInclude = this.onLayoutInclude.bind(this);
    this.onUserInclude = this.onUserInclude.bind(this);
    this.onInclude = this.onInclude.bind(this);
    this.onUserTest = this.onUserTest.bind(this);
    this.onPipeSucceeded = this.onPipeSucceeded.bind(this);
    this._includeLayout = this._includeLayout.bind(this);
    this.onPipeFailed = this.onPipeFailed.bind(this);
  }

  _include(args) {
    let hash, owner;
    _dbg(">>aaaa _include", this.view.parent);
    if (this.view.parent === _a.horizontal) {
      this.view.flow = _a.horizontal;
      //@$el.addClass _C.flowH
    } else {
      this.view.flow = _a.vertical;
    }
      //@$el.addClass _C.flowV
    this.source = args || this.view.get(_a.include);
    if ((this.source == null)) {
      this.warn(`Source: ${WARNING.arguments.required}`);
      return;
    }
    try {
      const a = this.source.replace(/http.*:\/\//, _K.string.empty).split('#');
      owner = a[0].replace(location.pathname, _K.string.empty);
      hash  = a[1].trim();
    } catch (err) {
      owner = this.source.owner || this.source[_a.ownerId];
      hash  = this.source.hashtag;
    }
    this.socket = new WPP.Pipe({
      method   : _RPC.layout.get,
      owner,
      hashtag  : hash,
      screen : Visitor.device()
    });
    this.socket.addListener(this);
    return this.socket.read();
  }
// ==================== *
//
// ==================== *

// ===========================================================
// onLayoutInclude
//
// @param [Object] source
// @param [Object] view
//
// ===========================================================
  onLayoutInclude(source, view){
    // NEW BUTTONS
//      if view? and view.getOption(_a.source)?
//        args = view.getOption(_a.source)
//        @view.model.set _a.userAttributes, view.model.get(_a.userAttributes)
    const args = source || view.getOption(_a.source);
    return this._include(args);
  }
// ========================
// STILL USED ???
// ========================

// ===========================================================
// onUserInclude
//
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
  onUserInclude(opt) {
    let include;
    if (((opt != null ? opt.args : undefined) == null)) {
      this.warn(WARNING.arguments.required, opt);
      return;
    }
    if (_.isArray(opt.args)) {
      include = opt.args[0];
    } else if (_.isString(opt.args)) {
      include = opt.args;
    }
    return this._include(include);
  }
// ========================
//
// ========================

// ===========================================================
// onInclude
//
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
  onInclude(opt) {
    let include;
    if (((opt != null ? opt.args : undefined) == null)) {
      this.warn(WARNING.arguments.required, opt);
      return;
    }
    if (_.isArray(opt.args)) {
      include = opt.args[0];
    } else if (_.isString(opt.args)) {
      include = opt.args;
    }
    return this._include(include);
  }
// ========================
//
// ========================

// ===========================================================
// onUserTest
//
// @param [Object] args
//
// ===========================================================
  onUserTest(args) {
    return _dbg(">>aaaa onUsertest", args);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onPipeSucceeded
//
// @param [Object] json
//
// @return [Object] 
//
// ===========================================================
  onPipeSucceeded(json){
    if (((json.data != null ? json.data.letc : undefined) == null)) {
      this.warn(WARNING.response.invalid, json);
      return;
    }
    const letc = JSON.parse(json.data.letc);
    switch (letc.flow) {
      case _a.page: case _a.root:
        this.view.collection.set(letc);
        RADIO_BROADCAST.trigger(_e.document.click);
        return letc.styleOpt = this.view.getOption(_a.styleOpt);
      case _a.slider:
        letc.kind = KIND.slider;
        letc.styleOpt = this.view.getOption(_a.styleOpt);
        letc.styleOpt.width  = _a.inherit;
        letc.styleOpt.height = _a.inherit;
        if (this.view.getOption(_a.userAttributes) != null) {
          letc.userAttributes = this.view.getOption(_a.userAttributes);
        }
        return this.view.collection.set(letc);
      case _a.slideshow:
        letc.kind = KIND.slideshow;
        letc.styleOpt = this.view.getOption(_a.styleOpt);
        if (this.view.getOption(_a.userAttributes) != null) {
          letc.userAttributes = this.view.getOption(_a.userAttributes);
        }
        return this.view.collection.set(letc);
      default:
        return this.warn(WARNING.arguments.bad_value, json);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _includeLayout
//
// @param [Object] letc
//
// ===========================================================
  _includeLayout(letc) {
    this.view.collection.set(letc.kids);
    return RADIO_BROADCAST.trigger(_e.document.click);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onPipeFailed
//
// @param [Object] json
//
// ===========================================================
  onPipeFailed(json){
    _dbg("cc>> SLIDER I slideshow ", json);
    let content = `${LOCALE.ERROR_LAYOUT_FETCH} <span>${this.source}</span>`;
    if (__guard__(json != null ? json.responseJSON : undefined, x => x.content) != null) {
      content = `${content}<br><hr>${json.responseJSON.content}`;
    }
    const letc = {
      kind : KIND.note,
      className : 'error',
      cmArgs: {
        content
      }
    };
    return this.view.collection.set([letc]);
  }
}
module.exports = __exported__;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
