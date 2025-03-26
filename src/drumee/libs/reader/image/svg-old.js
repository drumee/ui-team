class image_svg extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onRender = this.onRender.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.svg;
    this.prototype.className = "svg full";
    this.prototype.tagName  = PROXY_CORE.tagName;
    behaviorSet({
      bhv_renderer : _K.char.empty});
    this.prototype.ui = {
      svg : 'svg',
      group : 'g'
    };
  }
// ==================================================================== *
// initialize
// ==================================================================== *

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    if ((this.model == null)) {
      this.model = new _model();
    }
    if ((this.model.get(_a.code) == null)) {
      this.model.set(_a.code, '<text x="50%" y="50%" fill="red">SVG</text>');
    }
    const href = this.model.get(_a.href);
    if (href != null) {
      return this.$el.attr(_a.href, href);
    }
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// onRender
//
// ===========================================================
  onRender() {
    const attr = this.model.get(_a.userAttributes);
    if (attr != null) {
      this.ui.svg.attr(attr);
    }
    return _dbg("SVG GROUP", this.ui.group);
  }
}
image_svg.initClass();
    //var width=70, height=70;
    //var node = document.getElementById("g1");
    //var bb = node.getBBox();
    //var matrix = "matrix("+width / bb.width+", 0, 0, "+height / bb.height+", 0,0)";
    //node.setAttribute("transform", matrix);
module.exports = image_svg;
